from datetime import datetime, timezone

from bson import ObjectId

from app.config.db import samples_col, tokens_col
from app.services.project_service import sync_project_stats
from app.utils.bio_validator import split_tag
from app.utils.helpers import serialize_context, serialize_token


def _parse_token_ids(token_ids: list[str]) -> list[ObjectId]:
	parsed: list[ObjectId] = []
	for token_id in token_ids:
		try:
			parsed.append(ObjectId(token_id))
		except Exception:
			continue
	return parsed


def _context_for_token(project_id: str, sentence_id: str, position: int, window: int = 4) -> list[dict]:
	docs = tokens_col.find(
		{
			"project_id": project_id,
			"sentence_id": sentence_id,
			"position": {"$gte": max(0, position - window), "$lte": position + window},
		},
		{"_id": 1, "word": 1, "tag": 1, "position": 1},
	).sort("position", 1)
	return [serialize_context(d) for d in docs]


def _context_token_ids(project_id: str, sentence_id: str, position: int, window: int = 4) -> list[ObjectId]:
	docs = tokens_col.find(
		{
			"project_id": project_id,
			"sentence_id": sentence_id,
			"position": {"$gte": max(0, position - window), "$lte": position + window},
		},
		{"_id": 1},
	)
	return [d["_id"] for d in docs]


def get_preview(limit: int, project_id: str) -> list[dict]:
	docs = tokens_col.find(
		{"project_id": project_id},
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
			"verification_status": 1,
			"verified_by": 1,
			"verified_at": 1,
			"is_modified": 1,
		},
	).sort([("sentence_index", 1), ("position", 1)]).limit(limit)
	return [serialize_token(d) for d in docs]


def get_sample(size: int, project_id: str) -> list[dict]:
	now = datetime.now(timezone.utc).isoformat()
	base_filter = {
		"project_id": project_id,
		"$or": [
			{"verification_status": "unverified"},
			{"verification_status": {"$exists": False}},
			{"verification_status": None},
		],
	}
	sampled = list(
		tokens_col.aggregate(
			[
				{
					"$match": {
						**base_filter,
						"sampled_at": {"$exists": False},
					}
				},
				{"$sample": {"size": size}},
			]
		)
	)

	# If every unverified token has been sampled once, reset the sampling pool and continue.
	if not sampled and tokens_col.count_documents(base_filter) > 0:
		tokens_col.update_many(base_filter, {"$unset": {"sampled_at": ""}})
		sampled = list(
			tokens_col.aggregate(
				[
					{"$match": {**base_filter, "sampled_at": {"$exists": False}}},
					{"$sample": {"size": size}},
				]
			)
		)

	if sampled:
		token_ids = [doc["_id"] for doc in sampled]
		tokens_col.update_many(
			{"project_id": project_id, "_id": {"$in": token_ids}},
			{"$set": {"sampled_at": now}},
		)

	items: list[dict] = []
	for doc in sampled:
		target = serialize_token(doc)
		context = _context_for_token(project_id=project_id, sentence_id=target["sentence_id"], position=target["position"])
		items.append({"target": target, "context": context})
	return items


