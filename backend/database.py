import os
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import HTTPException, Header
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv(Path(__file__).parent / '.env')
client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]


def now():
    return datetime.now(timezone.utc)


def token_hash(value):
    return hashlib.sha256(value.encode()).hexdigest()


async def current_player(authorization: str = Header(default='')):
    if not authorization.startswith('Bearer '):
        raise HTTPException(401, 'Please reconnect to your adventure.')
    player = await db.players.find_one({'token_hash': token_hash(authorization[7:])}, {'_id': 0})
    if not player:
        raise HTTPException(401, 'Your session has expired. Please reconnect.')
    return player