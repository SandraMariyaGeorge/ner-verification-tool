from pydantic import BaseModel, Field


class CreateProjectRequest(BaseModel):
	user_id: str
	name: str = Field(min_length=1)
	file_name: str | None = None


class ProjectListItem(BaseModel):
	id: str
	user_id: str
	name: str
	file_name: str | None = None
	total_tokens: int = 0
	total_sentences: int = 0
	status: str
	created_at: str
	updated_at: str
