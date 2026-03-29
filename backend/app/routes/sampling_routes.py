from fastapi import APIRouter, HTTPException, Query

from app.schemas.sampling_schema import SampleCorrectRequest, SampleFlagRequest, SampleWrongRequest
from app.schemas.token_schema import TokenUpdateRequest
from app.services.sampling_service import (
	flag_sample,
	get_preview,
	get_sample,
	mark_sample_correct,
	mark_sample_wrong,
	update_token_tag,
)


router = APIRouter(tags=["sampling"])


@router.get("/preview")
def preview(project_id: str = Query(..., min_length=1), limit: int = Query(default=50, ge=1, le=500000)) -> dict:
	items = get_preview(limit=limit, project_id=project_id)
	return {"items": items, "count": len(items)}


@router.get("/sample")
def sample(project_id: str = Query(..., min_length=1), size: int = Query(default=100, ge=1, le=5000)) -> dict:
	items = get_sample(size=size, project_id=project_id)
	return {"items": items, "count": len(items)}


@router.post("/sample/correct")
def sample_correct(payload: SampleCorrectRequest) -> dict:
	result = mark_sample_correct(
		project_id=payload.project_id,
		token_ids=payload.token_ids,
		updates=[item.model_dump() for item in payload.updates],
		verified_by=payload.verified_by,
	)
	return {"message": "Sample marked as correct", **result}


@router.post("/sample/wrong")
def sample_wrong(payload: SampleWrongRequest) -> dict:
	result = mark_sample_wrong(
		project_id=payload.project_id,
		updates=[item.model_dump() for item in payload.updates],
		verified_by=payload.verified_by,
	)
	return {"message": "Sample corrections applied", **result}


@router.post("/sample/flag")
def sample_flag(payload: SampleFlagRequest) -> dict:
	result = flag_sample(
		project_id=payload.project_id,
		token_ids=payload.token_ids,
		verified_by=payload.verified_by,
	)
	return {"message": "Sample flagged", **result}


@router.put("/update")
def update_token(payload: TokenUpdateRequest) -> dict:
	result = update_token_tag(
		sentence_id=payload.sentence_id,
		position=payload.position,
		new_tag=payload.new_tag,
		project_id=payload.project_id,
	)

	if result["matched_count"] == 0:
		raise HTTPException(status_code=404, detail="Token not found")

	return {"message": "Token updated", **result}
