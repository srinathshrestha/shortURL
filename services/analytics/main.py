# Placeholder until 06-analytics-report-services.md
from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def root():
    return {"status": "Analytics service placeholder"}


@app.post("/events")
def events():
    return {"status": "Not implemented"}
