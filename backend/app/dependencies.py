from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db import models
from app.db.database import get_db


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if not payload:
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    try:
        user = db.get(models.User, int(user_id))
    except ValueError as exc:
        raise credentials_exception from exc

    if not user or not user.is_active:
        raise credentials_exception
    return user


def require_role(*allowed_roles: str) -> Callable:
    def dependency(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource",
            )
        return current_user

    return dependency


def require_application_owner(
    application_id: int,
    db: Session,
    current_user: models.User,
) -> models.InternshipApplication:
    application = db.get(models.InternshipApplication, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )
    return application


def require_company_owner_or_member(
    company_id: int,
    db: Session,
    current_user: models.User,
) -> models.Company:
    company = db.get(models.Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if company.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )
    return company


def require_job_owner(
    job_id: int,
    db: Session,
    current_user: models.User,
) -> models.JobPosting:
    job = db.get(models.JobPosting, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    company = db.get(models.Company, job.company_id)
    if not company or company.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )
    return job


def require_candidate_job_application(
    application_id: int,
    db: Session,
    current_user: models.User,
) -> models.JobApplication:
    job_application = db.get(models.JobApplication, application_id)
    if not job_application:
        raise HTTPException(status_code=404, detail="Job application not found")
    if job_application.candidate_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job application",
        )
    return job_application


def require_hr_job_application(
    application_id: int,
    db: Session,
    current_user: models.User,
) -> models.JobApplication:
    job_application = db.get(models.JobApplication, application_id)
    if not job_application:
        raise HTTPException(status_code=404, detail="Job application not found")
    job = db.get(models.JobPosting, job_application.job_posting_id)
    company = db.get(models.Company, job.company_id) if job else None
    if not job or not company or company.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job application",
        )
    return job_application
