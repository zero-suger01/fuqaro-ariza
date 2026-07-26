"""M11 - complaint_files.transcript

Voice messages are now stored as their own file (kind="audio") instead of
being dictated into the description textarea client-side. The transcript is
generated server-side in the background (worker.py::transcribe_complaint_audio)
so staff can read it without downloading/playing the clip, and so the AI
classifier can factor spoken content into category/priority/routing.

Revision ID: m11_audio_transcript
Revises: m10_ai_subtasks
Create Date: 2026-07-26 10:30:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm11_audio_transcript'
down_revision = 'm10_ai_subtasks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('complaint_files', sa.Column('transcript', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('complaint_files', 'transcript')
