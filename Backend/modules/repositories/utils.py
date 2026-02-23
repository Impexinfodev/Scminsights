from functools import wraps


def with_connection(commit=False):
    def decorator(func):
        @wraps(func)
        def wrapper(repository, *args, **kwargs):
            with repository.connection_pool.connection() as conn:
                conn.autocommit = False
                try:
                    with conn.cursor() as cursor:
                        result = func(repository, cursor, *args, **kwargs)
                        if commit:
                            conn.commit()
                except Exception as e:
                    try:
                        conn.rollback()
                    except Exception:
                        pass
                    raise e
            return result
        return wrapper
    return decorator
