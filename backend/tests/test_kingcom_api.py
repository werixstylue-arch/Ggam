import base64
import os
from concurrent.futures import ThreadPoolExecutor

import pytest
import requests
from base58 import b58encode
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from dotenv import dotenv_values
from pymongo import MongoClient


# Kingcom API regression: guest auth, profile/name-only, camera position, places, land checks, territory creation, gate controls.
FRONTEND_ENV = dotenv_values('/app/frontend/.env')
BACKEND_ENV = dotenv_values('/app/backend/.env')
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL') or FRONTEND_ENV.get('REACT_APP_BACKEND_URL')


def _clean(value: str | None) -> str:
    if not value:
        return ''
    return value.strip().strip('"').strip("'")


@pytest.fixture(scope='session')
def api_base():
    if not BASE_URL:
        pytest.skip('REACT_APP_BACKEND_URL missing; cannot run API tests.')
    return f"{BASE_URL.rstrip('/')}/api"


@pytest.fixture(scope='session')
def cleanup_state():
    state = {'player_ids': set(), 'world_ids': set(), 'contracts': set()}
    yield state

    mongo_url = _clean(os.environ.get('MONGO_URL') or BACKEND_ENV.get('MONGO_URL'))
    db_name = _clean(os.environ.get('DB_NAME') or BACKEND_ENV.get('DB_NAME'))
    if not mongo_url or not db_name:
        return

    client = MongoClient(mongo_url)
    db = client[db_name]
    if state['world_ids']:
        ids = list(state['world_ids'])
        db.memberships.delete_many({'world_id': {'$in': ids}})
        db.contributions.delete_many({'world_id': {'$in': ids}})
        db.worlds.delete_many({'id': {'$in': ids}})
    if state['contracts']:
        db.worlds.delete_many({'contract': {'$in': list(state['contracts'])}})
    if state['player_ids']:
        ids = list(state['player_ids'])
        db.memberships.delete_many({'player_id': {'$in': ids}})
        db.contributions.delete_many({'player_id': {'$in': ids}})
        db.challenges.delete_many({'player_id': {'$in': ids}})
        db.places.delete_many({'player_id': {'$in': ids}})
        db.players.delete_many({'id': {'$in': ids}})
    client.close()


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({'Content-Type': 'application/json'})
    return session


@pytest.fixture(scope='session')
def contract_candidates():
    return [
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'Es9vMFrzaCERmJfrF4H2FYDutYfCeL6xvM2qYfYx5xg',
        '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E',
        'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
        'orcaEKTdKb5X8JqL3DfpnnXg4M3Vf7S8y2vXxG1sQwH',
        '7dHbWXmci3dT8UF6Q2iCNhTQfPghhoM5f7Q4f8RvvhPc',
        '4k3Dyjzvzp8eMZWUXbQ4nA6i7Vv4nP4rQ8Lx2Fx53Rjg',
        '5h3PzQnB8fQ8j5rE4LxJvDk5m8q3h4G7m9n2v5x7y8z1',
        'J1toso1uCk39jbC6sJq68LJ4YFj8fU8fM6x7hN6fJfQ',
        'AUroryaQ6Q6nM2GfM9jF6L4w8pP3zvM2kQ8rN7dS6sU',
        'HzkQfQ7eV2xV8mL9rB2fC4dE6tY8uI3oP5aS7dF9gH1',
        '3NZ9JMVBmYqgQ7nM2Vf6A9bP6Q8fM4jK9rT2wE5yU7i',
        'C98A7Y8Q3wD6vF1mN4bH7jK2pL5sT8uW3xZ6cV9nB2m',
    ]


def auth_headers(token: str):
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}


def create_guest(api_base, cleanup_state):
    response = requests.post(f'{api_base}/players/guest', timeout=30)
    assert response.status_code == 200
    payload = response.json()
    cleanup_state['player_ids'].add(payload['player']['id'])
    return payload


def find_creatable_tokens(api_base, candidates, count=1):
    found = []
    for contract in candidates:
        r = requests.get(f'{api_base}/tokens/{contract}', timeout=40)
        if r.status_code != 200:
            continue
        data = r.json()
        if not data.get('existing_world'):
            found.append(data)
        if len(found) >= count:
            break
    return found


