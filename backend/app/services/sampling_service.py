from app.config.db import tokens_col
from app.utils.bio_validator import split_tag
from app.utils.constants import DEFAULT_CONTEXT_WINDOW
from app.utils.helpers import serialize_context, serialize_token


def _context_for_token(sentence_id: str, position: int, window: int = DEFAULT_CONTEXT_WINDOW) -> list[dict]:
	docs = tokens_col.find(
		{
			"sentence_id": sentence_id,
			"position": {"$gte": max(0, position - window), "$lte": position + window},
		},
		{"word": 1, "tag": 1, "position": 1},
	).sort("position", 1)
	return [serialize_context(d) for d in docs]


def get_preview(limit: int, dataset_id: str) -> list[dict]:
	docs = tokens_col.find(
		{"dataset_id": dataset_id},
		{
			"_id": 1,
			"dataset_id": 1,
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
	).sort([("sentence_index", 1), ("position", 1)]).limit(limit)
	return [serialize_token(d) for d in docs]


def get_sample(size: int, dataset_id: str) -> list[dict]:
	sampled = list(tokens_col.aggregate([{"$match": {"dataset_id": dataset_id}}, {"$sample": {"size": size}}]))

	items: list[dict] = []
	for doc in sampled:
		base = serialize_token(doc)
		base["context"] = _context_for_token(base["sentence_id"], base["position"])
		items.append(base)
	return items


def update_token_tag(sentence_id: str, position: int, new_tag: str, dataset_id: str) -> dict:
	prefix, entity = split_tag(new_tag)

	result = tokens_col.update_one(
		{
			"dataset_id": dataset_id,
			"sentence_id": sentence_id,
			"position": position,
		},
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
