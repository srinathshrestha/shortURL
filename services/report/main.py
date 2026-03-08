import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

import database
from handlers import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await database.init_pool()
    logger.info("Report service started")
    yield
    # Shutdown
    await database.close_pool()
    logger.info("Report service stopped")


app = FastAPI(title="LinkVerse Report Service", lifespan=lifespan)
app.include_router(router)
