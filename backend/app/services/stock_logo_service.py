"""Optional Naver stock/ETF logos, independent of KIS quotes and orders."""
import asyncio
import re
from collections import OrderedDict
from time import monotonic
from urllib.parse import urlsplit

import httpx

_cache = OrderedDict()
_pending = {}
_slots = asyncio.Semaphore(4)
_MAX_CACHE = 4096


def _logo_url(payload, code):
    if not isinstance(payload, dict) or payload.get("itemCode") != code:
        return None
    # Use the actual response: ETF logos do not follow the stock filename pattern.
    for field in ("itemLogoPngUrl", "itemLogoUrl"):
        value = payload.get(field)
        if not isinstance(value, str):
            continue
        try:
            parsed = urlsplit(value)
            if (parsed.scheme == "https" and parsed.hostname == "ssl.pstatic.net"
                    and not parsed.username and not parsed.password
                    and parsed.port in (None, 443)
                    and parsed.path.startswith("/imgstock/")):
                return value
        except ValueError:
            continue
    return None


async def _load(code):
    logo = None
    try:
        async with _slots:
            async with httpx.AsyncClient(timeout=4.0) as client:
                response = await client.get(f"https://m.stock.naver.com/api/stock/{code}/basic")
                response.raise_for_status()
                logo = _logo_url(response.json(), code)
    except (httpx.HTTPError, ValueError):
        # Optional decoration must not break stock prices or the rest of the page.
        pass
    _cache[code] = (monotonic() + (86400 if logo else 300), logo)
    _cache.move_to_end(code)
    while len(_cache) > _MAX_CACHE:
        _cache.popitem(last=False)
    return logo


async def get_stock_logo(code: str):
    if not re.fullmatch(r"[0-9A-Z]{6}", code):
        return None
    cached = _cache.get(code)
    if cached and cached[0] > monotonic():
        _cache.move_to_end(code)
        return cached[1]
    task = _pending.get(code)
    if task is None:
        task = asyncio.create_task(_load(code))
        _pending[code] = task
        task.add_done_callback(lambda completed: _pending.pop(code, None))
    return await asyncio.shield(task)
