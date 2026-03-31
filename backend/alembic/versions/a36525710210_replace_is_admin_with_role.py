"""replace is_admin with role

Revision ID: a36525710210
Revises: 31bdd89fbeef
Create Date: 2026-03-31 23:52:43.271503
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# Revision identifiers
revision: str = 'a36525710210'
down_revision: Union[str, None] = '31bdd89fbeef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # SQLite не поддерживает ALTER COLUMN / DROP COLUMN напрямую,
    # поэтому: добавляем role, мигрируем данные из is_admin, пересоздаём таблицу

    # 1. Добавить столбец role
    op.add_column('users', sa.Column('role', sa.String(20), server_default='user', nullable=False))

    # 2. Мигрировать данные: is_admin=1 → role='owner'
    op.execute("UPDATE users SET role='owner' WHERE is_admin = 1")
    op.execute("UPDATE users SET role='user' WHERE is_admin = 0 OR is_admin IS NULL")

    # 3. Удалить is_admin через batch (SQLite-способ)
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('is_admin')


def downgrade() -> None:
    # Обратная миграция: role → is_admin
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), server_default='0', nullable=False))

    op.execute("UPDATE users SET is_admin = 1 WHERE role = 'owner'")
    op.execute("UPDATE users SET is_admin = 0 WHERE role != 'owner'")

    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('role')
