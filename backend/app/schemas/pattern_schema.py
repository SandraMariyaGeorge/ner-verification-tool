from pydantic import BaseModel, Field


class PatternFixRequest(BaseModel):
	project_id: str
	target_token_id: str | None = None
	new_tag: str | None = None
	id: str | None = None


class PatternContextToken(BaseModel):
	id: str | None = None
	word: str
	tag: str
	position: int | None = None
	sentence_id: str | None = None


class PatternDetectSampleRequest(BaseModel):
	project_id: str
	sample_token_id: str | None = None
	context: list[PatternContextToken] = Field(default_factory=list)
	edited_tags: dict[str, str] = Field(default_factory=dict)


class PatternMatchRequest(BaseModel):
	project_id: str
	pattern: list[str] = Field(default_factory=list)
	target_index: int = Field(default=1, ge=0, le=1)
	limit: int = Field(default=5000, ge=1, le=100000)


class PatternApplyRequest(BaseModel):
	project_id: str
	token_ids: list[str] = Field(default_factory=list)
	new_tag: str
	pattern: list[str] = Field(default_factory=list)
	source_sample_token_id: str | None = None
	verified_by: str | None = None


class PatternIgnoreRequest(BaseModel):
	project_id: str
	pattern: list[str] = Field(default_factory=list)
	source_sample_token_id: str | None = None
	reason: str | None = None
	verified_by: str | None = None
