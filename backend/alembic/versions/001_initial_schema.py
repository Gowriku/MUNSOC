"""initial schema

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table('users',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('college', sa.String(), nullable=True),
        sa.Column('google_id', sa.String(), nullable=True),
        sa.Column('profile_picture', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('delegate', 'volunteer', 'da_team', 'admin', name='userrole'), nullable=False, server_default='delegate'),
        sa.Column('reg_tier', sa.Enum('early_bird', 'round1', 'round2', name='regtier'), nullable=True),
        sa.Column('amount_due', sa.Float(), nullable=False, server_default='0'),
        sa.Column('payment_status', sa.Enum('pending', 'submitted', 'confirmed', 'rejected', name='paymentstatus'), nullable=False, server_default='pending'),
        sa.Column('payment_utr', sa.String(), nullable=True),
        sa.Column('payment_confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('transportation_opted', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('google_id'),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # committees
    op.create_table('committees',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('abbreviation', sa.String(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('topics', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # portfolios
    op.create_table('portfolios',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('committee_id', sa.String(), nullable=False),
        sa.Column('country_name', sa.String(), nullable=False),
        sa.Column('flag_url', sa.String(), nullable=True),
        sa.Column('is_assigned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['committee_id'], ['committees.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # preferences
    op.create_table('preferences',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('pref1_id', sa.String(), nullable=True),
        sa.Column('pref2_id', sa.String(), nullable=True),
        sa.Column('pref3_id', sa.String(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['pref1_id'], ['portfolios.id']),
        sa.ForeignKeyConstraint(['pref2_id'], ['portfolios.id']),
        sa.ForeignKeyConstraint(['pref3_id'], ['portfolios.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    # assignments
    op.create_table('assignments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('portfolio_id', sa.String(), nullable=False),
        sa.Column('assigned_by', sa.String(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['portfolio_id'], ['portfolios.id']),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
    )

    # qr_tokens
    op.create_table('qr_tokens',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('is_valid', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('issued_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id'),
        sa.UniqueConstraint('token'),
    )

    # checkins
    op.create_table('checkins',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('type', sa.Enum('event', 'transport', name='checkintype'), nullable=False),
        sa.Column('scanned_by', sa.String(), nullable=True),
        sa.Column('scanned_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['scanned_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # alerts
    op.create_table('alerts',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('committee_id', sa.String(), nullable=True),
        sa.Column('type', sa.Enum('session_start', 'session_end', 'break_start', 'break_end', 'custom', name='alerttype'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('sent_by', sa.String(), nullable=False),
        sa.Column('sent_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['committee_id'], ['committees.id']),
        sa.ForeignKeyConstraint(['sent_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # messages
    op.create_table('messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('sender_id', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('replied_by', sa.String(), nullable=True),
        sa.Column('reply_text', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id']),
        sa.ForeignKeyConstraint(['replied_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # feedback
    op.create_table('feedback',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('type', sa.Enum('review', 'query', 'complaint', name='feedbacktype'), nullable=False),
        sa.Column('is_anonymous', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # fee_tiers
    op.create_table('fee_tiers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('tier_key', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('deadline', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('tier_key'),
    )


def downgrade() -> None:
    op.drop_table('fee_tiers')
    op.drop_table('feedback')
    op.drop_table('messages')
    op.drop_table('alerts')
    op.drop_table('checkins')
    op.drop_table('qr_tokens')
    op.drop_table('assignments')
    op.drop_table('preferences')
    op.drop_table('portfolios')
    op.drop_table('committees')
    op.drop_table('users')