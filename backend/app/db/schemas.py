from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator


APPLICATION_STATUS_VALUES = ["Saved", "Applied", "Interview", "Offer", "Rejected", "Accepted"]
DOCUMENT_TYPE_VALUES = ["CV", "Transcript", "Certificate", "Other"]
USER_ROLE_VALUES = ["candidate", "hr", "admin"]
JOB_POSTING_STATUS_VALUES = ["draft", "published", "closed"]
JOB_EMPLOYMENT_TYPE_VALUES = ["internship", "part_time", "full_time"]
JOB_WORK_MODE_VALUES = ["onsite", "hybrid", "remote"]
JOB_APPLICATION_STATUS_VALUES = [
    "submitted",
    "under_review",
    "shortlisted",
    "interview",
    "offered",
    "rejected",
    "withdrawn",
]

ApplicationStatus = Literal["Saved", "Applied", "Interview", "Offer", "Rejected", "Accepted"]
DocumentType = Literal["CV", "Transcript", "Certificate", "Other"]
UserRole = Literal["candidate", "hr", "admin"]
JobPostingStatus = Literal["draft", "published", "closed"]
JobEmploymentType = Literal["internship", "part_time", "full_time"]
JobWorkMode = Literal["onsite", "hybrid", "remote"]
JobApplicationStatus = Literal[
    "submitted",
    "under_review",
    "shortlisted",
    "interview",
    "offered",
    "rejected",
    "withdrawn",
]


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = "candidate"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    role: UserRole
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ApplicationBase(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    position_title: str = Field(min_length=1, max_length=255)
    job_description: str = Field(min_length=1)
    application_status: ApplicationStatus = "Saved"
    deadline: date | None = None
    notes: str | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(BaseModel):
    company_name: str | None = Field(default=None, min_length=1, max_length=255)
    position_title: str | None = Field(default=None, min_length=1, max_length=255)
    job_description: str | None = Field(default=None, min_length=1)
    application_status: ApplicationStatus | None = None
    deadline: date | None = None
    notes: str | None = None


class ApplicationRead(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    application_id: int
    document_type: DocumentType
    file_name: str
    created_at: datetime


class DocumentDownloadUrl(BaseModel):
    document_id: int
    download_url: str
    expires_in: int


class CandidateProfileBase(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    university: str | None = Field(default=None, max_length=255)
    major: str | None = Field(default=None, max_length=255)
    graduation_year: int | None = Field(default=None, ge=1900, le=2100)
    phone: str | None = Field(default=None, max_length=50)
    location: str | None = Field(default=None, max_length=255)
    linkedin_url: str | None = Field(default=None, max_length=500)
    github_url: str | None = Field(default=None, max_length=500)
    portfolio_url: str | None = Field(default=None, max_length=500)
    bio: str | None = None


class CandidateProfileUpdate(CandidateProfileBase):
    pass


class CandidateProfileRead(CandidateProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    website: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    website: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=255)
    location: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=500)


class CompanySummaryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    industry: str | None
    location: str | None
    website: str | None
    logo_url: str | None


class CompanyRead(CompanySummaryRead):
    description: str | None
    owner_user_id: int
    created_at: datetime
    updated_at: datetime


class JobPostingBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    requirements: str | None = None
    responsibilities: str | None = None
    location: str | None = Field(default=None, max_length=255)
    employment_type: JobEmploymentType = "internship"
    work_mode: JobWorkMode = "onsite"
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    deadline: date | None = None

    @model_validator(mode="after")
    def validate_salary_range(self):
        if self.salary_min is not None and self.salary_max is not None and self.salary_max < self.salary_min:
            raise ValueError("salary_max must be greater than or equal to salary_min")
        return self


class JobPostingCreate(JobPostingBase):
    status: JobPostingStatus = "draft"


class JobPostingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, min_length=1)
    requirements: str | None = None
    responsibilities: str | None = None
    location: str | None = Field(default=None, max_length=255)
    employment_type: JobEmploymentType | None = None
    work_mode: JobWorkMode | None = None
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    deadline: date | None = None
    status: JobPostingStatus | None = None

    @model_validator(mode="after")
    def validate_salary_range(self):
        if self.salary_min is not None and self.salary_max is not None and self.salary_max < self.salary_min:
            raise ValueError("salary_max must be greater than or equal to salary_min")
        return self


class JobPostingStatusUpdate(BaseModel):
    status: JobPostingStatus


class JobPostingRead(JobPostingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    created_by_user_id: int
    status: JobPostingStatus
    created_at: datetime
    updated_at: datetime
    company: CompanySummaryRead


class AttachedDocumentRead(BaseModel):
    id: int
    document_id: int
    document_type: DocumentType
    file_name: str
    created_at: datetime


class StatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    old_status: str | None
    new_status: str
    changed_by_user_id: int | None
    note: str | None
    created_at: datetime


class JobPostingSummaryRead(BaseModel):
    id: int
    title: str
    location: str | None
    work_mode: JobWorkMode
    employment_type: JobEmploymentType
    deadline: date | None
    status: JobPostingStatus
    company: CompanySummaryRead


class JobApplicationCreate(BaseModel):
    cover_letter_text: str | None = None
    candidate_note: str | None = None
    document_ids: list[int] = Field(min_length=1)


class JobApplicationSummaryRead(BaseModel):
    id: int
    job_posting_id: int
    status: JobApplicationStatus
    submitted_at: datetime
    updated_at: datetime
    job_posting: JobPostingSummaryRead
    attached_documents_count: int


class CandidateSummaryRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None
    profile: CandidateProfileRead | None = None


class JobApplicationDetailRead(BaseModel):
    id: int
    job_posting_id: int
    candidate_user_id: int
    status: JobApplicationStatus
    cover_letter_text: str | None
    candidate_note: str | None
    submitted_at: datetime
    updated_at: datetime
    job_posting: JobPostingRead
    attached_documents: list[AttachedDocumentRead]
    status_history: list[StatusHistoryRead]


class HRJobApplicationDetailRead(JobApplicationDetailRead):
    candidate: CandidateSummaryRead


class HRApplicantSummaryRead(BaseModel):
    id: int
    candidate_user_id: int
    candidate_name: str
    candidate_email: EmailStr
    status: JobApplicationStatus
    submitted_at: datetime
    attached_documents_count: int


class StatusUpdateRequest(BaseModel):
    status: JobApplicationStatus
    note: str | None = None


class CandidateDeadlineRead(BaseModel):
    type: Literal["tracker", "job"]
    label: str
    deadline: date
    status: str


class CandidateDashboardRead(BaseModel):
    total_personal_applications: int
    total_submitted_job_applications: int
    recent_documents: list[DocumentRead]
    upcoming_deadlines: list[CandidateDeadlineRead]
    recent_job_applications: list[JobApplicationSummaryRead]


class HRDashboardRead(BaseModel):
    company: CompanyRead | None
    total_jobs: int
    published_jobs: int
    total_applicants: int
    recent_applications: list[HRApplicantSummaryRead]


class AIAnalyzeRequest(BaseModel):
    cv_text: str | None = Field(default=None, min_length=1)
    document_id: int | None = None

    @model_validator(mode="after")
    def require_cv_text_or_document(self):
        if not self.cv_text and not self.document_id:
            raise ValueError("Provide cv_text or a .txt CV document_id.")
        return self


class AIAnalysisRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    cv_text: str
    job_description: str
    match_score: int
    matched_skills: list[str]
    missing_skills: list[str]
    suggested_improvements: list[str]
    cover_letter: str
    created_at: datetime


class InterviewQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    question: str
    answer_hint: str
    created_at: datetime


class DashboardStats(BaseModel):
    total_applications: int
    applications_by_status: dict[str, int]
    uploaded_documents: int
    average_ai_match_score: float
    recent_applications: list[ApplicationRead]
