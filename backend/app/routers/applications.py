import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import models, schemas
from app.db.database import get_db
from app.dependencies import get_current_user, require_application_owner, require_role
from app.services.storage_service import StorageService


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["applications"])


def get_owned_application(
    db: Session,
    application_id: int,
    user_id: int,
) -> models.InternshipApplication:
    current_user = db.get(models.User, user_id)
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")
    return require_application_owner(application_id, db, current_user)


@router.get("", response_model=list[schemas.ApplicationRead])
def list_applications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    return (
        db.query(models.InternshipApplication)
        .filter(models.InternshipApplication.user_id == current_user.id)
        .order_by(models.InternshipApplication.created_at.desc())
        .all()
    )


@router.post("", response_model=schemas.ApplicationRead, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: schemas.ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    application = models.InternshipApplication(
        user_id=current_user.id,
        **payload.model_dump(),
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    logger.info("application_created user_id=%s application_id=%s", current_user.id, application.id)
    return application


@router.get("/{application_id}", response_model=schemas.ApplicationRead)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    return get_owned_application(db, application_id, current_user.id)


@router.put("/{application_id}", response_model=schemas.ApplicationRead)
def update_application(
    application_id: int,
    payload: schemas.ApplicationUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    application = get_owned_application(db, application_id, current_user.id)
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(application, field, value)
    db.commit()
    db.refresh(application)
    logger.info("application_updated user_id=%s application_id=%s", current_user.id, application.id)
    return application


@router.delete("/{application_id}")
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("candidate", "admin")),
):
    application = get_owned_application(db, application_id, current_user.id)
    storage = StorageService()
    for document in application.documents:
        storage.delete_file(document.s3_key)
    db.delete(application)
    db.commit()
    logger.info("application_deleted user_id=%s application_id=%s", current_user.id, application_id)
    return {"message": "Application deleted"}
