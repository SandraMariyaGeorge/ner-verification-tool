from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.config.db import projects_col
from app.schemas.project_schema import CreateProjectRequest


router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/create")
def create_project(payload: CreateProjectRequest) -> dict:
	now = datetime.now(timezone.utc).isoformat()
	project_id = f"project_{payload.user_id}_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
	project_doc = {
		"_id": project_id,
		"user_id": payload.user_id,
		"name": payload.name,
		"file_name": payload.file_name,
		"total_tokens": 0,
		"total_sentences": 0,
		"status": "created",
		"created_at": now,
		"updated_at": now,
	}

	projects_col.insert_one(project_doc)
	return {"project_id": project_id, "message": "Project created"}


@router.get("")
def list_projects(user_id: str = Query(..., min_length=1)) -> dict:
	items = list(
		projects_col.find({"user_id": user_id}).sort("created_at", -1)
	)
	for item in items:
		item["id"] = item.pop("_id")
	return {"items": items, "count": len(items)}


@router.get("/{project_id}")
def get_project(project_id: str) -> dict:
	project = projects_col.find_one({"_id": project_id})
	if not project:
		raise HTTPException(status_code=404, detail="Project not found")
	project["id"] = project.pop("_id")
	return project
