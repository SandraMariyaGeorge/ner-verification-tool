import certifi
from pymongo import ASCENDING, MongoClient

from app.core.settings import settings


mongo_kwargs = {"serverSelectionTimeoutMS": 5000}

# Atlas/SRV connections on Windows can fail TLS negotiation without an explicit CA bundle.
if settings.mongo_uri.startswith("mongodb+srv://") or "tls=true" in settings.mongo_uri.lower():
	mongo_kwargs["tlsCAFile"] = certifi.where()

client = MongoClient(settings.mongo_uri, **mongo_kwargs)
db = client[settings.mongo_db]

users_col = db["users"]
projects_col = db["projects"]
tokens_col = db["tokens"]
sentences_col = db["sentences"]
patterns_col = db["patterns"]


def ensure_indexes() -> None:
	users_col.create_index([("email", ASCENDING)], unique=True)

	projects_col.create_index([("user_id", ASCENDING)])

	tokens_col.create_index([("project_id", ASCENDING)])
	tokens_col.create_index([("word", ASCENDING)])
	tokens_col.create_index([("sentence_id", ASCENDING), ("position", ASCENDING)])
	tokens_col.create_index([("project_id", ASCENDING), ("sentence_index", ASCENDING), ("position", ASCENDING)])

	sentences_col.create_index([("project_id", ASCENDING), ("sentence_index", ASCENDING)])

	patterns_col.create_index([("project_id", ASCENDING), ("status", ASCENDING)])
	patterns_col.create_index([("sentence_id", ASCENDING), ("left_position", ASCENDING)])
