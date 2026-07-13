"""FastAPI app for the standalone Qwen3-Reranker AI service."""

from __future__ import annotations

import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Sequence

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, status

from ai_service.qwen_reranker import MODEL_NAME, MODEL_VERSION, QwenReranker
from ai_service.schemas import (
    BatchGroupScoreRequest,
    BatchGroupScoreResponse,
    CVJobGroupScoreRequest,
    CVJobGroupScoreResponse,
    HealthResponse,
    ModelInfoResponse,
    RankedCandidateResponse,
    RerankRequest,
    RerankResponse,
    ScoreResult,
)
from ai_service.scoring import (
    aggregate_group_scores,
    calibrate_raw_score,
    join_cv_groups,
    truncate_pairs,
)


load_dotenv(Path(__file__).with_name(".env"))
load_dotenv()


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


MAX_TEXT_CHARS = _env_int("QWEN_MAX_TEXT_CHARS", 12000)
MAX_PAIRS = _env_int("QWEN_MAX_PAIRS", 128)
SCORE_TEMPERATURE = _env_float("QWEN_SCORE_TEMPERATURE", 3.0)
MAX_CANDIDATES = _env_int("QWEN_MAX_CANDIDATES", 50)
BATCH_PAIR_SIZE = _env_int("QWEN_BATCH_PAIR_SIZE", 32)
BATCH_MAX_TOTAL_PAIRS = _env_int("QWEN_BATCH_MAX_TOTAL_PAIRS", 512)
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "").strip()

FIT_NOTES = [
    "This score is a semantic relevance estimate, not an automatic hiring decision.",
    "Raw scores should be preferred for ranking candidates within the same job.",
]

reranker = QwenReranker()


def require_api_key(
    x_ai_service_key: str | None = Header(default=None, alias="X-AI-Service-Key"),
) -> None:
    if not AI_SERVICE_API_KEY:
        return
    if x_ai_service_key != AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing AI service API key",
        )


@asynccontextmanager
async def lifespan(_: FastAPI):
    reranker.load()
    yield


app = FastAPI(
    title="Qwen3-Reranker AI Service",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        model_loaded=reranker.model_loaded,
        device=reranker.device,
        gpu=reranker.gpu_name,
    )


@app.get("/model-info", response_model=ModelInfoResponse)
def model_info(_: None = Depends(require_api_key)) -> ModelInfoResponse:
    return ModelInfoResponse(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        model_path=reranker.model_path,
        device=reranker.device,
        score_type="raw_logit_sigmoid_and_calibrated",
        score_temperature=SCORE_TEMPERATURE,
        max_text_chars=MAX_TEXT_CHARS,
        max_pairs=MAX_PAIRS,
        max_candidates=MAX_CANDIDATES,
        batch_pair_size=BATCH_PAIR_SIZE,
        batch_max_total_pairs=BATCH_MAX_TOTAL_PAIRS,
    )


@app.post("/rerank", response_model=RerankResponse)
def rerank(request: RerankRequest, _: None = Depends(require_api_key)) -> RerankResponse:
    _validate_rerank_request(request)

    pair_ids = [pair.pair_id.strip() for pair in request.pairs]
    model_pairs = truncate_pairs(
        [(pair.query.strip(), pair.document.strip()) for pair in request.pairs],
        MAX_TEXT_CHARS,
    )

    raw_scores, sigmoid_scores = _predict_model_pairs(model_pairs)

    results = []
    for pair_id, raw_score, sigmoid_score in zip(pair_ids, raw_scores, sigmoid_scores):
        calibrated = calibrate_raw_score(raw_score, SCORE_TEMPERATURE)
        calibrated["sigmoid_score"] = float(sigmoid_score)
        results.append({"pair_id": pair_id, **calibrated})

    return RerankResponse(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        device=reranker.device,
        results=results,
    )


