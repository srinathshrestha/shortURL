import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

import database
import enricher
from handlers import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.init_pool()
    enricher.init_geo_reader()
    logger.info("Analytics service started")
    yield
    # Shutdown
    enricher.close_geo_reader()
    await database.close_pool()
    logger.info("Analytics service stopped")


app = FastAPI(title="LinkVerse Analytics Service", lifespan=lifespan)
app.include_router(router)
