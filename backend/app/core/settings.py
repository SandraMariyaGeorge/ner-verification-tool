from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
	mongo_uri: str = "mongodb://127.0.0.1:27017"
	mongo_db: str = "ner_tool"
	default_dataset_id: str = "dataset_1"
	cors_origins: str = "*"

	model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

	@property
	def cors_origins_list(self) -> list[str]:
		if self.cors_origins.strip() == "*":
			return ["*"]
		return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


settings = Settings()
