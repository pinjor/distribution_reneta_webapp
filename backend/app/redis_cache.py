import json

import redis.asyncio as redis

from app.core.config import get_settings

redis_client = None


async def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_client = redis.from_url(
            get_settings().redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
    return redis_client


async def close_redis_client() -> None:
    global redis_client
    client = redis_client
    redis_client = None
    if client is None:
        return
    closer = getattr(client, "aclose", None) or client.close
    await closer()


def _drop_client() -> None:
    global redis_client
    redis_client = None


async def cache_set(key: str, value: any, expire: int = 3600):
    """Cache a value in Redis. Failures leave the app running."""
    try:
        client = await get_redis_client()
        await client.setex(key, expire, json.dumps(value))
    except Exception:
        _drop_client()


async def cache_get(key: str):
    """Get a value from Redis cache. Returns None when Redis is unavailable."""
    try:
        client = await get_redis_client()
        value = await client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception:
        _drop_client()
        return None


async def cache_delete(key: str):
    """Delete a value from Redis cache."""
    try:
        client = await get_redis_client()
        await client.delete(key)
    except Exception:
        _drop_client()


async def cache_delete_pattern(pattern: str):
    """Delete all keys matching a pattern."""
    try:
        client = await get_redis_client()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception:
        _drop_client()
