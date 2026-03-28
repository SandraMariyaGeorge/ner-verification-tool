from fastapi import APIRouter, Query

from app.schemas.edit_schema import EntityBulkUpdateRequest
from app.services.entity_service import bulk_update, get_entity_occurrences


router = APIRouter(tags=["entity"])


@router.get("/entity")
def get_entity(project_id: str = Query(..., min_length=1), word: str = Query(..., min_length=1)) -> dict:
	items = get_entity_occurrences(word=word, project_id=project_id)
	return {"items": items, "count": len(items)}


@router.put("/entity/update")
def update_entity(payload: EntityBulkUpdateRequest) -> dict:
	result = bulk_update(
		word=payload.word,
		new_tag=payload.new_tag,
		project_id=payload.project_id,
	)
	return {"message": "Entity bulk update completed", **result}
