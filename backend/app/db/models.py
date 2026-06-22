from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    BigInteger,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="candidate", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    applications = relationship(
        "InternshipApplication",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")
    candidate_profile = relationship(
        "CandidateProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    owned_company = relationship(
        "Company",
        back_populates="owner",
        uselist=False,
        cascade="all, delete-orphan",
        foreign_keys="Company.owner_user_id",
    )
    created_job_postings = relationship(
        "JobPosting",
        back_populates="created_by_user",
        foreign_keys="JobPosting.created_by_user_id",
    )
    job_applications = relationship(
        "JobApplication",
        back_populates="candidate_user",
        foreign_keys="JobApplication.candidate_user_id",
    )
    status_changes = relationship(
        "ApplicationStatusHistory",
        back_populates="changed_by_user",
        foreign_keys="ApplicationStatusHistory.changed_by_user_id",
    )


class InternshipApplication(Base):
    __tablename__ = "internship_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    company_name = Column(String(255), nullable=False)
    position_title = Column(String(255), nullable=False)
    job_description = Column(Text, nullable=False)
    application_status = Column(String(50), default="Saved", nullable=False)
    deadline = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="applications")
    documents = relationship(
        "Document",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    ai_results = relationship(
        "AIAnalysisResult",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    interview_questions = relationship(
        "InterviewQuestion",
        back_populates="application",
        cascade="all, delete-orphan",
    )


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(
        Integer,
        ForeignKey("internship_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type = Column(String(50), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    s3_key = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="documents")
    application = relationship("InternshipApplication", back_populates="documents")
    job_application_links = relationship(
        "JobApplicationDocument",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    full_name = Column(String(255), nullable=True)
    university = Column(String(255), nullable=True)
    major = Column(String(255), nullable=True)
    graduation_year = Column(Integer, nullable=True)
    phone = Column(String(50), nullable=True)
    location = Column(String(255), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user = relationship("User", back_populates="candidate_profile")


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    owner_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    website = Column(String(500), nullable=True)
    industry = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    owner = relationship("User", back_populates="owned_company", foreign_keys=[owner_user_id])
    job_postings = relationship("JobPosting", back_populates="company", cascade="all, delete-orphan")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    requirements = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)
    employment_type = Column(String(50), default="internship", nullable=False)
    work_mode = Column(String(50), default="onsite", nullable=False)
    salary_min = Column(BigInteger, nullable=True)
    salary_max = Column(BigInteger, nullable=True)
    deadline = Column(Date, nullable=True)
    status = Column(String(50), default="draft", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    company = relationship("Company", back_populates="job_postings")
    created_by_user = relationship("User", back_populates="created_job_postings", foreign_keys=[created_by_user_id])
    applications = relationship("JobApplication", back_populates="job_posting", cascade="all, delete-orphan")


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        UniqueConstraint("job_posting_id", "candidate_user_id", name="uq_job_applications_job_candidate"),
    )

    id = Column(Integer, primary_key=True, index=True)
    job_posting_id = Column(Integer, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="submitted", nullable=False)
    cover_letter_text = Column(Text, nullable=True)
    candidate_note = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    job_posting = relationship("JobPosting", back_populates="applications")
    candidate_user = relationship("User", back_populates="job_applications", foreign_keys=[candidate_user_id])
    attached_documents = relationship(
        "JobApplicationDocument",
        back_populates="job_application",
        cascade="all, delete-orphan",
    )
    status_history = relationship(
        "ApplicationStatusHistory",
        back_populates="job_application",
        cascade="all, delete-orphan",
        order_by="ApplicationStatusHistory.created_at.asc()",
    )


class JobApplicationDocument(Base):
    __tablename__ = "job_application_documents"
    __table_args__ = (
        UniqueConstraint("job_application_id", "document_id", name="uq_job_application_documents_attachment"),
    )

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    document_type = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job_application = relationship("JobApplication", back_populates="attached_documents")
    document = relationship("Document", back_populates="job_application_links")


class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(Integer, primary_key=True, index=True)
    job_application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    job_application = relationship("JobApplication", back_populates="status_history")
    changed_by_user = relationship("User", back_populates="status_changes", foreign_keys=[changed_by_user_id])


class AIAnalysisResult(Base):
    __tablename__ = "ai_analysis_results"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("internship_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cv_text = Column(Text, nullable=False)
    job_description = Column(Text, nullable=False)
    match_score = Column(Integer, nullable=False)
    matched_skills = Column(JSON, default=list, nullable=False)
    missing_skills = Column(JSON, default=list, nullable=False)
    suggested_improvements = Column(JSON, default=list, nullable=False)
    cover_letter = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("InternshipApplication", back_populates="ai_results")


class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(
        Integer,
        ForeignKey("internship_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question = Column(Text, nullable=False)
    answer_hint = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    application = relationship("InternshipApplication", back_populates="interview_questions")
