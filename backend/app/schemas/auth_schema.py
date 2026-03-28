from pydantic import BaseModel, Field


class SignupRequest(BaseModel):
	name: str = Field(min_length=1)
	email: str
	password: str


class LoginRequest(BaseModel):
	email: str
	password: str
