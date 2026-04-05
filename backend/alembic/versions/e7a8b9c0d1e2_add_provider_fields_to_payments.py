"""add provider fields to payments (yokassa -> multi-gateway)

Revision ID: e7a8b9c0d1e2
Revises: b12345678abc
Create Date: 2026-04-04

Эта миграция удаёт yokassa_payment_id и добавляет provider + provider_payment_id.
Применяется на VDS: колонка yokassa_payment_id удаляется, данные мигрируются.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7a8b9c0d1e2'
down_revision: Union[str, None] = 'b12345678abc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite 3.35+ поддерживает DROP COLUMN в ALTER TABLE
    # Добавляем новые колонки (если их ещё нет)
    with op.batch_alter_table('payments', reconstruct={'add_column': 'provider'}) as batch_op:
        batch_op.add_column(sa.Column('provider', sa.String(30),
            nullable=False, server_default='cryptomus'))
        batch_op.add_column(sa.Column('provider_payment_id', sa.String(255), nullable=True))

    # Все существовавшие платежи были через ЮКассу
    op.execute("UPDATE payments SET provider = 'yookassa', "
               "provider_payment_id = yokassa_payment_id "
               "WHERE yokassa_payment_id IS NOT NULL")

    # Удаляем старую yokassa_payment_id колонку
    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_column('yokassa_payment_id')


def downgrade() -> None:
    with op.batch_alter_table('payments') as batch_op:
        batch_op.add_column(sa.Column('yokassa_payment_id', sa.String(255), nullable=True))

    op.execute("UPDATE payments SET yokassa_payment_id = provider_payment_id WHERE provider = 'yookassa'")

    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_column('provider_payment_id')

    with op.batch_alter_table('payments') as batch_op:
        batch_op.drop_column('provider')
