from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.territories import router as territory_router

app = FastAPI(title="ZS Territory Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(territory_router)

