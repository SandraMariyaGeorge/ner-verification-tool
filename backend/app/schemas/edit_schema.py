from pydantic import BaseModel


class EntityBulkUpdateRequest(BaseModel):
	word: str
	new_tag: str