def find_available_plot(api_base):
    probes = [
        (12000, 12000),
        (16000, 24000),
        (22000, 15000),
        (25000, 26000),
        (42000, 18000),
        (47000, 25000),
        (51000, 34000),
        (56000, 42000),
    ]
    for x, y in probes:
        check = requests.get(f'{api_base}/land/check', params={'x': x, 'y': y}, timeout=20)
        if check.status_code != 200:
            continue
        payload = check.json()
        if payload.get('available'):
            return payload
    pytest.skip('Could not find an available land cell from regression probe list.')


def test_health_and_world_config(api_client, api_base):
    health = api_client.get(f'{api_base}/health', timeout=20)
    assert health.status_code == 200
    health_data = health.json()
    assert health_data['status'] == 'ok'
    assert health_data['name'] == 'Kingcom'

    config = api_client.get(f'{api_base}/world/config', timeout=20)
    assert config.status_code == 200
    cfg = config.json()
    assert cfg['size'] == 65536
    assert cfg['chunk_size'] == 512
    assert cfg['spawn']['x'] == 32768


def test_guest_profile_name_only_and_position_shape(api_base, cleanup_state):
    guest = create_guest(api_base, cleanup_state)
    token = guest['token']

    me = requests.get(f'{api_base}/players/me', headers=auth_headers(token), timeout=20)
    assert me.status_code == 200
    me_data = me.json()
    assert me_data['name'] == 'Visitor'
    assert 'hair' not in me_data and 'outfit' not in me_data and 'accessory' not in me_data

    patch = requests.patch(f'{api_base}/players/me', headers=auth_headers(token), json={'name': 'TEST WASD Name'}, timeout=20)
    assert patch.status_code == 200
    assert patch.json()['name'] == 'TEST WASD Name'

    save_position = requests.post(
        f'{api_base}/players/position',
        headers=auth_headers(token),
        json={'x': 40123, 'y': 28976},
        timeout=20,
    )
    assert save_position.status_code == 200
    payload = save_position.json()
    assert 'players' not in payload
    assert isinstance(payload.get('discovered'), list)


def test_places_crud_persistence_and_guest_isolation(api_base, cleanup_state):
    user_a = create_guest(api_base, cleanup_state)
    user_b = create_guest(api_base, cleanup_state)
    token_a = user_a['token']
    token_b = user_b['token']

    place = {
        'place_key': 'TEST_hq:32768:32633',
        'name': 'Kingcom HQ',
        'kind': 'hq',
        'x': 32768,
        'y': 32633,
    }
    saved = requests.post(f'{api_base}/places', headers=auth_headers(token_a), json=place, timeout=20)
    assert saved.status_code == 200
    assert saved.json()['place_key'] == place['place_key']

    list_a = requests.get(f'{api_base}/places', headers=auth_headers(token_a), timeout=20)
    assert list_a.status_code == 200
    keys_a = [p['place_key'] for p in list_a.json()]
    assert place['place_key'] in keys_a

    list_b = requests.get(f'{api_base}/places', headers=auth_headers(token_b), timeout=20)
    assert list_b.status_code == 200
    keys_b = [p['place_key'] for p in list_b.json()]
    assert place['place_key'] not in keys_b

    removed = requests.delete(f"{api_base}/places/{place['place_key']}", headers=auth_headers(token_a), timeout=20)
    assert removed.status_code == 200

    list_after = requests.get(f'{api_base}/places', headers=auth_headers(token_a), timeout=20)
    assert list_after.status_code == 200
    assert place['place_key'] not in [p['place_key'] for p in list_after.json()]


def test_land_check_snaps_and_rejects_reserved_areas(api_base):
    snapped = requests.get(f'{api_base}/land/check', params={'x': 12111, 'y': 15777}, timeout=20)
    assert snapped.status_code == 200
    land = snapped.json()
    assert land['x'] % 2048 == 1024
    assert land['y'] % 2048 == 1024
    assert isinstance(land['plot_key'], str)

    capital = requests.get(f'{api_base}/land/check', params={'x': 32768, 'y': 32768}, timeout=20)
    assert capital.status_code == 200
    assert capital.json()['available'] is False


