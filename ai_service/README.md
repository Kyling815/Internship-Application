# Qwen3-Reranker AI Service

This is a standalone FastAPI service for semantic JD vs CV reranking with the local Qwen3-Reranker model. It scores whether candidate CV evidence is relevant and suitable for a job description by considering skills, projects, work evidence, education or training, and transferable evidence. It is not keyword matching.

The service is separate from the main backend so backend requests stay light while model inference can run on a local GPU PC, a laptop GPU, or a Vast.ai GPU worker. Later, the main backend can call it over HTTP through an `AI_SERVICE_URL` environment variable.

## Local Model

The model path defaults to:

```powershell
.\models\qwen3-reranker-0.6b
```

Override it when needed:

```powershell
$env:QWEN_RERANKER_MODEL_PATH = "D:\Internship-Application\models\qwen3-reranker-0.6b"
```

`models/` is local-only and must not be committed to git.

## Environment Variables

```powershell
$env:QWEN_RERANKER_DEVICE = "auto"   # auto, cuda, or cpu
$env:QWEN_SCORE_TEMPERATURE = "3.0"
$env:QWEN_MAX_TEXT_CHARS = "12000"
$env:QWEN_MAX_PAIRS = "128"
$env:QWEN_MAX_CANDIDATES = "50"
$env:QWEN_BATCH_PAIR_SIZE = "32"
$env:QWEN_BATCH_MAX_TOTAL_PAIRS = "512"
$env:AI_SERVICE_HOST = "0.0.0.0"
$env:AI_SERVICE_PORT = "8010"
$env:AI_SERVICE_API_KEY = ""
```

When `QWEN_RERANKER_DEVICE=auto`, the service uses CUDA if `torch.cuda.is_available()` is true; otherwise it uses CPU.

`AI_SERVICE_API_KEY` is optional. If it is empty, no API key is required. If it is set, all endpoints except `/health` require this header:

```text
X-AI-Service-Key: <key>
```

## Install Dependencies

Create a dedicated virtual environment if needed:

```powershell
cd D:\Internship-Application
python -m venv .venv-qwen
.\.venv-qwen\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

Install PyTorch separately with the CUDA build that matches the local machine or GPU host. The project does not pin `torch`, `torchvision`, or `torchaudio` in `requirements-qwen.txt` because the Docker image already starts from a PyTorch CUDA base image, and local GPU setups may need a different wheel index.

After PyTorch is installed, install the remaining direct AI service dependencies:

```powershell
python -m pip install -r requirements-qwen.txt
```

## Deployment / Running Modes

### Local Python

Run without an API key:

```powershell
cd D:\Internship-Application
python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8010
```

Run with an optional API key:

```powershell
cd D:\Internship-Application
$env:AI_SERVICE_API_KEY = "dev-secret"
python -m uvicorn ai_service.app:app --host 127.0.0.1 --port 8010
```

Test a protected endpoint with the key:

```powershell
curl.exe -H "X-AI-Service-Key: dev-secret" http://127.0.0.1:8010/model-info
```

`/health` remains public for deployment health checks:

```powershell
curl.exe http://127.0.0.1:8010/health
```

### Docker Compose

Copy the service env example, then edit `.\ai_service\.env` if needed:

```powershell
cd D:\Internship-Application
Copy-Item .\ai_service\.env.example .\ai_service\.env
```

Build and run only the standalone AI service:

```powershell
docker compose --env-file .\ai_service\.env -f docker-compose.ai-service.yml up --build ai-service
```

The Docker image starts from `pytorch/pytorch:2.11.0-cuda12.8-cudnn9-runtime`, so `requirements-qwen.txt` intentionally does not reinstall PyTorch during the image build. The compose file mounts `.\models` to `/app/models` read-only. Model weights are not copied into the image.

### Docker Run

Build the image:

```powershell
cd D:\Internship-Application
docker build -f Dockerfile.ai-service -t qwen-reranker-ai-service:local .
```

Run with NVIDIA GPU access and a read-only model mount:

```powershell
docker run --rm --gpus all `
  -p 8010:8010 `
  -v "${PWD}\models:/app/models:ro" `
  -e QWEN_RERANKER_MODEL_PATH=/app/models/qwen3-reranker-0.6b `
  -e QWEN_RERANKER_DEVICE=auto `
  qwen-reranker-ai-service:local
```

If Docker Compose GPU reservation syntax does not work on a target GPU host, use this `docker run --gpus all` mode after installing NVIDIA Container Toolkit.

## Test Health

```powershell
curl.exe http://127.0.0.1:8010/health
```

## Test Model Info

```powershell
curl.exe http://127.0.0.1:8010/model-info
```

## Test Rerank

Use the included three-level rerank example:

