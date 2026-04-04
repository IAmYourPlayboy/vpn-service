"""Обработчик раздела «Мой VPN» — конфиг, QR, статус."""

import base64
import io

from aiogram import F, Router
from aiogram.types import BufferedInputFile, CallbackQuery
from sqlalchemy import select

from app.bot.keyboards.main_menu import back_to_menu_keyboard, vpn_keyboard
from app.bot.utils.date_utils import msk_date, msk_days_left
from app.database import async_session
from app.models.subscription import Subscription
from app.models.user import User
from app.services.marzban import marzban_client

router = Router()


async def _get_user_and_sub(telegram_id: int) -> tuple[User | None, Subscription | None]:
    """Получить пользователя и его активную подписку."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.telegram_id == telegram_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return None, None

        sub_result = await db.execute(
            select(Subscription).where(
                Subscription.user_id == user.id,
                Subscription.status == "active",
            )
        )
        sub = sub_result.scalar_one_or_none()
        return user, sub


@router.callback_query(F.data == "my_vpn")
async def show_vpn(callback: CallbackQuery):
    """Показать раздел Мой VPN."""
    user, sub = await _get_user_and_sub(callback.from_user.id)

    if not sub:
        await callback.message.edit_text(
            "🔑 <b>Мой VPN</b>\n\n"
            "❌ У вас нет активной подписки.\n"
            "Оформите подписку, чтобы получить доступ к VPN.",
            reply_markup=back_to_menu_keyboard(),
        )
        await callback.answer()
        return

    # Формируем текст статуса
    days_left = msk_days_left(sub.expires_at)
    text = (
        "🔑 <b>Мой VPN</b>\n\n"
        f"✅ Подписка активна\n"
        f"📅 До: {msk_date(sub.expires_at)}\n"
        f"⏳ Осталось: {days_left} дней\n\n"
        "Выберите действие:"
    )

    await callback.message.edit_text(text, reply_markup=vpn_keyboard())
    await callback.answer()


@router.callback_query(F.data == "copy_config")
async def send_config_link(callback: CallbackQuery):
    """Отправить ссылку подписки (для копирования)."""
    user, sub = await _get_user_and_sub(callback.from_user.id)

    if not sub:
        await callback.answer("❌ Нет активной подписки", show_alert=True)
        return

    sub_link = await marzban_client.get_subscription_link(sub.marzban_username)
    if sub_link:
        await callback.message.answer(
            f"📋 <b>Ссылка подписки</b>\n\n"
            f"<code>{sub_link}</code>\n\n"
            "Скопируйте и вставьте в приложение:\n"
            "• WireGuard\n"
            "• V2rayNG\n"
            "• Hiddify",
        )
    else:
        await callback.message.answer("❌ Не удалось получить конфиг. Попробуйте позже.")

    await callback.answer()


@router.callback_query(F.data == "qr_code")
async def send_qr_code(callback: CallbackQuery):
    """Отправить QR-код подписки."""
    user, sub = await _get_user_and_sub(callback.from_user.id)

    if not sub:
        await callback.answer("❌ Нет активной подписки", show_alert=True)
        return

    sub_link = await marzban_client.get_subscription_link(sub.marzban_username)
    if not sub_link:
        await callback.message.answer("❌ Не удалось получить конфиг.")
        await callback.answer()
        return

    # Генерируем QR-код
    import qrcode
    qr = qrcode.QRCode(version=1, box_size=10, border=2)
    qr.add_data(sub_link)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    photo = BufferedInputFile(buffer.read(), filename="vpn_qr.png")
    await callback.message.answer_photo(
        photo,
        caption="📱 <b>QR-код VPN</b>\n\nОтсканируйте в приложении WireGuard / V2rayNG / Hiddify",
    )
    await callback.answer()


@router.callback_query(F.data == "download_config")
async def download_config(callback: CallbackQuery):
    """Отправить ссылку подписки как текстовый файл."""
    user, sub = await _get_user_and_sub(callback.from_user.id)

    if not sub:
        await callback.answer("❌ Нет активной подписки", show_alert=True)
        return

    sub_link = await marzban_client.get_subscription_link(sub.marzban_username)
    if not sub_link:
        await callback.message.answer("❌ Не удалось получить конфиг.")
        await callback.answer()
        return

    # Отправляем ссылку как текстовый файл
    file_content = sub_link.encode("utf-8")
    document = BufferedInputFile(file_content, filename="andigo_vpn.txt")
    await callback.message.answer_document(
        document,
        caption="📥 <b>Конфиг VPN</b>\n\nОткройте файл в приложении VPN-клиента.",
    )
    await callback.answer()