def test_bonk_lookup_existing_and_invalid_contract(api_client, api_base):
    bonk = api_client.get(f'{api_base}/tokens/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', timeout=40)
    assert bonk.status_code == 200
    bonk_data = bonk.json()
    assert bonk_data['symbol']
    assert bonk_data['existing_world']

    invalid = api_client.get(f'{api_base}/tokens/not-a-solana-address', timeout=20)
    assert invalid.status_code == 400


def test_legacy_collectibles_endpoint_not_available(api_client, api_base):
    legacy = api_client.get(f'{api_base}/collectibles', timeout=20)
    assert legacy.status_code == 404


def test_create_world_with_selected_plot_and_same_plot_conflict(api_base, cleanup_state, contract_candidates):
    owner = create_guest(api_base, cleanup_state)
    tokens = find_creatable_tokens(api_base, contract_candidates, count=2)
    if len(tokens) < 2:
        pytest.skip('Need two creatable contracts to validate same-plot conflict behavior.')
    plot = find_available_plot(api_base)

    first_contract = tokens[0]['contract']
    second_contract = tokens[1]['contract']
    cleanup_state['contracts'].update([first_contract, second_contract])

    created = requests.post(
        f'{api_base}/worlds',
        headers=auth_headers(owner['token']),
        json={
            'contract': first_contract,
            'min_holding': '0',
            'gated_actions': ['enter', 'contribute'],
            'plot_x': plot['x'],
            'plot_y': plot['y'],
        },
        timeout=60,
    )
    assert created.status_code == 201
    world = created.json()
    cleanup_state['world_ids'].add(world['id'])
    assert world['center_x'] == plot['x']
    assert world['center_y'] == plot['y']

    conflict = requests.post(
        f'{api_base}/worlds',
        headers=auth_headers(owner['token']),
        json={
            'contract': second_contract,
            'min_holding': '0',
            'gated_actions': ['enter', 'contribute'],
            'plot_x': plot['x'],
            'plot_y': plot['y'],
        },
        timeout=60,
    )
    assert conflict.status_code == 409


