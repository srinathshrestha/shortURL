from pydantic import BaseModel
from datetime import datetime


class ClickEventRequest(BaseModel):
    slug: str
    ip: str
    user_agent: str = ""
    referrer: str = ""
    timestamp: datetime


class HealthResponse(BaseModel):
    status: str
