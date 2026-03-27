from fastapi import APIRouter
from fastapi.responses import Response

from app.config.db import tokens_col
from app.core.settings import settings


router = APIRouter(tags=["export"])


@router.get("/export")
def export_dataset() -> Response:
    docs = tokens_col.find(
        {"dataset_id": settings.default_dataset_id},
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