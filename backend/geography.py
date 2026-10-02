import math

WORLD_SIZE = 65536
CENTER = WORLD_SIZE // 2
SPAWN = {'x': CENTER, 'y': CENTER + 40}
INITIAL_TERRITORIES = [
    (CENTER + 4300, CENTER + 1800, 'BONK Borough', 'urban'),
    (CENTER - 4800, CENTER - 2700, 'WIF Outskirts', 'suburb'),
    (CENTER + 6400, CENTER + 6600, 'Popcat Coast', 'coastal'),
    (CENTER + 2200, CENTER - 7400, 'Jupiter Junction', 'industrial'),
]


def territory_location(region):
    if region < len(INITIAL_TERRITORIES):
        x, y, _, style = INITIAL_TERRITORIES[region]
    else:
        angle = region * 2.399963229728653
        radius = 3500 + math.sqrt(region) * 1900
        x, y = CENTER + round(math.cos(angle) * radius), CENTER + round(math.sin(angle) * radius)
        style = ['urban', 'suburb', 'industrial', 'meme'][region % 4]
    return {'center_x': x, 'center_y': y, 'style': style}


def inside_territory(x, y, world):
    # Irregular boundary shared with the browser, rather than a square parcel.
    dx, dy = x - world['center_x'], y - world['center_y']
    angle = math.atan2(dy, dx)
    radius = 510 + min(300, world.get('points', 0) * .25)
    edge = radius * (1 + .16 * math.sin(angle * 3 + world['region']) + .09 * math.cos(angle * 5))
    return math.hypot(dx, dy) < edge