import os
import base58
import httpx
from decimal import Decimal
from fastapi import HTTPException
from database import db, now


def validate_address(address):
    try:
        if len(base58.b58decode(address)) != 32:
            raise ValueError()
    except Exception:
        raise HTTPException(400, 'Enter a valid Solana token contract address.')


async def rpc(method, params):
    try:
        async with httpx.AsyncClient(timeout=18) as client:
            response = await client.post(os.environ['SOLANA_RPC_URL'], json={
                'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params})
            response.raise_for_status()
            data = response.json()
            if 'error' in data:
                raise ValueError('RPC unavailable')
            return data['result']
    except (httpx.HTTPError, ValueError, KeyError):
        raise HTTPException(503, 'Solana is busy. Your access has not been verified. Please try again shortly.')


def safe_url(value):
    return value if isinstance(value, str) and value.startswith('https://') else ''


async def metadata(contract):
    validate_address(contract)
    cached = await db.token_cache.find_one({'contract': contract}, {'_id': 0})
    if cached:
        return {k: v for k, v in cached.items() if k != 'cached_at'}
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(f"{os.environ['DEXSCREENER_API_URL']}/token-pairs/v1/solana/{contract}")
            response.raise_for_status()
            pairs = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, 'Token discovery is temporarily unavailable. Please try again.')
    pairs = [p for p in pairs if p.get('chainId') == 'solana' and p.get('baseToken', {}).get('address') == contract]
    if not pairs:
        raise HTTPException(404, 'Token not found on Solana. Only tokens indexed by DexScreener are available right now.')
    pair = max(pairs, key=lambda p: (p.get('liquidity') or {}).get('usd', 0))
    info = pair.get('info') or {}
    token = pair['baseToken']
    record = {'contract': contract, 'name': token['name'][:100], 'symbol': token['symbol'].lstrip('$')[:20].upper(),
              'logo': safe_url(info.get('imageUrl')), 'description': info.get('description', '')[:1000],
              'website': next((safe_url(w.get('url')) for w in info.get('websites', []) if safe_url(w.get('url'))), ''),
              'twitter': next((safe_url(w.get('url')) for w in info.get('socials', []) if w.get('type') == 'twitter'), ''),
              'chain': 'Solana'}
    await db.token_cache.update_one({'contract': contract}, {'$set': {**record, 'cached_at': now().isoformat()}}, upsert=True)
    return record


async def verify_gate(world, player, action):
    required = Decimal(world['min_holding'])
    if required == 0 or action not in world['gated_actions']:
        return {'eligible': True, 'balance': None, 'required': str(required)}
    if not player.get('wallet'):
        raise HTTPException(403, 'Connect Phantom to verify your token holdings.')
    # Mint-filtered RPC supports both standard SPL and Token-2022 accounts.
    result = await rpc('getTokenAccountsByOwner', [player['wallet'], {'mint': world['contract']},
                 {'encoding': 'jsonParsed', 'commitment': 'finalized'}])
    total = Decimal(0)
    for account in result['value']:
        info = account['account']['data']['parsed']['info']
        if info['mint'] == world['contract']:
            amount = info['tokenAmount']
            total += Decimal(amount['amount']) / (Decimal(10) ** int(amount['decimals']))
    if total < required:
        raise HTTPException(403, f"You hold {total:f} ${world['symbol']}. This action requires {required:f} ${world['symbol']}.")
    return {'eligible': True, 'balance': format(total, 'f'), 'required': str(required)}