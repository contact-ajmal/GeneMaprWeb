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

    Drops and recreates the samples table to apply schema changes.
    Variants with sample_id references are preserved if samples table exists;
    otherwise they start fresh.
    """
    from sqlalchemy import text, inspect

    async with engine.begin() as conn:
        # Check if samples table needs migration (check for new column)
        def _needs_migration(sync_conn):
            insp = inspect(sync_conn)
            if not insp.has_table("samples"):
                return False
            columns = [c["name"] for c in insp.get_columns("samples")]
            return "original_filename" not in columns

        needs_migration = await conn.run_sync(_needs_migration)

        if needs_migration:
            # Drop samples table (cascade will handle variants FK)
            await conn.execute(text("DROP TABLE IF EXISTS samples CASCADE"))

        await conn.run_sync(Base.metadata.create_all)
