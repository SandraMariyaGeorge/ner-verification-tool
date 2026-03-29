from fastapi import APIRouter, HTTPException, Query

from app.schemas.pattern_schema import (
	PatternApplyRequest,
	PatternDetectSampleRequest,
	PatternFixRequest,
	PatternIgnoreRequest,
	PatternMatchRequest,
)
from app.services.pattern_service import (
	apply_pattern_fix,
	apply_pattern_fix_to_tokens,
	detect_patterns,
	detect_patterns_in_sample_context,
	find_similar_patterns,
	ignore_pattern_suggestion,
)


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


@router.post("/patterns/detect-sample")
def patterns_detect_sample(payload: PatternDetectSampleRequest) -> dict:
	patterns = detect_patterns_in_sample_context(
		context=[item.model_dump() for item in payload.context],
		edited_tags=payload.edited_tags,
	)
	return {"items": patterns, "count": len(patterns)}


@router.post("/patterns/match")
def patterns_match(payload: PatternMatchRequest) -> dict:
	if len(payload.pattern) != 2:
		raise HTTPException(status_code=422, detail="pattern must contain exactly two tags")

	items = find_similar_patterns(
		project_id=payload.project_id,
		pattern=payload.pattern,
		target_index=payload.target_index,
		limit=payload.limit,
	)
	return {"items": items, "count": len(items)}


@router.post("/patterns/apply")
def patterns_apply(payload: PatternApplyRequest) -> dict:
	if not payload.token_ids:
		raise HTTPException(status_code=422, detail="token_ids are required")

	result = apply_pattern_fix_to_tokens(
		project_id=payload.project_id,
		token_ids=payload.token_ids,
		new_tag=payload.new_tag,
		pattern=payload.pattern,
		source_sample_token_id=payload.source_sample_token_id,
		verified_by=payload.verified_by,
	)

	if result["matched_count"] == 0:
		raise HTTPException(status_code=404, detail="No matching tokens found for apply")

	return {"message": "Pattern fix applied to selected tokens", **result}


@router.post("/patterns/ignore")
def patterns_ignore(payload: PatternIgnoreRequest) -> dict:
	result = ignore_pattern_suggestion(
		project_id=payload.project_id,
		pattern=payload.pattern,
		source_sample_token_id=payload.source_sample_token_id,
		reason=payload.reason,
		verified_by=payload.verified_by,
	)
	return {"message": "Pattern suggestion ignored", **result}
