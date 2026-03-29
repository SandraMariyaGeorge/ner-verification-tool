from pydantic import BaseModel, Field


class SampleTagUpdate(BaseModel):
	id: str
	new_tag: str


class SampleCorrectRequest(BaseModel):
	project_id: str
	verified_by: str | None = None
	token_ids: list[str] = Field(default_factory=list)
	updates: list[SampleTagUpdate] = Field(default_factory=list)


class SampleWrongRequest(BaseModel):
	project_id: str
	verified_by: str | None = None
	updates: list[SampleTagUpdate] = Field(default_factory=list)


class SampleFlagRequest(BaseModel):
	project_id: str
	verified_by: str | None = None
	token_ids: list[str] = Field(default_factory=list)
