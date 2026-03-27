from fastapi import APIRouter, HTTPException

from app.core.settings import settings
from app.schemas.pattern_schema import PatternFixRequest
from app.services.pattern_service import apply_pattern_fix, detect_patterns


router = APIRouter(tags=["patterns"])


@router.get("/patterns/errors")
def patterns_errors() -> dict:
	items = detect_patterns(dataset_id=settings.default_dataset_id)
	return {"items": items, "count": len(items)}


@router.put("/patterns/fix")
def patterns_fix(payload: PatternFixRequest) -> dict:
	if not payload.target_token_id or not payload.new_tag:
		raise HTTPException(status_code=422, detail="target_token_id and new_tag are required")

	result = apply_pattern_fix(
		target_token_id=payload.target_token_id,
		new_tag=payload.new_tag,
		pattern_id=payload.id,
	)

	if result["matched_count"] == 0:
		raise HTTPException(status_code=404, detail="Pattern target token not found")

	return {"message": "Pattern fix applied", **result}
