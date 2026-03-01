from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=True,
    future=True,
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency for getting async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Initialize database tables.

    Creates new tables (including users) and applies schema migrations
    for existing tables (adds user_id to samples if missing).
    """
    from sqlalchemy import text, inspect

    async with engine.begin() as conn:
        # Check if samples table needs original_filename migration
        def _needs_migration(sync_conn):
            insp = inspect(sync_conn)
            if not insp.has_table("samples"):
                return False
            columns = [c["name"] for c in insp.get_columns("samples")]
            return "original_filename" not in columns

        needs_migration = await conn.run_sync(_needs_migration)

        if needs_migration:
            await conn.execute(text("DROP TABLE IF EXISTS samples CASCADE"))

        # Create all tables (including new 'users' table)
        await conn.run_sync(Base.metadata.create_all)

        # Add user_id column to samples if not present (migration)
        def _needs_user_id(sync_conn):
            insp = inspect(sync_conn)
            if not insp.has_table("samples"):
                return False
            columns = [c["name"] for c in insp.get_columns("samples")]
            return "user_id" not in columns

        needs_user_id = await conn.run_sync(_needs_user_id)
        if needs_user_id:
            await conn.execute(text(
                "ALTER TABLE samples ADD COLUMN user_id UUID "
                "REFERENCES users(id) ON DELETE CASCADE"
            ))
            await conn.execute(text(
                "CREATE INDEX IF NOT EXISTS ix_samples_user_id ON samples(user_id)"
            ))

