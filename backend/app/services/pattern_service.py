from bson import ObjectId
from datetime import datetime, timezone

from app.config.db import pattern_reviews_col, patterns_col, sentences_col, tokens_col
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


def _candidate_reason(side: str, from_pattern: list[str], to_pattern: list[str]) -> str:
	return (
		f"Tag modified. Using {side} neighbor pattern {from_pattern[0]} -> {from_pattern[1]} "
		f"to suggest {to_pattern[0]} -> {to_pattern[1]}."
	)


def detect_patterns_in_sample_context(context: list[dict], edited_tags: dict[str, str] | None = None) -> list[dict]:
	if len(context) < 2:
		return []

	edited_tags = edited_tags or {}
	items = sorted(context, key=lambda token: int(token.get("position", 0)))

	def resolved_tag(token: dict) -> str:
		token_id = token.get("id")
		if token_id and token_id in edited_tags and edited_tags[token_id]:
			return edited_tags[token_id]
		return token.get("tag") or "O"

	def original_tag(token: dict) -> str:
		return token.get("tag") or "O"

	detected: list[dict] = []
	seen: set[str] = set()

	for idx, token in enumerate(items):
		token_id = token.get("id")
		if not token_id:
			continue

		new_tag = edited_tags.get(token_id)
		old_tag = original_tag(token)
		if not new_tag or new_tag == old_tag:
			continue

		if idx > 0:
			left = items[idx - 1]
			left_tag = original_tag(left)
			from_pattern = [left_tag, old_tag]
			to_pattern = [left_tag, new_tag]
			key = f"L:{left_tag}|{old_tag}|{new_tag}|{token_id}"
			if key not in seen:
				seen.add(key)
				detected.append(
					{
						"index": idx - 1,
						"neighbor_side": "left",
						"target_index": 1,
						"modified_token_id": token_id,
						"from_pattern": from_pattern,
						"to_pattern": to_pattern,
						"new_tag": new_tag,
						"reason": _candidate_reason("left", from_pattern, to_pattern),
					}
				)

		if idx < len(items) - 1:
			right = items[idx + 1]
			right_tag = original_tag(right)
			from_pattern = [old_tag, right_tag]
			to_pattern = [new_tag, right_tag]
			key = f"R:{old_tag}|{right_tag}|{new_tag}|{token_id}"
			if key not in seen:
				seen.add(key)
				detected.append(
					{
						"index": idx,
						"neighbor_side": "right",
						"target_index": 0,
						"modified_token_id": token_id,
						"from_pattern": from_pattern,
						"to_pattern": to_pattern,
						"new_tag": new_tag,
						"reason": _candidate_reason("right", from_pattern, to_pattern),
					}
				)

	return detected


def find_similar_patterns(project_id: str, pattern: list[str], target_index: int = 1, limit: int = 200) -> list[dict]:
	if len(pattern) != 2:
		return []

	left_tag, right_tag = pattern
	cursor = tokens_col.find(
		{"project_id": project_id},
		{"_id": 1, "sentence_id": 1, "position": 1, "word": 1, "tag": 1},
	).sort([("sentence_id", 1), ("position", 1)])

	matches: list[dict] = []
	last_sentence_id = None
	prev_token = None

	for token in cursor:
		sentence_id = str(token.get("sentence_id"))
		if sentence_id != last_sentence_id:
			prev_token = None
			last_sentence_id = sentence_id

		if prev_token:
			is_adjacent = int(token.get("position", -1)) == int(prev_token.get("position", -2)) + 1
			if is_adjacent and prev_token.get("tag") == left_tag and token.get("tag") == right_tag:
				target_token_id = str(token.get("_id")) if target_index == 1 else str(prev_token.get("_id"))
				matches.append(
					{
						"sentence_id": sentence_id,
						"left_token_id": str(prev_token.get("_id")),
						"right_token_id": str(token.get("_id")),
						"target_token_id": target_token_id,
						"target_index": target_index,
						"left_position": prev_token.get("position"),
						"right_position": token.get("position"),
						"words": [prev_token.get("word"), token.get("word")],
						"tags": [prev_token.get("tag"), token.get("tag")],
					}
				)
				if len(matches) >= limit:
					break

		prev_token = token

	return matches


def apply_pattern_fix_to_tokens(
	project_id: str,
	token_ids: list[str],
	new_tag: str,
	pattern: list[str] | None = None,
	source_sample_token_id: str | None = None,
	verified_by: str | None = None,
) -> dict:
	parsed_ids: list[ObjectId] = []
	for token_id in token_ids:
		try:
			parsed_ids.append(ObjectId(token_id))
		except Exception:
			continue

	if not parsed_ids:
		return {"matched_count": 0, "modified_count": 0}

	prefix, entity = split_tag(new_tag)
	result = tokens_col.update_many(
		{"project_id": project_id, "_id": {"$in": parsed_ids}},
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
	pattern_reviews_col.insert_one(
		{
			"project_id": project_id,
			"action": "apply",
			"pattern": pattern or [],
			"source_sample_token_id": source_sample_token_id,
			"token_ids": [str(token_id) for token_id in parsed_ids],
			"new_tag": new_tag,
			"verified_by": verified_by,
			"created_at": now,
		}
	)

	return {"matched_count": result.matched_count, "modified_count": result.modified_count}


def ignore_pattern_suggestion(
	project_id: str,
	pattern: list[str],
	source_sample_token_id: str | None = None,
	reason: str | None = None,
	verified_by: str | None = None,
) -> dict:
	now = datetime.now(timezone.utc).isoformat()
	result = pattern_reviews_col.insert_one(
		{
			"project_id": project_id,
			"action": "ignore",
			"pattern": pattern,
			"source_sample_token_id": source_sample_token_id,
			"reason": reason,
			"verified_by": verified_by,
			"created_at": now,
		}
	)
	return {"logged": bool(result.inserted_id)}
