import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from database import get_pool
from enricher import get_geo, get_device
from models import ClickEventRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/events", status_code=202)
async def ingest_event(event: ClickEventRequest):
    """Receive a raw click event, enrich it with geo + device info, and persist it."""
    geo = get_geo(event.ip)
    device = get_device(event.user_agent)

    try:
        pool = get_pool()
        await pool.execute(
            """
            INSERT INTO click_events (slug, ip, country, city, device, referrer, clicked_at)
            VALUES ($1, $2::inet, $3, $4, $5, $6, $7)
            """,
            event.slug,
            event.ip,
            geo["country"],
            geo["city"],
            device,
            event.referrer or None,
            event.timestamp,
        )
    except Exception as exc:
        # Fire-and-forget: log the error but always return 202 to the caller
        logger.error("Failed to insert click_event for slug=%s: %s", event.slug, exc)

    return {"status": "queued"}