def test_create_world_duplicate_contract_and_race_atomic(api_base, cleanup_state, contract_candidates):
    owner = create_guest(api_base, cleanup_state)
    token_data = find_creatable_tokens(api_base, contract_candidates, count=1)
    if not token_data:
        pytest.skip('No creatable token available for duplicate-contract race check.')
    contract = token_data[0]['contract']
    cleanup_state['contracts'].add(contract)

    def create_call():
        return requests.post(
            f'{api_base}/worlds',
            headers=auth_headers(owner['token']),
            json={'contract': contract, 'min_holding': '0', 'gated_actions': ['enter', 'contribute']},
            timeout=60,
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = [future.result() for future in [executor.submit(create_call), executor.submit(create_call)]]

    codes = sorted([r.status_code for r in responses])
    assert codes == [201, 409]
    created = next(r.json() for r in responses if r.status_code == 201)
    cleanup_state['world_ids'].add(created['id'])
    assert created['contract'] == contract


def test_auto_assigned_plot_and_gated_enter_behavior(api_base, cleanup_state, contract_candidates):
    owner = create_guest(api_base, cleanup_state)
    visitor = create_guest(api_base, cleanup_state)
    token_data = find_creatable_tokens(api_base, contract_candidates, count=1)
    if not token_data:
        pytest.skip('No creatable token available for auto-assigned plot and gate checks.')
    contract = token_data[0]['contract']
    cleanup_state['contracts'].add(contract)

    created = requests.post(
        f'{api_base}/worlds',
        headers=auth_headers(owner['token']),
        json={'contract': contract, 'min_holding': '1', 'gated_actions': ['enter', 'contribute']},
        timeout=60,
    )
    if created.status_code == 409:
        pytest.skip('Token became non-creatable during test run.')
    assert created.status_code == 201
    world = created.json()
    cleanup_state['world_ids'].add(world['id'])
    assert isinstance(world['center_x'], (int, float))
    assert isinstance(world['center_y'], (int, float))

    world_list = requests.get(f'{api_base}/worlds', timeout=20)
    assert world_list.status_code == 200
    assert any(w['id'] == world['id'] for w in world_list.json())

    denied = requests.post(f"{api_base}/worlds/{world['id']}/enter", headers=auth_headers(visitor['token']), timeout=30)
    assert denied.status_code in (403, 503)


def test_contribution_daily_limit_and_owner_only_access_edit(api_base, cleanup_state, contract_candidates):
    owner = create_guest(api_base, cleanup_state)
    traveler = create_guest(api_base, cleanup_state)
    token_data = find_creatable_tokens(api_base, contract_candidates, count=1)
    if not token_data:
        pytest.skip('No creatable token available for contribution/access test.')
    contract = token_data[0]['contract']
    cleanup_state['contracts'].add(contract)

    created = requests.post(
        f'{api_base}/worlds',
        headers=auth_headers(owner['token']),
        json={'contract': contract, 'min_holding': '0', 'gated_actions': ['enter', 'contribute']},
        timeout=60,
    )
    if created.status_code == 409:
        pytest.skip('Token became non-creatable during test run.')
    assert created.status_code == 201
    world = created.json()
    cleanup_state['world_ids'].add(world['id'])

    not_member = requests.post(f"{api_base}/worlds/{world['id']}/contribute", headers=auth_headers(traveler['token']), timeout=20)
    assert not_member.status_code == 400

    enter = requests.post(f"{api_base}/worlds/{world['id']}/enter", headers=auth_headers(traveler['token']), timeout=20)
    assert enter.status_code == 200

    contribute_1 = requests.post(f"{api_base}/worlds/{world['id']}/contribute", headers=auth_headers(traveler['token']), timeout=20)
    assert contribute_1.status_code == 200

    contribute_2 = requests.post(f"{api_base}/worlds/{world['id']}/contribute", headers=auth_headers(traveler['token']), timeout=20)
    assert contribute_2.status_code == 409

    owner_edit = requests.patch(
        f"{api_base}/worlds/{world['id']}/access",
        headers=auth_headers(owner['token']),
        json={'min_holding': '2.5', 'gated_actions': ['enter']},
        timeout=20,
    )
    assert owner_edit.status_code == 200
    assert owner_edit.json()['min_holding'] == '2.5'

    non_owner_edit = requests.patch(
        f"{api_base}/worlds/{world['id']}/access",
        headers=auth_headers(traveler['token']),
        json={'min_holding': '0', 'gated_actions': ['enter', 'contribute']},
        timeout=20,
    )
    assert non_owner_edit.status_code == 403


def test_challenge_verify_signature_and_replay_protection(api_base, cleanup_state):
    guest = create_guest(api_base, cleanup_state)
    token = guest['token']

    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key().public_bytes_raw()
    wallet = b58encode(public_key).decode('utf-8')

    challenge = requests.post(
        f'{api_base}/auth/challenge',
        headers=auth_headers(token),
        json={'wallet': wallet},
        timeout=20,
    )
    assert challenge.status_code == 200
    payload = challenge.json()

    signature = private_key.sign(payload['message'].encode('utf-8'))
    signature_b64 = base64.b64encode(signature).decode('utf-8')

    verify_ok = requests.post(
        f'{api_base}/auth/verify',
        headers=auth_headers(token),
        json={'wallet': wallet, 'nonce': payload['nonce'], 'signature': signature_b64},
        timeout=20,
    )
    assert verify_ok.status_code == 200
    assert verify_ok.json()['wallet'] == wallet

    replay = requests.post(
        f'{api_base}/auth/verify',
        headers=auth_headers(token),
        json={'wallet': wallet, 'nonce': payload['nonce'], 'signature': signature_b64},
        timeout=20,
    )
    assert replay.status_code == 401

    challenge_2 = requests.post(
        f'{api_base}/auth/challenge',
        headers=auth_headers(token),
        json={'wallet': wallet},
        timeout=20,
    )
    assert challenge_2.status_code == 200

    bad_signature = base64.b64encode(b'not-valid-signature').decode('utf-8')
    verify_bad = requests.post(
        f'{api_base}/auth/verify',
        headers=auth_headers(token),
        json={'wallet': wallet, 'nonce': challenge_2.json()['nonce'], 'signature': bad_signature},
        timeout=20,
    )
    assert verify_bad.status_code == 401
