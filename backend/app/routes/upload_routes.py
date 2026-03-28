from datetime import datetime, timezone

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config.db import projects_col
from app.schemas.dataset_schema import UploadResponse
from app.services.parser_service import parse_and_store


router = APIRouter(tags=["upload"])


@router.post("/upload", response_model=UploadResponse)
async def upload_dataset(project_id: str = Form(...), file: UploadFile = File(...)) -> UploadResponse:
	raw = await file.read()
	try:
		content = raw.decode("utf-8-sig")
	except UnicodeDecodeError as exc:
		raise HTTPException(status_code=400, detail="File must be UTF-8 encoded") from exc

	project = projects_col.find_one({"_id": project_id})
	if not project:
		raise HTTPException(status_code=404, detail="Project not found")

	stats = parse_and_store(content.splitlines(), project_id)

	now = datetime.now(timezone.utc).isoformat()
	projects_col.update_one(
		{"_id": project_id},
		{
			"$set": {
				"file_name": file.filename,
				"total_tokens": stats["token_count"],
				"total_sentences": stats["sentence_count"],
				"status": "processed",
				"updated_at": now,
			}
		},
	)

	return UploadResponse(
		project_id=stats["project_id"],
		token_count=stats["token_count"],
		sentence_count=stats["sentence_count"],
		skipped_lines=stats["skipped_lines"],
		message="Dataset uploaded and parsed successfully",
	)
