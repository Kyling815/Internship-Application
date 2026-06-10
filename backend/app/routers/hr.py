from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.db import models, schemas
from app.db.database import get_db
from app.dependencies import (
    require_company_owner_or_member,
    require_hr_job_application,
    require_job_owner,
    require_role,
)
from app.routers.platform_helpers import (
    serialize_attached_document,
    serialize_company,
    serialize_job_application_detail,
    serialize_job_posting,
)
from app.services.storage_service import StorageService


router = APIRouter(prefix="/hr", tags=["hr"])


def _get_hr_company_or_404(db: Session, current_user: models.User) -> models.Company:
    company = (
        db.query(models.Company)
        .filter(models.Company.owner_user_id == current_user.id)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/dashboard", response_model=schemas.HRDashboardRead)
def hr_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    company = (
        db.query(models.Company)
        .filter(models.Company.owner_user_id == current_user.id)
        .first()
    )
    if not company:
        return {
            "company": None,
            "total_jobs": 0,
            "published_jobs": 0,
            "total_applicants": 0,
            "recent_applications": [],
        }

    jobs = (
        db.query(models.JobPosting)
        .filter(models.JobPosting.company_id == company.id)
        .all()
    )
    job_ids = [job.id for job in jobs]
    applications = []
    if job_ids:
        applications = (
            db.query(models.JobApplication)
            .options(
                joinedload(models.JobApplication.candidate_user),
                joinedload(models.JobApplication.attached_documents),
            )
            .filter(models.JobApplication.job_posting_id.in_(job_ids))
            .order_by(models.JobApplication.submitted_at.desc())
            .all()
        )

    recent_applications = []
    for application in applications[:5]:
        candidate = application.candidate_user
        recent_applications.append(
            {
                "id": application.id,
                "candidate_user_id": application.candidate_user_id,
                "candidate_name": candidate.full_name or candidate.email,
                "candidate_email": candidate.email,
                "status": application.status,
                "submitted_at": application.submitted_at,
                "attached_documents_count": len(application.attached_documents),
            }
        )

    return {
        "company": serialize_company(company),
        "total_jobs": len(jobs),
        "published_jobs": sum(1 for job in jobs if job.status == "published"),
        "total_applicants": len(applications),
        "recent_applications": recent_applications,
    }


@router.post("/jobs", response_model=schemas.JobPostingRead, status_code=status.HTTP_201_CREATED)
def create_hr_job(
    payload: schemas.JobPostingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    company = _get_hr_company_or_404(db, current_user)
    job = models.JobPosting(
        company_id=company.id,
        created_by_user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    job = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.id == job.id)
        .first()
    )
    return serialize_job_posting(job)


@router.get("/jobs", response_model=list[schemas.JobPostingRead])
def list_hr_jobs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    company = _get_hr_company_or_404(db, current_user)
    jobs = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.company_id == company.id)
        .order_by(models.JobPosting.created_at.desc())
        .all()
    )
    return [serialize_job_posting(job) for job in jobs]


@router.get("/jobs/{job_id}", response_model=schemas.JobPostingRead)
def get_hr_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    job = require_job_owner(job_id, db, current_user)
    loaded = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.id == job.id)
        .first()
    )
    return serialize_job_posting(loaded)


@router.put("/jobs/{job_id}", response_model=schemas.JobPostingRead)
def update_hr_job(
    job_id: int,
    payload: schemas.JobPostingUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    job = require_job_owner(job_id, db, current_user)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(job, field, value)
    db.commit()
    db.refresh(job)
    refreshed = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.id == job.id)
        .first()
    )
    return serialize_job_posting(refreshed)


