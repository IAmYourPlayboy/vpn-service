"""Утилиты для форматирования дат — даты в БД уже в московском времени (UTC+3)."""

from datetime import datetime, timedelta


def msk_str(dt: datetime, fmt: str = "%d.%m.%Y %H:%M") -> str:
    """Отформатировать дату (она уже в московском времени)."""
    # Убираем tzinfo для корректного format, данные уже Moscow
    dt_naive = dt.replace(tzinfo=None)
    return dt_naive.strftime(fmt)


def msk_date(dt: datetime) -> str:
    """Дата в формате DD.MM.YYYY (без времени)."""
    return msk_str(dt, "%d.%m.%Y")


def msk_days_left(dt: datetime) -> int:
    """Сколько полных дней осталось до даты (даты в московском времени)."""
    from datetime import timezone
    moscow_now = datetime.now(timezone(timedelta(hours=3)))
    dt_naive = dt.replace(tzinfo=None) if dt.tzinfo else dt
    return max(0, (dt_naive - moscow_now.replace(tzinfo=None)).days)
