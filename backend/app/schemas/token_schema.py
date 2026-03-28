from pydantic import BaseModel, Field


class TokenUpdateRequest(BaseModel):
	word: str
	project_id: str
	sentence_id: str
	position: int = Field(ge=0)
	new_tag: str
