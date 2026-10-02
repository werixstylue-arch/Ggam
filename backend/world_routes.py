import asyncio
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo.errors import DuplicateKeyError
from pymongo import ReturnDocument
from database import db, now, current_player
from models import World, WorldCreate, GateConfig, TokenMetadata
from solana_service import metadata, verify_gate
from geography import territory_location
from land import check_land

router = APIRouter()
SEEDS = ['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
         'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
         '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
         'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN']


def make_world(meta, region, owner='kingcom', gate=None):
    return {**meta, 'id': str(uuid.uuid4()), 'name': f"{meta['symbol']} Territory", 'owner_id': owner,
            'region': region, 'citizens': 0, 'points': 0, 'min_holding': '0', 'gated_actions': [],
            'created_at': now().isoformat(), 'updated_at': now().isoformat(), **territory_location(region), **(gate or {})}


def enrich(world):
    return {**world, 'level': min(10, 1 + world.get('points', 0) // 100),
            'progress': world.get('points', 0) % 100 if world.get('points', 0) < 900 else 100}


async def get_world(world_id):
    world = await db.worlds.find_one({'id': world_id}, {'_id': 0})
    if not world:
        raise HTTPException(404, 'World not found.')
    return world


async def seed_worlds():
    # Preserve existing communities and progress while migrating their physical locations.
    existing = await db.worlds.find({}, {'_id': 0}).to_list(10000)
    for world in existing:
        if 'center_x' not in world:
            await db.worlds.update_one({'id': world['id']}, {'$set': {
                **territory_location(world['region']), 'name': f"{world['symbol']} Territory"}})
    async def seed(contract, index):
        if await db.worlds.find_one({'contract': contract}):
            return
        try:
            meta = await metadata(contract)
            await db.worlds.update_one({'contract': contract}, {'$setOnInsert': make_world(meta, index)}, upsert=True)
        except Exception as exc:
            import logging
            logging.warning('Community initialization deferred: %s', exc)
    await asyncio.gather(*(seed(contract, i) for i, contract in enumerate(SEEDS)))
    regions = await db.worlds.find({}, {'_id': 0, 'region': 1}).to_list(10000)
    await db.counters.update_one({'key': 'territory-region'}, {'$max': {'next_region': max((w['region'] for w in regions), default=-1) + 1}}, upsert=True)


@router.get('/world/config')
async def world_config():
    from geography import WORLD_SIZE, SPAWN
    return {'size': WORLD_SIZE, 'chunk_size': 512, 'seed': 42069, 'spawn': SPAWN,
            'name': 'Kingcom Continent', 'version': 2}


@router.get('/tokens/{contract}', response_model=TokenMetadata)
async def lookup_token(contract: str):
    token = await metadata(contract)
    existing = await db.worlds.find_one({'contract': contract}, {'_id': 0, 'id': 1})
    return {**token, 'existing_world': existing['id'] if existing else None}


@router.get('/land/check')
async def land_check(x: int = Query(ge=0, le=65536), y: int = Query(ge=0, le=65536)):
    return await check_land(x, y)


@router.get('/worlds', response_model=list[World])
async def list_worlds(q: str = Query('', max_length=100), sort: str = 'trending'):
    order = {'trending': 'citizens', 'active': 'points', 'new': 'created_at', 'updated': 'updated_at'}.get(sort, 'citizens')
    import re
    query = {'$or': [{'name': {'$regex': re.escape(q), '$options': 'i'}}, {'symbol': {'$regex': re.escape(q.lstrip('$')), '$options': 'i'}}, {'contract': q}]} if q else {}
    records = await db.worlds.find(query, {'_id': 0}).sort(order, -1).limit(200).to_list(200)
    return [enrich(w) for w in records]


@router.post('/worlds', response_model=World, status_code=201)
async def create_world(data: WorldCreate, player=Depends(current_player)):
    if await db.worlds.find_one({'contract': data.contract}):
        raise HTTPException(409, 'World already exists for this contract address.')
    if await db.worlds.count_documents({'owner_id': player['id']}) >= 10:
        raise HTTPException(429, 'You have reached the limit of 10 community worlds.')
    meta = await metadata(data.contract)
    if (data.plot_x is None) != (data.plot_y is None):
        raise HTTPException(422, 'Choose both coordinates for the territory.')
    plot = None
    if data.plot_x is not None:
        plot = await check_land(data.plot_x, data.plot_y)
        if not plot['available']:
            raise HTTPException(409, plot['reason'])
    counter = await db.counters.find_one_and_update({'key': 'territory-region'}, {'$inc': {'next_region': 1}},
                                                   return_document=ReturnDocument.AFTER, projection={'_id': 0})
    region = counter['next_region'] - 1
    if plot is None:
        for candidate in range(region, region + 200):
            location = territory_location(candidate)
            plot = await check_land(location['center_x'], location['center_y'])
            if plot['available']: break
        else:
            raise HTTPException(409, 'No suitable land found nearby. Select an empty location on the map.')
    record = make_world(meta, region, player['id'], {'min_holding': data.min_holding, 'gated_actions': data.gated_actions})
    record.update({'center_x': plot['x'], 'center_y': plot['y'], 'plot_key': plot['plot_key']})
    try:
        await db.worlds.insert_one(record.copy())
    except DuplicateKeyError:
        raise HTTPException(409, 'This token or land plot already has a territory. Refresh and choose another location.')
    return enrich(record)


@router.patch('/worlds/{world_id}/access', response_model=World)
async def update_access(world_id: str, data: GateConfig, player=Depends(current_player)):
    world = await get_world(world_id)
    if world['owner_id'] != player['id']:
        raise HTTPException(403, 'Only the world creator can change access requirements.')
    await db.worlds.update_one({'id': world_id}, {'$set': {**data.model_dump(), 'updated_at': now().isoformat()}})
    return enrich(await get_world(world_id))


@router.post('/worlds/{world_id}/enter', response_model=World)
async def enter_world(world_id: str, player=Depends(current_player)):
    world = await get_world(world_id)
    await verify_gate(world, player, 'enter')
    membership = await db.memberships.update_one({'player_id': player['id'], 'world_id': world_id},
                    {'$setOnInsert': {'joined_at': now().isoformat()}}, upsert=True)
    if membership.upserted_id:
        await db.worlds.update_one({'id': world_id}, {'$inc': {'citizens': 1}})
    await db.players.update_one({'id': player['id']}, {'$set': {'world_id': world_id}})
    await db.players.update_one({'id': player['id']}, {'$addToSet': {'discovered': world_id}})
    return enrich(await get_world(world_id))


@router.post('/worlds/{world_id}/contribute', response_model=World)
async def contribute(world_id: str, player=Depends(current_player)):
    world = await get_world(world_id)
    await verify_gate(world, player, 'enter')
    await verify_gate(world, player, 'contribute')
    if player.get('world_id') != world_id:
        raise HTTPException(400, 'Enter this world before contributing.')
    try:
        await db.contributions.insert_one({'player_id': player['id'], 'world_id': world_id, 'day': now().date().isoformat()})
    except DuplicateKeyError:
        raise HTTPException(409, 'Your contribution is in! Come back tomorrow to help again.')
    await db.worlds.update_one({'id': world_id}, {'$inc': {'points': 10}, '$set': {'updated_at': now().isoformat()}})
    return enrich(await get_world(world_id))


@router.get('/leaderboard')
async def leaderboard():
    records = await db.worlds.find({}, {'_id': 0, 'id': 1, 'name': 1, 'points': 1, 'citizens': 1, 'symbol': 1, 'logo': 1}).sort('points', -1).limit(20).to_list(20)
    return records