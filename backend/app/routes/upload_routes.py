from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.settings import settings
from app.schemas.dataset_schema import UploadResponse
from app.services.parser_service import parse_and_store


router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(file: UploadFile = File(...)) -> UploadResponse:
	raw = await file.read()
	try:
		content = raw.decode("utf-8-sig")
	except UnicodeDecodeError as exc:
		raise HTTPException(status_code=400, detail="File must be UTF-8 encoded") from exc

	stats = parse_and_store(content.splitlines(), settings.default_dataset_id)
	return UploadResponse(
		dataset_id=stats["dataset_id"],
		token_count=stats["token_count"],
		sentence_count=stats["sentence_count"],
		skipped_lines=stats["skipped_lines"],
		message="Dataset uploaded and parsed successfully",
	)
