import redis.asyncio as redis
from app.core.config import settings

# Redis client instance
redis_client: redis.Redis = None


async def get_redis() -> redis.Redis:
    """Get Redis client instance."""
    return redis_client


async def init_redis():
    """Initialize Redis connection."""
    global redis_client
    redis_client = await redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True
    )


async def close_redis():
    """Close Redis connection."""
    global redis_client
    if redis_client:
        await redis_client.close()
