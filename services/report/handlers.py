import csv
import io
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from database import get_pool

router = APIRouter()
logger = logging.getLogger(__name__)


def _clamp_days(days: int) -> int:
    return max(1, min(90, days))


def _require_slug(slug: Optional[str]) -> str:
    if not slug:
        raise HTTPException(status_code=400, detail="slug query parameter is required")
    return slug


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/reports/summary")
async def summary(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT COUNT(*) AS total_clicks
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
        """,
        slug, str(days),
    )
    return {"slug": slug, "total_clicks": row["total_clicks"], "days": days}


@router.get("/reports/by-day")
async def by_day(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT DATE(clicked_at) AS day, COUNT(*) AS clicks
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY day
        ORDER BY day ASC
        """,
        slug, str(days),
    )
    return {"data": [{"day": str(r["day"]), "clicks": r["clicks"]} for r in rows]}


@router.get("/reports/by-country")
async def by_country(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT country, COUNT(*) AS clicks
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
          AND country IS NOT NULL
        GROUP BY country
        ORDER BY clicks DESC
        LIMIT 10
        """,
        slug, str(days),
    )
    return {"data": [{"country": r["country"], "clicks": r["clicks"]} for r in rows]}


@router.get("/reports/by-device")
async def by_device(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT device, COUNT(*) AS clicks
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY device
        ORDER BY clicks DESC
        """,
        slug, str(days),
    )
    return {"data": [{"device": r["device"], "clicks": r["clicks"]} for r in rows]}


@router.get("/reports/by-referrer")
async def by_referrer(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT COALESCE(NULLIF(referrer, ''), 'Direct') AS referrer, COUNT(*) AS clicks
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
        GROUP BY referrer
        ORDER BY clicks DESC
        LIMIT 10
        """,
        slug, str(days),
    )
    return {"data": [{"referrer": r["referrer"], "clicks": r["clicks"]} for r in rows]}


@router.get("/reports/export")
async def export(
    slug: Optional[str] = Query(default=None),
    days: int = Query(default=7),
):
    slug = _require_slug(slug)
    days = _clamp_days(days)
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT id, slug, ip::text, country, city, device, referrer, clicked_at
        FROM click_events
        WHERE slug = $1
          AND clicked_at >= NOW() - ($2 || ' days')::INTERVAL
        ORDER BY clicked_at DESC
        """,
        slug, str(days),
    )

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["id", "slug", "ip", "country", "city", "device", "referrer", "clicked_at"])
        for r in rows:
            writer.writerow([
                r["id"], r["slug"], r["ip"], r["country"], r["city"],
                r["device"], r["referrer"], r["clicked_at"].isoformat() if r["clicked_at"] else "",
            ])
        buf.seek(0)
        yield buf.read()

    filename = f"clicks_{slug}_{days}d.csv"
    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
