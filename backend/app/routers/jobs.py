from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db import models, schemas
from app.db.database import get_db
from app.dependencies import require_role
from app.routers.platform_helpers import serialize_job_application_detail, serialize_job_posting


router = APIRouter(tags=["jobs"])


def _published_job_query(db: Session):
    return (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.status == "published")
    )


def _normalize_filter_value(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


@router.get("/jobs", response_model=list[schemas.JobPostingRead])
def list_jobs(
    keyword: str | None = Query(default=None),
    location: str | None = Query(default=None),
    work_mode: str | None = Query(default=None),
    employment_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    keyword = _normalize_filter_value(keyword)
    location = _normalize_filter_value(location)
    work_mode = _normalize_filter_value(work_mode)
    employment_type = _normalize_filter_value(employment_type)

    if work_mode and work_mode not in schemas.JOB_WORK_MODE_VALUES:
        raise HTTPException(
            status_code=400,
            detail=f"work_mode must be one of: {', '.join(schemas.JOB_WORK_MODE_VALUES)}",
        )
    if employment_type and employment_type not in schemas.JOB_EMPLOYMENT_TYPE_VALUES:
        raise HTTPException(
            status_code=400,
            detail=(
                "employment_type must be one of: "
                f"{', '.join(schemas.JOB_EMPLOYMENT_TYPE_VALUES)}"
            ),
        )

    query = _published_job_query(db).join(models.JobPosting.company)
    if keyword:
        pattern = f"%{keyword}%"
        query = query.filter(
            (models.JobPosting.title.ilike(pattern))
            | (models.JobPosting.description.ilike(pattern))
            | (models.Company.name.ilike(pattern))
        )
    if location:
        query = query.filter(models.JobPosting.location.ilike(f"%{location}%"))
    if work_mode:
        query = query.filter(models.JobPosting.work_mode == work_mode)
    if employment_type:
        query = query.filter(models.JobPosting.employment_type == employment_type)

    jobs = query.order_by(models.JobPosting.created_at.desc()).all()
    return [serialize_job_posting(job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=schemas.JobPostingRead)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(
            models.JobPosting.id == job_id,
            models.JobPosting.status == "published",
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return serialize_job_posting(job)


@router.post(
    "/jobs/{job_id}/apply",
    response_model=schemas.JobApplicationDetailRead,
    status_code=status.HTTP_201_CREATED,
)
def apply_to_job(
    job_id: int,
    payload: schemas.JobApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    job = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.id == job_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "published":
        raise HTTPException(status_code=400, detail="This job is not accepting applications")

    existing = (
        db.query(models.JobApplication)
        .filter(
            models.JobApplication.job_posting_id == job_id,
            models.JobApplication.candidate_user_id == current_user.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="You have already applied to this job")

    documents = (
        db.query(models.Document)
        .filter(
            models.Document.user_id == current_user.id,
            models.Document.id.in_(payload.document_ids),
        )
        .all()
    )
    found_ids = {document.id for document in documents}
    if found_ids != set(payload.document_ids):
        raise HTTPException(status_code=400, detail="You can only attach your own existing documents")

    job_application = models.JobApplication(
        job_posting_id=job.id,
        candidate_user_id=current_user.id,
        status="submitted",
        cover_letter_text=payload.cover_letter_text,
        candidate_note=payload.candidate_note,
    )
    db.add(job_application)
    db.flush()

    for document in documents:
        db.add(
            models.JobApplicationDocument(
                job_application_id=job_application.id,
                document_id=document.id,
                document_type=document.document_type,
            )
        )

    db.add(
        models.ApplicationStatusHistory(
            job_application_id=job_application.id,
            old_status=None,
            new_status="submitted",
            changed_by_user_id=current_user.id,
            note="Candidate submitted the application.",
        )
    )
    db.commit()

    created = (
        db.query(models.JobApplication)
        .options(
            joinedload(models.JobApplication.job_posting).joinedload(models.JobPosting.company),
            joinedload(models.JobApplication.attached_documents).joinedload(models.JobApplicationDocument.document),
            joinedload(models.JobApplication.status_history),
        )
        .filter(models.JobApplication.id == job_application.id)
        .first()
    )
    return serialize_job_application_detail(created)
