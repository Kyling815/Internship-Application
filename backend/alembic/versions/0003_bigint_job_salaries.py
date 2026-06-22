"""Use 64-bit integers for job salary ranges.

Revision ID: 0003_bigint_job_salaries
Revises: 0002_two_sided_platform
Create Date: 2026-06-22
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_bigint_job_salaries"
down_revision = "0002_two_sided_platform"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "job_postings",
        "salary_min",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )
    op.alter_column(
        "job_postings",
        "salary_max",
        existing_type=sa.Integer(),
        type_=sa.BigInteger(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "job_postings",
        "salary_max",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
    )
    op.alter_column(
        "job_postings",
        "salary_min",
        existing_type=sa.BigInteger(),
        type_=sa.Integer(),
        existing_nullable=True,
    )
