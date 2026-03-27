from typing import Tuple


def split_tag(tag: str) -> Tuple[str, str]:
	if "-" not in tag:
		return "O", "O"
	prefix, entity = tag.split("-", 1)
	return prefix, entity


def detect_invalid_transition(prev_tag: str, curr_tag: str) -> tuple[bool, str]:
	prev_prefix, prev_entity = split_tag(prev_tag)
	curr_prefix, curr_entity = split_tag(curr_tag)

	if prev_prefix == "B" and curr_prefix == "B" and prev_entity != curr_entity:
		return True, f"I-{prev_entity}"

	if curr_prefix == "I" and prev_entity != curr_entity:
		return True, f"B-{curr_entity}"

	return False, curr_tag
