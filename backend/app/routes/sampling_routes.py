from fastapi import APIRouter, HTTPException, Query

from app.core.settings import settings
from app.schemas.token_schema import TokenUpdateRequest
from app.services.sampling_service import get_preview, get_sample, update_token_tag


router = APIRouter(tags=["sampling"])


@router.get("/preview")
def preview(limit: int = Query(default=50, ge=1, le=1000)) -> dict:
	items = get_preview(limit=limit, dataset_id=settings.default_dataset_id)
	return {"items": items, "count": len(items)}


@router.get("/sample")
def sample(size: int = Query(default=100, ge=1, le=5000)) -> dict:
	items = get_sample(size=size, dataset_id=settings.default_dataset_id)
	return {"items": items, "count": len(items)}


@router.put("/update")
def update_token(payload: TokenUpdateRequest) -> dict:
	result = update_token_tag(
		sentence_id=payload.sentence_id,
		position=payload.position,
		new_tag=payload.new_tag,
		dataset_id=settings.default_dataset_id,
	)

	if result["matched_count"] == 0:
		raise HTTPException(status_code=404, detail="Token not found")

	return {"message": "Token updated", **result}
