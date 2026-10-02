import uuid
import secrets
import base64
from datetime import timedelta
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
import base58
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from database import db, now, current_player, token_hash
from models import Player, GuestResponse, ProfilePatch, Position
from solana_service import validate_address
from geography import SPAWN, inside_territory

router = APIRouter()


@router.post('/players/guest', response_model=GuestResponse)
async def guest():
    token = secrets.token_urlsafe(32)
    record = {'id': str(uuid.uuid4()), 'name': 'Visitor', 'token_hash': token_hash(token),
              'wallet': None, **SPAWN, 'world_id': 'kingdom', 'discovered': [], 'last_seen': now()}
    await db.players.insert_one(record.copy())
    return {'token': token, 'player': Player(**record)}


@router.get('/players/me', response_model=Player)
async def me(player=Depends(current_player)):
    return Player(**player)


@router.patch('/players/me', response_model=Player)
async def profile(data: ProfilePatch, player=Depends(current_player)):
    await db.players.update_one({'id': player['id']}, {'$set': data.model_dump()})
    return Player(**{**player, **data.model_dump()})


@router.post('/players/position')
async def position(data: Position, player=Depends(current_player)):
    # This is the saved camera location, not a character position or multiplayer presence stream.
    territories = await db.worlds.find({}, {'_id': 0}).limit(1000).to_list(1000)
    region = next((w for w in territories if inside_territory(data.x, data.y, w)), None)
    await db.players.update_one({'id': player['id']}, {'$set': {**data.model_dump(), 'last_seen': now()}})
    if region:
        await db.players.update_one({'id': player['id']}, {'$addToSet': {'discovered': region['id']}})
    return {'territory_id': region['id'] if region else None,
            'discovered': list(set(player.get('discovered', []) + ([region['id']] if region else [])))}


@router.post('/players/home', response_model=Player)
async def home(player=Depends(current_player)):
    updates = {'world_id': 'kingdom', **SPAWN}
    await db.players.update_one({'id': player['id']}, {'$set': updates})
    return Player(**{**player, **updates})


class Place(BaseModel):
    place_key: str = Field(min_length=3, max_length=120)
    name: str = Field(min_length=1, max_length=100)
    kind: str = Field(min_length=1, max_length=40)
    x: float = Field(ge=0, le=65536, allow_inf_nan=False)
    y: float = Field(ge=0, le=65536, allow_inf_nan=False)


@router.get('/places', response_model=list[Place])
async def saved_places(player=Depends(current_player)):
    return await db.places.find({'player_id': player['id']}, {'_id': 0}).limit(200).to_list(200)


@router.post('/places', response_model=Place)
async def save_place(data: Place, player=Depends(current_player)):
    if await db.places.count_documents({'player_id': player['id']}) >= 200:
        raise HTTPException(429, 'You can save up to 200 places.')
    await db.places.update_one({'player_id': player['id'], 'place_key': data.place_key}, {'$set': data.model_dump()}, upsert=True)
    return data


@router.delete('/places/{place_key}')
async def remove_place(place_key: str, player=Depends(current_player)):
    await db.places.delete_one({'player_id': player['id'], 'place_key': place_key})
    return {'removed': True}


class ChallengeRequest(BaseModel):
    wallet: str = Field(min_length=32, max_length=44)


class VerifyRequest(ChallengeRequest):
    nonce: str = Field(max_length=100)
    signature: str = Field(max_length=200)


@router.post('/auth/challenge')
async def challenge(data: ChallengeRequest, player=Depends(current_player)):
    validate_address(data.wallet)
    nonce = secrets.token_urlsafe(32)
    expires = now() + timedelta(minutes=5)
    message = f"Kingcom — verify your Solana wallet\nWallet: {data.wallet}\nNonce: {nonce}\nExpires: {expires.isoformat()}\nNo transaction or payment. This signature only verifies wallet ownership for community access."
    await db.challenges.insert_one({'nonce': nonce, 'wallet': data.wallet, 'player_id': player['id'], 'message': message, 'expires': expires})
    return {'nonce': nonce, 'message': message}


@router.post('/auth/verify', response_model=Player)
async def verify(data: VerifyRequest, player=Depends(current_player)):
    challenge = await db.challenges.find_one_and_delete({'nonce': data.nonce, 'wallet': data.wallet,
                      'player_id': player['id'], 'expires': {'$gt': now()}}, projection={'_id': 0})
    if not challenge:
        raise HTTPException(401, 'Signature request expired or already used. Please reconnect.')
    try:
        Ed25519PublicKey.from_public_bytes(base58.b58decode(data.wallet)).verify(
            base64.b64decode(data.signature, validate=True), challenge['message'].encode())
    except Exception:
        raise HTTPException(401, 'Wallet signature could not be verified.')
    await db.players.update_one({'id': player['id']}, {'$set': {'wallet': data.wallet}})
    return Player(**{**player, 'wallet': data.wallet})


@router.post('/auth/disconnect', response_model=Player)
async def disconnect(player=Depends(current_player)):
    await db.players.update_one({'id': player['id']}, {'$set': {'wallet': None, 'world_id': 'kingdom'}})
    return Player(**{**player, 'wallet': None, 'world_id': 'kingdom'})