@app.post("/cv-job/group-score", response_model=CVJobGroupScoreResponse)
def cv_job_group_score(
    request: CVJobGroupScoreRequest,
    _: None = Depends(require_api_key),
) -> CVJobGroupScoreResponse:
    job_text = request.job_text.strip()
    cv_groups = _clean_cv_groups(request.cv_groups)

    if not job_text:
        raise HTTPException(status_code=400, detail="job_text must not be empty")
    if not cv_groups:
        raise HTTPException(status_code=400, detail="cv_groups must contain at least one non-empty group")

    full_cv = join_cv_groups(cv_groups)
    ordered_pairs: List[tuple[str, str, str]] = [("overall", job_text, full_cv)]
    ordered_pairs.extend(
        (
            group_name,
            job_text,
            f"[CV GROUP: {group_name.upper()}]\n{group_text}",
        )
        for group_name, group_text in cv_groups.items()
    )

    if len(ordered_pairs) > MAX_PAIRS:
        raise HTTPException(status_code=400, detail=f"Too many groups. Maximum pairs per request is {MAX_PAIRS}")

    model_pairs = truncate_pairs(
        [(query, document) for _, query, document in ordered_pairs],
        MAX_TEXT_CHARS,
    )

    scores = _score_model_pairs(model_pairs)
    scored = {
        pair_id: score
        for (pair_id, _, _), score in zip(ordered_pairs, scores)
    }

    overall = scored["overall"]
    group_scores = {group_name: score for group_name, score in scored.items() if group_name != "overall"}
    aggregate = aggregate_group_scores(
        _score_to_dict(overall),
        {group_name: _score_to_dict(score) for group_name, score in group_scores.items()},
    )

    return CVJobGroupScoreResponse(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        device=reranker.device,
        overall=overall,
        group_scores=group_scores,
        final_score=aggregate["final_score"],
        label=aggregate["label"],
        best_groups=aggregate["best_groups"],
        weak_groups=aggregate["weak_groups"],
        notes=FIT_NOTES,
    )


@app.post("/cv-job/batch-group-score", response_model=BatchGroupScoreResponse)
def cv_job_batch_group_score(
    request: BatchGroupScoreRequest,
    _: None = Depends(require_api_key),
) -> BatchGroupScoreResponse:
    started_at = time.perf_counter()
    job_text = request.job_text.strip()
    if not job_text:
        raise HTTPException(status_code=400, detail="job_text must not be empty")
    if not request.candidates:
        raise HTTPException(status_code=400, detail="candidates must not be empty")
    if len(request.candidates) > MAX_CANDIDATES:
        raise HTTPException(status_code=400, detail=f"Too many candidates. Maximum is {MAX_CANDIDATES}")

    candidate_records = []
    flat_pairs: List[tuple[str, str]] = []
    for index, candidate in enumerate(request.candidates):
        candidate_id = candidate.candidate_id.strip()
        if not candidate_id:
            raise HTTPException(status_code=400, detail=f"candidates[{index}].candidate_id must not be empty")
        if not candidate.cv_groups:
            raise HTTPException(status_code=400, detail=f"candidates[{index}].cv_groups must not be empty")

        cv_groups = _clean_cv_groups(candidate.cv_groups)
        if not cv_groups:
            raise HTTPException(
                status_code=400,
                detail=f"candidates[{index}].cv_groups must contain at least one non-empty group",
            )

        candidate_pair_ids = ["overall", *cv_groups.keys()]
        candidate_records.append(
            {
                "candidate_id": candidate_id,
                "candidate_name": candidate.candidate_name,
                "pair_ids": candidate_pair_ids,
            }
        )

        full_cv = join_cv_groups(cv_groups)
        flat_pairs.append((job_text, full_cv))
        flat_pairs.extend(
            (job_text, f"[CV GROUP: {group_name.upper()}]\n{group_text}")
            for group_name, group_text in cv_groups.items()
        )

    pair_count = len(flat_pairs)
    if pair_count > BATCH_MAX_TOTAL_PAIRS:
        raise HTTPException(
            status_code=400,
            detail=f"Too many total pairs. Maximum is {BATCH_MAX_TOTAL_PAIRS}",
        )

    model_pairs = truncate_pairs(flat_pairs, MAX_TEXT_CHARS)
    scores = _score_model_pairs(model_pairs, batch_size=BATCH_PAIR_SIZE)

    ranked_candidates: List[RankedCandidateResponse] = []
    cursor = 0
    for record in candidate_records:
        pair_ids = record["pair_ids"]
        candidate_scores = scores[cursor : cursor + len(pair_ids)]
        cursor += len(pair_ids)

        scored = {
            pair_id: score
            for pair_id, score in zip(pair_ids, candidate_scores)
        }
        overall = scored["overall"]
        group_scores = {group_name: score for group_name, score in scored.items() if group_name != "overall"}
        aggregate = aggregate_group_scores(
            _score_to_dict(overall),
            {group_name: _score_to_dict(score) for group_name, score in group_scores.items()},
        )
        ranked_candidates.append(
            RankedCandidateResponse(
                rank=0,
                candidate_id=record["candidate_id"],
                candidate_name=record["candidate_name"],
                overall=overall,
                group_scores=group_scores,
                final_score=aggregate["final_score"],
                label=aggregate["label"],
                best_groups=aggregate["best_groups"],
                weak_groups=aggregate["weak_groups"],
                ranking_raw_score=float(overall.raw_score),
                notes=FIT_NOTES,
            )
        )

    ranked_candidates.sort(
        key=lambda candidate: (
            -candidate.final_score,
            -candidate.ranking_raw_score,
            candidate.candidate_id,
        )
    )
    for rank, candidate in enumerate(ranked_candidates, start=1):
        candidate.rank = rank

    elapsed_ms = round((time.perf_counter() - started_at) * 1000)
    return BatchGroupScoreResponse(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        device=reranker.device,
        candidate_count=len(candidate_records),
        pair_count=pair_count,
        batch_pair_size=BATCH_PAIR_SIZE,
        elapsed_ms=elapsed_ms,
        ranked_candidates=ranked_candidates,
    )


