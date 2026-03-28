from datetime import datetime, timezone
import base64
import hashlib
import hmac
import secrets

from fastapi import APIRouter, HTTPException
from pymongo.errors import AutoReconnect, ConnectionFailure, NetworkTimeout, PyMongoError, ServerSelectionTimeoutError

try:
	import bcrypt as pybcrypt
except Exception:
	pybcrypt = None

from app.config.db import users_col
from app.schemas.auth_schema import LoginRequest, SignupRequest


router = APIRouter(prefix="/auth", tags=["auth"])


PBKDF2_ITERATIONS = 260000


def _hash_password(password: str) -> str:
	salt = secrets.token_bytes(16)
	key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
	salt_b64 = base64.b64encode(salt).decode("ascii")
	key_b64 = base64.b64encode(key).decode("ascii")
	return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt_b64}${key_b64}"


def _verify_password(password: str, stored_hash: str) -> bool:
	if not stored_hash:
		return False

	if stored_hash.startswith("pbkdf2_sha256$"):
		parts = stored_hash.split("$", 3)
		if len(parts) != 4:
			return False

		_, iter_raw, salt_b64, key_b64 = parts
		try:
			iterations = int(iter_raw)
			salt = base64.b64decode(salt_b64.encode("ascii"))
			expected_key = base64.b64decode(key_b64.encode("ascii"))
		except Exception:
			return False

		candidate_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
		return hmac.compare_digest(candidate_key, expected_key)

	# Backward compatibility for any existing bcrypt hashes in DB.
	if stored_hash.startswith("$2") and pybcrypt is not None:
		try:
			return pybcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
		except Exception:
			return False

	return False


def _is_db_unavailable_error(exc: Exception) -> bool:
	return isinstance(exc, (ServerSelectionTimeoutError, AutoReconnect, ConnectionFailure, NetworkTimeout))


@router.post("/signup")
def signup(payload: SignupRequest) -> dict:
	try:
		existing = users_col.find_one({"email": payload.email})
	except PyMongoError as exc:
		if _is_db_unavailable_error(exc):
			raise HTTPException(status_code=503, detail="Database unavailable. Check MongoDB connection/TLS settings.") from exc
		raise HTTPException(status_code=500, detail="Database operation failed.") from exc

	if existing:
		raise HTTPException(status_code=409, detail="Email already registered")

	now = datetime.now(timezone.utc).isoformat()
	user_doc = {
		"name": payload.name,
		"email": payload.email,
		"password_hash": _hash_password(payload.password),
		"created_at": now,
	}

	try:
		inserted = users_col.insert_one(user_doc)
	except PyMongoError as exc:
		if _is_db_unavailable_error(exc):
			raise HTTPException(status_code=503, detail="Database unavailable. Check MongoDB connection/TLS settings.") from exc
		raise HTTPException(status_code=500, detail="Failed to create user.") from exc

	return {"message": "User created", "user_id": str(inserted.inserted_id), "name": payload.name, "email": payload.email}


@router.post("/login")
def login(payload: LoginRequest) -> dict:
	try:
		existing = users_col.find_one({"email": payload.email})
	except PyMongoError as exc:
		if _is_db_unavailable_error(exc):
			raise HTTPException(status_code=503, detail="Database unavailable. Check MongoDB connection/TLS settings.") from exc
		raise HTTPException(status_code=500, detail="Database operation failed.") from exc

	if not existing or not _verify_password(payload.password, existing.get("password_hash", "")):
		raise HTTPException(status_code=401, detail="Invalid credentials")

	return {"user_id": str(existing["_id"]), "name": existing.get("name", ""), "email": existing.get("email", "")}
