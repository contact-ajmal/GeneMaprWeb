from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.database import init_db
import app.models.scoring_profile  # noqa: F401 - ensure model is registered with Base
import app.models.sample  # noqa: F401 - ensure model is registered with Base
import app.models.user  # noqa: F401 - ensure model is registered with Base
import app.models.custom_role  # noqa: F401 - ensure model is registered with Base
from app.core.redis import init_redis, close_redis
from app.core.config import settings
from app.api.variants import router as variants_router
from app.api.chat import router as chat_router
from app.api.reports import router as reports_router
from app.api.pharmacogenomics import router as pharmacogenomics_router
from app.api.scoring_profiles import router as scoring_profiles_router, seed_default_profiles
from app.api.samples import router as samples_router
from app.api.auth import router as auth_router
from app.api.admin import router as admin_router
from app.middleware import (
    LoggingMiddleware,
    configure_logging,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)


async def seed_admin_user():
    """Seed a default admin user if none exists."""
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.services.auth_service import hash_password

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == "admin"))
        if result.scalar_one_or_none() is None:
            admin = User(
                email="admin@genemapr.io",
                full_name="GeneMapr Admin",
                hashed_password=hash_password("GeneMapr2024!"),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    configure_logging(log_level=settings.log_level)
    await init_db()
    await init_redis()
    # Seed default scoring profiles
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        await seed_default_profiles(db)
    # Seed default admin user
    await seed_admin_user()
    yield
    # Shutdown
    await close_redis()


app = FastAPI(
    title="GeneMapr API",
    description="Genomic variant interpretation platform",
    version="0.1.0",
    lifespan=lifespan
)

# Register exception handlers
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# Logging middleware (should be first to log all requests)
app.add_middleware(LoggingMiddleware)

# CORS middleware (environment-aware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(variants_router)
app.include_router(chat_router)
app.include_router(reports_router)
app.include_router(pharmacogenomics_router)
app.include_router(scoring_profiles_router)
app.include_router(samples_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