def _validate_rerank_request(request: RerankRequest) -> None:
    if not request.pairs:
        raise HTTPException(status_code=400, detail="pairs must not be empty")
    if len(request.pairs) > MAX_PAIRS:
        raise HTTPException(status_code=400, detail=f"Too many pairs. Maximum is {MAX_PAIRS}")

    for index, pair in enumerate(request.pairs):
        if not pair.pair_id.strip():
            raise HTTPException(status_code=400, detail=f"pairs[{index}].pair_id must not be empty")
        if not pair.query.strip():
            raise HTTPException(status_code=400, detail=f"pairs[{index}].query must not be empty")
        if not pair.document.strip():
            raise HTTPException(status_code=400, detail=f"pairs[{index}].document must not be empty")


def _score_to_dict(score: ScoreResult) -> Dict[str, float | int]:
    if hasattr(score, "model_dump"):
        return score.model_dump()
    return score.dict()


def _clean_cv_groups(cv_groups: Dict[str, str]) -> Dict[str, str]:
    return {
        group_name.strip(): group_text.strip()
        for group_name, group_text in cv_groups.items()
        if group_name and group_name.strip() and group_text and group_text.strip()
    }


def _score_model_pairs(
    model_pairs: Sequence[tuple[str, str]],
    batch_size: int | None = None,
) -> List[ScoreResult]:
    raw_scores, sigmoid_scores = _predict_model_pairs(model_pairs, batch_size=batch_size)
    return [
        _build_score_result(raw_score, sigmoid_score)
        for raw_score, sigmoid_score in zip(raw_scores, sigmoid_scores)
    ]


def _predict_model_pairs(
    model_pairs: Sequence[tuple[str, str]],
    batch_size: int | None = None,
) -> tuple[List[float], List[float]]:
    try:
        raw_scores, sigmoid_scores = reranker.predict_both(model_pairs, batch_size=batch_size)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected inference error: {exc}") from exc

    if len(raw_scores) != len(model_pairs) or len(sigmoid_scores) != len(model_pairs):
        raise HTTPException(status_code=500, detail="Unexpected inference error: score count mismatch")
    return raw_scores, sigmoid_scores


def _build_score_result(raw_score: float, sigmoid_score: float) -> ScoreResult:
    calibrated = calibrate_raw_score(raw_score, SCORE_TEMPERATURE)
    calibrated["sigmoid_score"] = float(sigmoid_score)
    return ScoreResult(**calibrated)
