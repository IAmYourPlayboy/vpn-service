"""API для VPN — получение конфигов и QR-кодов."""

import base64
import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.schemas import VPNConfigResponse
from app.database import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.services.marzban import marzban_client

router = APIRouter(prefix="/api/vpn", tags=["vpn"])


def _generate_qr_base64(data: str) -> str:
    """Генерировать QR-код как base64 PNG."""
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


@router.get("/config", response_model=VPNConfigResponse)
async def get_vpn_config(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Получить VPN-конфиг и QR-код для текущего пользователя."""
    # Ищем активную подписку
    result = await db.execute(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == "active",
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Нет активной подписки. Оформите подписку для доступа к VPN.",
        )

    # Получаем ссылку подписки из Marzban
    sub_link = await marzban_client.get_subscription_link(subscription.marzban_username)

    if not sub_link:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Не удалось получить конфиг VPN. Попробуйте позже.",
        )

    # Генерируем QR-код
    qr_base64 = _generate_qr_base64(sub_link)

    return VPNConfigResponse(
        subscription_link=sub_link,
        qr_code_base64=qr_base64,
    )


