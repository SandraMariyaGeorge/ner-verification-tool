from pymongo import ASCENDING, MongoClient

from app.core.settings import settings


client = MongoClient(settings.mongo_uri, serverSelectionTimeoutMS=5000)
db = client[settings.mongo_db]

tokens_col = db["tokens"]
sentences_col = db["sentences"]
patterns_col = db["patterns"]


def ensure_indexes() -> None:
	tokens_col.create_index([("dataset_id", ASCENDING)])
	tokens_col.create_index([("word", ASCENDING)])
	tokens_col.create_index([("sentence_id", ASCENDING), ("position", ASCENDING)])
	tokens_col.create_index([("dataset_id", ASCENDING), ("sentence_index", ASCENDING), ("position", ASCENDING)])

	sentences_col.create_index([("dataset_id", ASCENDING), ("sentence_index", ASCENDING)])

	patterns_col.create_index([("dataset_id", ASCENDING), ("status", ASCENDING)])
	patterns_col.create_index([("sentence_id", ASCENDING), ("left_position", ASCENDING)])
