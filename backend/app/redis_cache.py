import redis.asyncio as redis
import json
import os

redis_client = None

async def get_redis_client():
    global redis_client
    if redis_client is None:
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
    return redis_client

async def cache_set(key: str, value: any, expire: int = 3600):
    """Cache a value in Redis"""
    client = await get_redis_client()
    await client.setex(key, expire, json.dumps(value))

async def cache_get(key: str):
    """Get a value from Redis cache"""
    client = await get_redis_client()
    value = await client.get(key)
    if value:
        return json.loads(value)
    return None

async def cache_delete(key: str):
    """Delete a value from Redis cache"""
    client = await get_redis_client()
    await client.delete(key)

async def cache_delete_pattern(pattern: str):
    """Delete all keys matching a pattern"""
    client = await get_redis_client()
    keys = await client.keys(pattern)
    if keys:
        await client.delete(*keys)

