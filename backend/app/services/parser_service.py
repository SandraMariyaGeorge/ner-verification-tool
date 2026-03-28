from typing import Iterable

from app.config.db import patterns_col, sentences_col, tokens_col
from app.utils.bio_validator import split_tag


def parse_and_store(lines: Iterable[str], project_id: str) -> dict:
	tokens_col.delete_many({"project_id": project_id})
	sentences_col.delete_many({"project_id": project_id})
	patterns_col.delete_many({"project_id": project_id})

	token_docs: list[dict] = []
	sentence_docs: list[dict] = []
	sentence_words: list[str] = []

	sentence_index = 0
	position = 0
	skipped_lines = 0

	def flush_sentence() -> None:
		nonlocal sentence_words, sentence_index, position
		if not sentence_words:
			return

		sentence_id = f"{project_id}_sent_{sentence_index}"
		sentence_docs.append(
			{
				"_id": sentence_id,
				"project_id": project_id,
				"sentence_index": sentence_index,
				"text": " ".join(sentence_words),
			}
		)
		sentence_words = []
		sentence_index += 1
		position = 0

	for raw in lines:
		line = raw.strip()

		if not line:
			flush_sentence()
			continue

		parts = line.rsplit(maxsplit=1)
		if len(parts) != 2:
			skipped_lines += 1
			continue

		word, tag = parts
		prefix, entity = split_tag(tag)
		sentence_id = f"{project_id}_sent_{sentence_index}"

		token_docs.append(
			{
				"project_id": project_id,
				"sentence_id": sentence_id,
				"sentence_index": sentence_index,
				"position": position,
				"word": word,
				"tag": tag,
				"original_tag": tag,
				"entity_type": entity,
				"tag_prefix": prefix,
				"is_modified": False,
			}
		)

		sentence_words.append(word)
		position += 1

	flush_sentence()

	if token_docs:
		tokens_col.insert_many(token_docs)
	if sentence_docs:
		sentences_col.insert_many(sentence_docs)

	return {
		"project_id": project_id,
		"token_count": len(token_docs),
		"sentence_count": len(sentence_docs),
		"skipped_lines": skipped_lines,
	}
