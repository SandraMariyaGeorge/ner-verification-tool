from fastapi import APIRouter, Query
from fastapi.responses import Response

from app.config.db import tokens_col


router = APIRouter(tags=["export"])


@router.get("/export")
def export_dataset(project_id: str = Query(..., min_length=1)) -> Response:
    docs = tokens_col.find(
        {"project_id": project_id},
        {"word": 1, "tag": 1, "sentence_id": 1, "sentence_index": 1, "position": 1},
    ).sort([("sentence_index", 1), ("position", 1)])

    lines: list[str] = []
    current_sentence = None

    for token in docs:
        if current_sentence is None:
            current_sentence = token["sentence_id"]
        elif token["sentence_id"] != current_sentence:
            lines.append("")
            current_sentence = token["sentence_id"]

        lines.append(f"{token['word']} {token['tag']}")

    output = "\n".join(lines) + ("\n" if lines else "")
    return Response(content=output, media_type="text/plain; charset=utf-8")