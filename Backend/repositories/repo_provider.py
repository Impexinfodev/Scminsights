# SCM-INSIGHTS Repository Provider
# ARCH-03 FIX: A single shared ConnectionPool is created here and passed to
# every repository. Previously each repository (user, admin, trade) created its
# own pool of up to 10 connections, meaning a single app instance could hold
# 30+ open connections against the same PostgreSQL server. With a shared pool
# (min=2, max=15) all repositories compete for the same slots, keeping total
# connections predictable and well under PostgreSQL's default limit.
from typing import Optional, Dict, Any

from psycopg_pool import ConnectionPool


def _conninfo(c: dict) -> str:
    return (
        f"host={c['POSTGRES_DB_HOST']} port={c['POSTGRES_DB_PORT']} "
        f"dbname={c['POSTGRES_DB_NAME']} user={c['POSTGRES_DB_USER']} "
        f"password={c['POSTGRES_DB_PASSWORD']}"
    )


class RepoProvider:
    _user_repo = None
    _admin_repo = None
    _shared_pool: Optional[ConnectionPool] = None
    _app_config: Optional[Dict[str, Any]] = None

    def __init__(self, app_config: Dict[str, Any]) -> None:
        RepoProvider._app_config = app_config

    @staticmethod
    def _get_pool() -> ConnectionPool:
        """Return the single shared connection pool, creating it on first call."""
        if RepoProvider._shared_pool is None:
            if RepoProvider._app_config is None:
                raise RuntimeError("RepoProvider not initialized. Call RepoProvider(app.config) first.")
            RepoProvider._shared_pool = ConnectionPool(
                _conninfo(RepoProvider._app_config),
                min_size=2,
                max_size=15,
                check=ConnectionPool.check_connection,
            )
            # Register the shared pool with the trade repository module so it
            # does not create a third independent pool.
            try:
                from repositories import trade_repository as _tr
                _tr.set_shared_pool(RepoProvider._shared_pool)
            except Exception:
                pass
        return RepoProvider._shared_pool

    @staticmethod
    def get_user_repo():
        if RepoProvider._app_config is None:
            raise RuntimeError("RepoProvider not initialized. Call RepoProvider(app.config) first.")
        if RepoProvider._user_repo is None:
            from modules.repositories.User.postgres_user_repository import PostgresUserRepository
            RepoProvider._user_repo = PostgresUserRepository(
                pool=RepoProvider._get_pool(),
            )
        return RepoProvider._user_repo

    @staticmethod
    def get_admin_repo():
        if RepoProvider._app_config is None:
            raise RuntimeError("RepoProvider not initialized. Call RepoProvider(app.config) first.")
        if RepoProvider._admin_repo is None:
            from modules.repositories.Admin.postgres_admin_repo import PostgresAdminRepository
            RepoProvider._admin_repo = PostgresAdminRepository(
                pool=RepoProvider._get_pool(),
            )
        return RepoProvider._admin_repo

    @staticmethod
    def reset():
        RepoProvider._user_repo = None
        RepoProvider._admin_repo = None
        if RepoProvider._shared_pool is not None:
            try:
                RepoProvider._shared_pool.close()
            except Exception:
                pass
            RepoProvider._shared_pool = None
        RepoProvider._app_config = None
