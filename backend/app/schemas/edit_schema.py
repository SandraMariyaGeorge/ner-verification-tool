from pydantic import BaseModel


class EntityBulkUpdateRequest(BaseModel):
	project_id: str
	word: str
	new_tag: str