def update_token_tag(sentence_id: str, position: int, new_tag: str, project_id: str) -> dict:
	prefix, entity = split_tag(new_tag)

	result = tokens_col.update_one(
		{
			"project_id": project_id,
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


def mark_sample_correct(project_id: str, token_ids: list[str], updates: list[dict] | None = None, verified_by: str | None = None) -> dict:
	parsed_ids = _parse_token_ids(token_ids)
	if not parsed_ids:
		stats = sync_project_stats(project_id)
		return {"matched_count": 0, "modified_count": 0, "stats": stats}

	target_docs = list(
		tokens_col.find(
			{"project_id": project_id, "_id": {"$in": parsed_ids}},
			{"sentence_id": 1, "position": 1, "context_window": 1},
		)
	)

	expanded_ids: set[ObjectId] = set()
	for doc in target_docs:
		window = int(doc.get("context_window", 4) or 4)
		expanded_ids.update(_context_token_ids(project_id, doc["sentence_id"], doc["position"], window=window))

	# Apply user-edited tags from sample context before marking tokens as verified.
	if updates:
		for item in updates:
			token_id = item.get("id")
			new_tag = item.get("new_tag")
			if not token_id or not new_tag:
				continue
			try:
				parsed_id = ObjectId(token_id)
			except Exception:
				continue

			prefix, entity = split_tag(new_tag)
			tokens_col.update_one(
				{"project_id": project_id, "_id": parsed_id},
				{
					"$set": {
						"tag": new_tag,
						"tag_prefix": prefix,
						"entity_type": entity,
						"is_modified": True,
					}
				},
			)

	now = datetime.now(timezone.utc).isoformat()
	result = tokens_col.update_many(
		{"project_id": project_id, "_id": {"$in": list(expanded_ids)}},
		{"$set": {"verification_status": "verified", "verified_by": verified_by, "verified_at": now}, "$unset": {"context_window": ""}},
	)

	if parsed_ids:
		samples_col.insert_one(
			{
				"project_id": project_id,
				"token_ids": token_ids,
				"action": "correct",
				"expanded": False,
				"created_at": now,
				"processed_at": now,
			}
		)

	stats = sync_project_stats(project_id)
	return {"matched_count": result.matched_count, "modified_count": result.modified_count, "stats": stats}


def mark_sample_wrong(project_id: str, updates: list[dict], verified_by: str | None = None) -> dict:
	now = datetime.now(timezone.utc).isoformat()
	modified = 0
	token_ids: list[str] = []
	context_ids_to_verify: set[ObjectId] = set()

	for item in updates:
		token_id = item.get("id")
		new_tag = item.get("new_tag")
		if not token_id or not new_tag:
			continue

		try:
			parsed_id = ObjectId(token_id)
		except Exception:
			continue

		prefix, entity = split_tag(new_tag)
		target_doc = tokens_col.find_one({"project_id": project_id, "_id": parsed_id}, {"sentence_id": 1, "position": 1})
		if target_doc:
			context_ids_to_verify.update(
				_context_token_ids(project_id, target_doc["sentence_id"], target_doc["position"], window=4)
			)

		result = tokens_col.update_one(
			{"project_id": project_id, "_id": parsed_id},
			{
				"$set": {
					"tag": new_tag,
					"tag_prefix": prefix,
					"entity_type": entity,
					"is_modified": True,
					"verification_status": "verified",
					"verified_by": verified_by,
					"verified_at": now,
				}
			},
		)

		if result.modified_count:
			modified += result.modified_count
			token_ids.append(token_id)

	if context_ids_to_verify:
		context_result = tokens_col.update_many(
			{"project_id": project_id, "_id": {"$in": list(context_ids_to_verify)}},
			{"$set": {"verification_status": "verified", "verified_by": verified_by, "verified_at": now}},
		)
		modified += context_result.modified_count

	if token_ids:
		samples_col.insert_one(
			{
				"project_id": project_id,
				"token_ids": token_ids,
				"action": "wrong",
				"expanded": False,
				"created_at": now,
				"processed_at": now,
			}
		)

	stats = sync_project_stats(project_id)
	return {"modified_count": modified, "stats": stats}


def flag_sample(project_id: str, token_ids: list[str], verified_by: str | None = None) -> dict:
	parsed_ids = _parse_token_ids(token_ids)
	if not parsed_ids:
		return {"expanded": 0, "message": "No token selected for context expansion."}

	target = tokens_col.find_one(
		{"project_id": project_id, "_id": parsed_ids[0]},
		{"_id": 1, "project_id": 1, "sentence_id": 1, "position": 1, "context_window": 1},
	)
	if not target:
		return {"expanded": 0, "message": "Sample token not found."}

	current_window = int(target.get("context_window", 4) or 4)
	next_window = current_window + 4
	tokens_col.update_one(
		{"project_id": project_id, "_id": target["_id"]},
		{"$set": {"context_window": next_window}},
	)

	context = _context_for_token(
		project_id=project_id,
		sentence_id=target["sentence_id"],
		position=target["position"],
		window=next_window,
	)
	sentence_size = tokens_col.count_documents({"project_id": project_id, "sentence_id": target["sentence_id"]})
	has_more = len(context) < sentence_size

	now = datetime.now(timezone.utc).isoformat()
	samples_col.insert_one(
		{
			"project_id": project_id,
			"token_ids": [str(target["_id"])],
			"action": "expand_context",
			"expanded": True,
			"window": next_window,
			"created_at": now,
			"processed_at": now,
		}
	)

	target_doc = tokens_col.find_one({"project_id": project_id, "_id": target["_id"]})
	return {
		"expanded": len(context),
		"window": next_window,
		"has_more": has_more,
		"item": {"target": serialize_token(target_doc), "context": context},
		"message": "Context expanded. Click Flag again to see more context.",
	}