```powershell
curl.exe -X POST http://127.0.0.1:8010/rerank `
  -H "Content-Type: application/json" `
  --data-binary "@ai_service/examples/rerank_3_level_test.json"
```

Use the keyword-stuffing smoke test:

```powershell
curl.exe -X POST http://127.0.0.1:8010/rerank `
  -H "Content-Type: application/json" `
  --data-binary "@ai_service/examples/rerank_keyword_stuffing_test.json"
```

## Test Group Score

Use the excellent backend CV group-score example:

```powershell
curl.exe -X POST http://127.0.0.1:8010/cv-job/group-score `
  -H "Content-Type: application/json" `
  --data-binary "@ai_service/examples/group_score_excellent_test.json"
```

Use the unrelated marketing/business CV group-score example:

```powershell
curl.exe -X POST http://127.0.0.1:8010/cv-job/group-score `
  -H "Content-Type: application/json" `
  --data-binary "@ai_service/examples/group_score_bad_test.json"
```

## Test Batch Group Score

`POST /cv-job/batch-group-score` accepts one job description and multiple candidates. Each candidate is scored the same way as `/cv-job/group-score`: one overall JD vs full CV pair plus one pair per CV group. The endpoint returns candidates ranked by final score, then overall raw score, then candidate id.

This endpoint is synchronous and mainly for MVP testing and benchmarking. It keeps the backend light while Qwen inference runs in the GPU service. Batch prediction is better than calling the model one CV at a time because the service can build all pairs first and process them in bounded chunks with `QWEN_BATCH_PAIR_SIZE`.

Future backend work can queue ranking jobs and call this endpoint from a worker. That queue/background job flow is not implemented here yet. Production can later add a `ranking_jobs` table with `pending`, `submitted`, and `completed` statuses, plus caching by `job_text_hash + cv_text_hash + model_version + scoring config`.

Use the four-candidate benchmark example:

```powershell
curl.exe -X POST http://127.0.0.1:8010/cv-job/batch-group-score `
  -H "Content-Type: application/json" `
  --data-binary "@ai_service/examples/batch_group_score_test.json"
```

With `AI_SERVICE_API_KEY` configured:

```powershell
curl.exe -X POST http://127.0.0.1:8010/cv-job/batch-group-score `
  -H "Content-Type: application/json" `
  -H "X-AI-Service-Key: dev-secret" `
  --data-binary "@ai_service/examples/batch_group_score_test.json"
```

## Scoring

`raw_score` is the model logit-style score and should be preferred for ranking candidates within the same job. `sigmoid_score` is returned only for transparency and debugging because Qwen reranker sigmoid scores can saturate near 0 or 1.

`calibrated_score` applies `sigmoid(raw_score / QWEN_SCORE_TEMPERATURE)`. The default temperature is `3.0`, which moved excellent backend CV examples into the strong-fit range while unrelated CVs remained very low. `display_score` is `round(calibrated_score * 100)` clamped to `1..95` so the early MVP avoids perfect-looking scores. It is a calibrated UI score, not a probability.

The `/cv-job/group-score` endpoint scores the full CV and each CV group. The final score uses:

```text
0.70 * overall_calibrated + 0.30 * average(top 2 group calibrated scores)
```

The response includes best and weak groups, but it intentionally does not generate specific skill-gap claims yet.

## Calibration Notes

The service performs semantic reranking using Qwen3-Reranker. It does not add keyword matching, skill extraction, skill-gap explanations, heuristic evidence penalties, or transferable matching modes.

The keyword-stuffing smoke test produced a much lower score than the excellent backend CV, so no heuristic evidence penalty is added yet. The current behavior remains model-driven.

A transferable backend CV, for example Node.js, Express, and PostgreSQL experience, may score low when the JD explicitly requires Python and FastAPI. This is expected strict JD-match behavior for now. A future `matching_mode` such as strict vs transferable can be added later.

## API Contract

The main backend can later call this service through `AI_SERVICE_URL`. For HR ranking, the backend should call `POST /cv-job/batch-group-score` and send `X-AI-Service-Key` when `AI_SERVICE_API_KEY` is configured.

The backend should treat `display_score` as a calibrated UI score, not a probability. For ranking candidates within the same job, prefer `final_score` and `raw_score`/`ranking_raw_score` as returned by the service.

Do not expose this AI service directly to the frontend. The backend should own authentication, authorization, persistence, request validation, and any future queue/cache workflow.

### Backend Client Adapter

The thin synchronous adapter in `backend/app/services/ai_ranking_client.py` reads `AI_SERVICE_URL`, `AI_SERVICE_API_KEY`, and `AI_SERVICE_TIMEOUT_SECONDS`. It sends `X-AI-Service-Key` only when a key is configured and returns the AI service JSON without changing its scores or ranking output.

The adapter intentionally does not own scoring logic. HR route integration, database persistence, ranking jobs, queues, and response caching remain future phases.