@router.delete("/jobs/{job_id}")
def delete_hr_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    job = require_job_owner(job_id, db, current_user)
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@router.patch("/jobs/{job_id}/status", response_model=schemas.JobPostingRead)
def update_hr_job_status(
    job_id: int,
    payload: schemas.JobPostingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    job = require_job_owner(job_id, db, current_user)
    job.status = payload.status
    db.commit()
    db.refresh(job)
    refreshed = (
        db.query(models.JobPosting)
        .options(joinedload(models.JobPosting.company))
        .filter(models.JobPosting.id == job.id)
        .first()
    )
    return serialize_job_posting(refreshed)


@router.get("/jobs/{job_id}/applications", response_model=list[schemas.HRApplicantSummaryRead])
def list_hr_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    job = require_job_owner(job_id, db, current_user)
    applications = (
        db.query(models.JobApplication)
        .options(
            joinedload(models.JobApplication.candidate_user),
            joinedload(models.JobApplication.attached_documents),
        )
        .filter(models.JobApplication.job_posting_id == job.id)
        .order_by(models.JobApplication.submitted_at.desc())
        .all()
    )
    return [
        {
            "id": application.id,
            "candidate_user_id": application.candidate_user_id,
            "candidate_name": application.candidate_user.full_name or application.candidate_user.email,
            "candidate_email": application.candidate_user.email,
            "status": application.status,
            "submitted_at": application.submitted_at,
            "attached_documents_count": len(application.attached_documents),
        }
        for application in applications
    ]


@router.get("/applications/{application_id}", response_model=schemas.HRJobApplicationDetailRead)
def get_hr_application_detail(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    application = require_hr_job_application(application_id, db, current_user)
    loaded = (
        db.query(models.JobApplication)
        .options(
            joinedload(models.JobApplication.job_posting).joinedload(models.JobPosting.company),
            joinedload(models.JobApplication.candidate_user).joinedload(models.User.candidate_profile),
            joinedload(models.JobApplication.attached_documents).joinedload(models.JobApplicationDocument.document),
            joinedload(models.JobApplication.status_history),
        )
        .filter(models.JobApplication.id == application.id)
        .first()
    )
    return serialize_job_application_detail(loaded, include_candidate=True)


@router.patch("/applications/{application_id}/status", response_model=schemas.HRJobApplicationDetailRead)
def update_hr_application_status(
    application_id: int,
    payload: schemas.StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    if payload.status == "withdrawn":
        raise HTTPException(status_code=400, detail="HR cannot set status to withdrawn")
    application = require_hr_job_application(application_id, db, current_user)
    old_status = application.status
    application.status = payload.status
    db.add(
        models.ApplicationStatusHistory(
            job_application_id=application.id,
            old_status=old_status,
            new_status=payload.status,
            changed_by_user_id=current_user.id,
            note=payload.note,
        )
    )
    db.commit()
    loaded = (
        db.query(models.JobApplication)
        .options(
            joinedload(models.JobApplication.job_posting).joinedload(models.JobPosting.company),
            joinedload(models.JobApplication.candidate_user).joinedload(models.User.candidate_profile),
            joinedload(models.JobApplication.attached_documents).joinedload(models.JobApplicationDocument.document),
            joinedload(models.JobApplication.status_history),
        )
        .filter(models.JobApplication.id == application.id)
        .first()
    )
    return serialize_job_application_detail(loaded, include_candidate=True)


@router.get("/applications/{application_id}/documents", response_model=list[schemas.AttachedDocumentRead])
def list_hr_application_documents(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    application = require_hr_job_application(application_id, db, current_user)
    loaded = (
        db.query(models.JobApplication)
        .options(joinedload(models.JobApplication.attached_documents).joinedload(models.JobApplicationDocument.document))
        .filter(models.JobApplication.id == application.id)
        .first()
    )
    return [serialize_attached_document(link) for link in loaded.attached_documents]


@router.get("/documents/{document_id}/download-url", response_model=schemas.DocumentDownloadUrl)
def get_hr_document_download_url(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("hr", "admin")),
):
    link = (
        db.query(models.JobApplicationDocument)
        .join(models.JobApplication, models.JobApplicationDocument.job_application_id == models.JobApplication.id)
        .join(models.JobPosting, models.JobApplication.job_posting_id == models.JobPosting.id)
        .join(models.Company, models.JobPosting.company_id == models.Company.id)
        .options(joinedload(models.JobApplicationDocument.document))
        .filter(
            models.JobApplicationDocument.document_id == document_id,
            models.Company.owner_user_id == current_user.id,
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=404, detail="Document not found")

    download_url = StorageService().generate_download_url(
        link.document.s3_key,
        fallback_url=link.document.file_url,
    )
    return {
        "document_id": link.document.id,
        "download_url": download_url,
        "expires_in": 3600,
    }
