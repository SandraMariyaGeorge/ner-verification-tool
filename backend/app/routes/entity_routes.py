from fastapi import APIRouter, Query

from app.core.settings import settings
from app.schemas.edit_schema import EntityBulkUpdateRequest
from app.services.entity_service import bulk_update, get_entity_occurrences


router = APIRouter(tags=["entity"])


@router.get("/entity")
def get_entity(word: str = Query(..., min_length=1)) -> dict:
	items = get_entity_occurrences(word=word, dataset_id=settings.default_dataset_id)
	return {"items": items, "count": len(items)}


@router.put("/entity/update")
def update_entity(payload: EntityBulkUpdateRequest) -> dict:
	result = bulk_update(
		word=payload.word,
		new_tag=payload.new_tag,
		dataset_id=settings.default_dataset_id,
	)
	return {"message": "Entity bulk update completed", **result}
