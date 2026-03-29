from bson import ObjectId


def _stringify(value):
	return str(value) if isinstance(value, ObjectId) else value


def serialize_token(doc: dict) -> dict:
	return {
		"id": _stringify(doc.get("_id")),
		"project_id": doc.get("project_id"),
		"sentence_id": doc.get("sentence_id"),
		"sentence_index": doc.get("sentence_index"),
		"position": doc.get("position"),
		"word": doc.get("word"),
		"tag": doc.get("tag"),
		"original_tag": doc.get("original_tag"),
		"entity_type": doc.get("entity_type"),
		"tag_prefix": doc.get("tag_prefix"),
		"verification_status": doc.get("verification_status", "unverified"),
		"verified_by": doc.get("verified_by"),
		"verified_at": doc.get("verified_at"),
		"is_modified": doc.get("is_modified", False),
	}


def serialize_context(doc: dict) -> dict:
	return {
		"id": _stringify(doc.get("_id")),
		"position": doc.get("position"),
		"word": doc.get("word"),
		"tag": doc.get("tag"),
	}


def serialize_pattern(doc: dict) -> dict:
	suggested = doc.get("suggested_tags", [])
	new_tag = suggested[1] if len(suggested) > 1 else None
	return {
		"id": _stringify(doc.get("_id")),
		"project_id": doc.get("project_id"),
		"sentence_id": doc.get("sentence_id"),
		"left_position": doc.get("left_position"),
		"sequence": doc.get("sequence", []),
		"tags": doc.get("tags", []),
		"suggested": suggested,
		"status": doc.get("status", "pending"),
		"target_token_id": _stringify(doc.get("right_token_id")),
		"new_tag": new_tag,
	}
