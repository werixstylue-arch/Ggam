import asyncio
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import db, client
from player_routes import router as players
from world_routes import router as worlds, seed_worlds


@asynccontextmanager
async def lifespan(app):
    await db.worlds.create_index('contract', unique=True)
    await db.worlds.create_index('plot_key', unique=True, partialFilterExpression={'plot_key': {'$exists': True}})
    await db.places.create_index([('player_id', 1), ('place_key', 1)], unique=True)
    await db.players.create_index('token_hash', unique=True)
    await db.memberships.create_index([('player_id', 1), ('world_id', 1)], unique=True)
    await db.contributions.create_index([('player_id', 1), ('world_id', 1), ('day', 1)], unique=True)
    await db.challenges.create_index('expires', expireAfterSeconds=0)
    await seed_worlds()
    yield
    client.close()


app = FastAPI(title='Kingcom', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.environ['CORS_ORIGINS'].split(','),
                   allow_credentials=False, allow_methods=['GET', 'POST', 'PATCH', 'DELETE'], allow_headers=['*'])
app.include_router(players, prefix='/api')
app.include_router(worlds, prefix='/api')


@app.get('/api/health')
async def health():
    await db.command('ping')
    return {'status': 'ok', 'name': 'Kingcom'}

logging.basicConfig(level=logging.INFO)