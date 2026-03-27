from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.db import ensure_indexes
from app.core.settings import settings
from app.routes.entity_routes import router as entity_router
from app.routes.export_routes import router as export_router
from app.routes.pattern_routes import router as pattern_router
from app.routes.sampling_routes import router as sampling_router
from app.routes.upload_routes import router as upload_router


app = FastAPI(title="Malayalam NER Verification API", version="1.0.0")


@app.on_event("startup")
def init_indexes() -> None:
	try:
		ensure_indexes()
	except Exception as exc:
		# Keep API bootable even if Mongo is temporarily unavailable.
		print(f"[startup] MongoDB index initialization skipped: {exc}")

if settings.cors_origins_list == ["*"]:
	app.add_middleware(
		CORSMiddleware,
		allow_origins=["*"],
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)
else:
	app.add_middleware(
		CORSMiddleware,
		allow_origins=settings.cors_origins_list,
		allow_credentials=True,
		allow_methods=["*"],
		allow_headers=["*"],
	)


@app.get("/health")
def health() -> dict:
	return {"status": "ok"}


app.include_router(upload_router)
app.include_router(sampling_router)
app.include_router(entity_router)
app.include_router(pattern_router)
app.include_router(export_router)
