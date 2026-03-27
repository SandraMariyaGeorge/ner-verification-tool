from pydantic import BaseModel


class UploadResponse(BaseModel):
	dataset_id: str
	token_count: int
	sentence_count: int
	skipped_lines: int
	message: str
