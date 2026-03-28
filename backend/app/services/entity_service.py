from app.config.db import tokens_col
from app.services.sampling_service import _context_for_token
from app.utils.bio_validator import split_tag
from app.utils.helpers import serialize_token


def get_entity_occurrences(word: str, project_id: str) -> list[dict]:
	docs = tokens_col.find(
		{"project_id": project_id, "word": word},
		{
			"_id": 1,
			"project_id": 1,
			"sentence_id": 1,
			"sentence_index": 1,
			"position": 1,
			"word": 1,
			"tag": 1,
			"original_tag": 1,
			"entity_type": 1,
			"tag_prefix": 1,
			"is_modified": 1,
		},
	).sort([("sentence_index", 1), ("position", 1)])

	items = []
	for doc in docs:
		token = serialize_token(doc)
		token["context"] = _context_for_token(project_id=project_id, sentence_id=token["sentence_id"], position=token["position"])
		items.append(token)
	return items


def bulk_update(word: str, new_tag: str, project_id: str) -> dict:
	prefix, entity = split_tag(new_tag)

	result = tokens_col.update_many(
		{"project_id": project_id, "word": word},
		{
			"$set": {
				"tag": new_tag,
				"tag_prefix": prefix,
				"entity_type": entity,
				"is_modified": True,
			}
		},
	)
	return {"matched_count": result.matched_count, "modified_count": result.modified_count}
