import math
from fastapi import HTTPException
from geography import CENTER
from database import db


def hash_noise(x, y, seed=0):
    h = (int(x) * 374761393 + int(y) * 668265263 + (seed + 42069) * 1274126177) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return (h ^ (h >> 16)) / 4294967295


def noise(x, y, scale=2600):
    x, y = x / scale, y / scale
    ix, iy = math.floor(x), math.floor(y)
    fx, fy = x - ix, y - iy
    sx, sy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = hash_noise(ix, iy) * (1 - sx) + hash_noise(ix + 1, iy) * sx
    b = hash_noise(ix, iy + 1) * (1 - sx) + hash_noise(ix + 1, iy + 1) * sx
    return a * (1 - sy) + b * sy


def biome_at(x, y):
    dx, dy = x - CENTER, y - CENTER
    n = noise(x, y)
    coast = math.hypot(dx / 28500, dy / 30200) + n * .19
    if coast > 1.04: return 'ocean'
    if coast > 1: return 'beach'
    lake = math.hypot((dx - 8700) / 2000, (dy - 8500) / 2700)
    if lake < .82 + n * .2: return 'water'
    if lake < 1 + n * .14: return 'beach'
    river = CENTER + 12000 + math.sin(y / 2400) * 1650 + math.sin(y / 610) * 280
    if abs(x - river) < 125 + n * 65: return 'water'
    if abs(x - river) < 185 + n * 70: return 'beach'
    if math.hypot((dx + 8000) / 6300, (dy + 11000) / 5100) < .75 + n * .4: return 'mountain'
    if math.hypot((dx + 3500) / 8000, (dy - 17000) / 11500) < .80 + n * .38: return 'desert'
    if math.hypot((dx + 7800) / 6100, (dy - 600) / 8000) < .75 + n * .45 or n > .71: return 'forest'
    return 'grass'


async def check_land(x, y):
    # A coarse allocation lattice keeps independently claimed, organically shaped territories separated.
    x, y = math.floor(x / 2048) * 2048 + 1024, math.floor(y / 2048) * 2048 + 1024
    biome = biome_at(x, y)
    result = {'x': x, 'y': y, 'plot_key': f'{x // 2048}:{y // 2048}', 'biome': biome, 'available': True, 'reason': ''}
    def reject(reason): return {**result, 'available': False, 'reason': reason}
    if x < 1024 or y < 1024 or x > 64512 or y > 64512:
        return reject('Choose land within the current continent.')
    if math.hypot(x - CENTER, y - CENTER) < 2900:
        return reject('Kingcom capital is protected. Explore beyond the city to find unclaimed land.')
    if any(math.hypot(x-a, y-b)<1700 for a,b in [(CENTER-1600,CENTER+2800),(CENTER+3400,CENTER-3500)]):
        return reject('This district is already part of the public world.')
    if biome in ['water', 'ocean', 'mountain']:
        return reject('This area cannot host a territory. Look for open grassland, forest, beach, or desert.')
    if abs(y-(CENTER+590+math.sin((x-CENTER)/2400)*100))<650 or abs(x-(CENTER+1920+math.sin((y-CENTER)/2900)*160))<650:
        return reject('This land is reserved for the main highway. Choose a nearby area.')
    worlds = await db.worlds.find({}, {'_id': 0, 'center_x': 1, 'center_y': 1}).to_list(10000)
    if any(math.hypot(x-w['center_x'], y-w['center_y'])<1850 for w in worlds):
        return reject('An existing territory occupies this area. Explore a little farther.')
    # Reject shoreline-crossing footprints, not merely their center point.
    for dx, dy in [(-550,0),(550,0),(0,-550),(0,550)]:
        if biome_at(x+dx,y+dy) in ['ocean','water']:
            return reject('This plot crosses the water. Choose land farther from the shore.')
    return result