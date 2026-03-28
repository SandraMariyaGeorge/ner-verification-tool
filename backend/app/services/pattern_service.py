from bson import ObjectId

from app.config.db import patterns_col, sentences_col, tokens_col
from app.utils.bio_validator import detect_invalid_transition, split_tag
from app.utils.helpers import serialize_pattern


def detect_patterns(project_id: str) -> list[dict]:
	patterns_col.delete_many({"project_id": project_id})

	sentence_docs = sentences_col.find({"project_id": project_id}, {"_id": 1}).sort("sentence_index", 1)
	detected: list[dict] = []

	for sentence in sentence_docs:
		sid = sentence["_id"]
		tokens = list(
			tokens_col.find(
				{"project_id": project_id, "sentence_id": sid},
				{"_id": 1, "word": 1, "tag": 1, "position": 1},
			).sort("position", 1)
		)

		for idx in range(len(tokens) - 1):
			left = tokens[idx]
			right = tokens[idx + 1]
			invalid, suggested_right = detect_invalid_transition(left["tag"], right["tag"])

			if not invalid:
				continue

			pattern_doc = {
				"project_id": project_id,
				"sentence_id": sid,
				"left_position": left["position"],
				"left_token_id": left["_id"],
				"right_token_id": right["_id"],
				"sequence": [left["word"], right["word"]],
				"tags": [left["tag"], right["tag"]],
				"suggested_tags": [left["tag"], suggested_right],
				"status": "pending",
			}

			inserted = patterns_col.insert_one(pattern_doc)
			pattern_doc["_id"] = inserted.inserted_id
			detected.append(serialize_pattern(pattern_doc))

	return detected


def apply_pattern_fix(target_token_id: str, new_tag: str, project_id: str, pattern_id: str | None = None) -> dict:
	prefix, entity = split_tag(new_tag)

	result = tokens_col.update_one(
		{"_id": ObjectId(target_token_id), "project_id": project_id},
		{
			"$set": {
				"tag": new_tag,
				"tag_prefix": prefix,
				"entity_type": entity,
				"is_modified": True,
			}
		},
	)

	if pattern_id:
		patterns_col.update_one({"_id": ObjectId(pattern_id), "project_id": project_id}, {"$set": {"status": "resolved"}})

	return {"matched_count": result.matched_count, "modified_count": result.modified_count}
