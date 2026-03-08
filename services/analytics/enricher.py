import logging
import os

logger = logging.getLogger(__name__)

# GeoIP reader — opened once at startup, stored as module-level singleton
_geo_reader = None


def init_geo_reader() -> None:
    """Open the GeoIP2 database reader once at startup."""
    global _geo_reader
    db_path = os.environ.get("GEOIP_DB_PATH", "/data/GeoLite2-City.mmdb")
    try:
        import geoip2.database
        _geo_reader = geoip2.database.Reader(db_path)
        logger.info("GeoIP2 reader opened from %s", db_path)
    except Exception as e:
        logger.warning("GeoIP2 reader could not be opened (%s): geo enrichment disabled", e)
        _geo_reader = None


def close_geo_reader() -> None:
    global _geo_reader
    if _geo_reader is not None:
        try:
            _geo_reader.close()
        except Exception:
            pass
        _geo_reader = None


def get_geo(ip: str) -> dict:
    """Return {'country': 'IN', 'city': 'Mumbai'} or {'country': None, 'city': None}."""
    if _geo_reader is None:
        return {"country": None, "city": None}
    try:
        response = _geo_reader.city(ip)
        return {
            "country": response.country.iso_code,
            "city": response.city.name,
        }
    except Exception:
        return {"country": None, "city": None}


# Known bot families from ua-parser
_BOT_FAMILIES = frozenset([
    "Googlebot", "Bingbot", "Slurp", "DuckDuckBot", "Baiduspider",
    "YandexBot", "Sogou", "Exabot", "facebot", "ia_archiver",
    "Applebot", "Twitterbot", "LinkedInBot", "AhrefsBot", "SemrushBot",
    "MJ12bot", "DotBot", "PetalBot", "DataForSeoBot", "Other",
])


def get_device(user_agent: str) -> str:
    """Return 'mobile' | 'tablet' | 'desktop' | 'bot'."""
    if not user_agent:
        return "desktop"
    try:
        from ua_parser import user_agent_parser
        parsed = user_agent_parser.Parse(user_agent)
        family = parsed.get("user_agent", {}).get("family", "")
        os_family = parsed.get("os", {}).get("family", "")
        device_family = parsed.get("device", {}).get("family", "")

        # Bot check
        if family in _BOT_FAMILIES or "bot" in family.lower() or "spider" in family.lower() or "crawler" in family.lower():
            return "bot"

        mobile_os = os_family in ("Android", "iOS")

        # Tablet: mobile OS + device family contains "tablet" or known tablet brands
        if mobile_os and ("tablet" in device_family.lower() or "iPad" in device_family):
            return "tablet"

        if mobile_os:
            return "mobile"

        return "desktop"
    except Exception:
        return "desktop"
