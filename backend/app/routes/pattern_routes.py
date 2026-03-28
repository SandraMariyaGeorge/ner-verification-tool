from fastapi import APIRouter, HTTPException, Query

from app.schemas.pattern_schema import PatternFixRequest
from app.services.pattern_service import apply_pattern_fix, detect_patterns


router = APIRouter(tags=["patterns"])


@router.get("/patterns/errors")
def patterns_errors(project_id: str = Query(..., min_length=1)) -> dict:
	items = detect_patterns(project_id=project_id)
	return {"items": items, "count": len(items)}


@router.put("/patterns/fix")
def patterns_fix(payload: PatternFixRequest) -> dict:
	if not payload.target_token_id or not payload.new_tag:
		raise HTTPException(status_code=422, detail="target_token_id and new_tag are required")

	result = apply_pattern_fix(
		target_token_id=payload.target_token_id,
		new_tag=payload.new_tag,
		project_id=payload.project_id,
		pattern_id=payload.id,
	)

	if result["matched_count"] == 0:
		raise HTTPException(status_code=404, detail="Pattern target token not found")

	return {"message": "Pattern fix applied", **result}
