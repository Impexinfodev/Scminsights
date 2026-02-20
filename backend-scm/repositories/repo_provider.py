# SCM-INSIGHTS Repository Provider
from typing import Optional, Dict, Any


class RepoProvider:
    _user_repo = None
    _admin_repo = None
    _app_config: Optional[Dict[str, Any]] = None

    def __init__(self, app_config: Dict[str, Any]) -> None:
        RepoProvider._app_config = app_config

    @staticmethod
    def get_user_repo():
        if RepoProvider._app_config is None:
            raise RuntimeError("RepoProvider not initialized. Call RepoProvider(app.config) first.")
        if RepoProvider._user_repo is None:
            from modules.repositories.User.postgres_user_repository import PostgresUserRepository
            c = RepoProvider._app_config
            RepoProvider._user_repo = PostgresUserRepository(
                db_user=c["POSTGRES_DB_USER"],
                db_password=c["POSTGRES_DB_PASSWORD"],
                db_name=c["POSTGRES_DB_NAME"],
                db_host=c["POSTGRES_DB_HOST"],
                db_port=c["POSTGRES_DB_PORT"],
            )
        return RepoProvider._user_repo

    @staticmethod
    def get_admin_repo():
        if RepoProvider._app_config is None:
            raise RuntimeError("RepoProvider not initialized. Call RepoProvider(app.config) first.")
        if RepoProvider._admin_repo is None:
            from modules.repositories.Admin.postgres_admin_repo import PostgresAdminRepository
            c = RepoProvider._app_config
            RepoProvider._admin_repo = PostgresAdminRepository(
                db_user=c["POSTGRES_DB_USER"],
                db_password=c["POSTGRES_DB_PASSWORD"],
                db_name=c["POSTGRES_DB_NAME"],
                db_host=c["POSTGRES_DB_HOST"],
                db_port=c["POSTGRES_DB_PORT"],
            )
        return RepoProvider._admin_repo

    @staticmethod
    def reset():
        RepoProvider._user_repo = None
        RepoProvider._admin_repo = None
        RepoProvider._app_config = None
