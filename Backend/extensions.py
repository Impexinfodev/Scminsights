# Shared Flask extensions (e.g. limiter) to avoid circular imports.
import warnings
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Suppress the in-memory storage warning that appears in development when no
# Redis/Memcached URI is configured. In production set RATELIMIT_STORAGE_URI.
warnings.filterwarnings(
    "ignore",
    message=".*in-memory storage.*",
    category=UserWarning,
    module="flask_limiter",
)

limiter = Limiter(key_func=get_remote_address, default_limits=["200 per minute"])
