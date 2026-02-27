from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.database import init_db
from app.core.redis import init_redis, close_redis
from app.core.config import settings
from app.api.variants import router as variants_router
from app.api.chat import router as chat_router
from app.middleware import (
    LoggingMiddleware,
    configure_logging,
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    configure_logging(log_level=settings.log_level)
    await init_db()
    await init_redis()
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
app.include_router(variants_router)
app.include_router(chat_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
