from app.config.db import projects_col, tokens_col


def get_project_stats(project_id: str) -> dict:
	total = tokens_col.count_documents({"project_id": project_id})
	verified = tokens_col.count_documents({"project_id": project_id, "verification_status": "verified"})
	flagged = tokens_col.count_documents({"project_id": project_id, "verification_status": "flagged"})
	edited = tokens_col.count_documents(
		{
			"project_id": project_id,
			"$expr": {
				"$ne": [
					{"$ifNull": ["$tag", ""]},
					{"$ifNull": ["$original_tag", ""]},
				]
			},
		}
	)
	unverified = max(total - verified - flagged, 0)
	progress = (verified / total) * 100 if total else 0.0

	return {
		"project_id": project_id,
		"total": total,
		"verified": verified,
		"flagged": flagged,
		"edited": edited,
		"unverified": unverified,
		"progress": round(progress, 2),
	}


def sync_project_stats(project_id: str) -> dict:
	stats = get_project_stats(project_id)
	projects_col.update_one(
		{"_id": project_id},
		{
			"$set": {
				"total_tokens": stats["total"],
				"verified_tokens": stats["verified"],
				"flagged_tokens": stats["flagged"],
				"edited_tokens": stats["edited"],
				"progress": stats["progress"],
			}
		},
	)
	return stats
