from pydantic import BaseModel


class PatternFixRequest(BaseModel):
	target_token_id: str | None = None
	new_tag: str | None = None
	id: str | None = None
