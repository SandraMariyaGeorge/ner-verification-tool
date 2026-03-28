from pydantic import BaseModel


class UploadResponse(BaseModel):
	project_id: str
	token_count: int
	sentence_count: int
	skipped_lines: int
	message: str
