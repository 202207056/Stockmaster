"""Run only the news API locally, without database or trading credentials.

uvicorn app.news_preview:app --host 127.0.0.1 --port 8001
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.news import router

app = FastAPI(title="Local news preview")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["Content-Type", "Authorization"],
)
app.include_router(router, prefix="/api/news")
