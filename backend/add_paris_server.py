"""Seed: добавить Париж в servers."""
import asyncio
from sqlalchemy import text
from app.database import async_session, engine


async def main():
    async with async_session() as session:
        # Проверить, есть ли уже Париж
        result = await session.execute(text("SELECT id FROM servers WHERE host = '109.120.179.67'"))
        existing = result.fetchone()
        if existing:
            print("Париж уже в servers: id=%s" % existing[0])
        else:
            await session.execute(text(
                "INSERT INTO servers (name, country, country_code, host, is_active) "
                "VALUES ('Париж #1', 'France', 'FR', '109.120.179.67', 1)"
            ))
            await session.commit()
            print("Париж добавлен в servers")


asyncio.run(main())
