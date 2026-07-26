"""M13 - random ticket numbers, drop ticket_counters

Client request: replace the sequential UY-YYYY-NNNNNN ticket format with
an 8-digit random one ('85' + 6 random digits, app/services/tickets.py).
This is also a security improvement, not just cosmetic — since M-track
(track-by-ticket-only, no phone check), a sequential ticket was directly
guessable/enumerable; a random 6-digit suffix is not.

`ticket_counters` (one row per year, incremented under lock to produce
the old sequential number) has no other purpose, so it's dropped here.

DIQQAT (downgrade): existing complaints already carry random 8-digit
ticket numbers by the time anyone would downgrade — this recreates an
empty ticket_counters table but does NOT renumber existing complaints
back to the sequential scheme (would break every citizen's saved ticket
number, far worse than losing an internal counter table).

Revision ID: m13_random_ticket_numbers
Revises: m12_category_taxonomy_v2
Create Date: 2026-07-26 18:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = 'm13_random_ticket_numbers'
down_revision = 'm12_category_taxonomy_v2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table('ticket_counters')


def downgrade() -> None:
    op.create_table(
        'ticket_counters',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('last_value', sa.Integer(), nullable=False, server_default='0'),
        sa.PrimaryKeyConstraint('year'),
    )
