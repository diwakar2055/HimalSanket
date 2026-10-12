import time
import threading
from typing import Any, Optional, Dict
from collections import OrderedDict


class SimpleMemoryCache:
    """
    Lightweight, thread-safe LRU in-memory cache with TTL support.
    """
    def __init__(self, default_ttl: int = 300, max_size: int = 1000):
        self.default_ttl = default_ttl
        self.max_size = max_size
        self._cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._lock = threading.Lock()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                self._misses += 1
                return None

            entry = self._cache[key]
            if entry["expires_at"] is not None and time.time() > entry["expires_at"]:
                del self._cache[key]
                self._misses += 1
                return None

            # Move to end (LRU)
            self._cache.move_to_end(key)
            self._hits += 1
            return entry["value"]

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            expires_at = time.time() + (ttl if ttl is not None else self.default_ttl)
            if key in self._cache:
                self._cache[key] = {"value": value, "expires_at": expires_at}
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self.max_size:
                    # Pop oldest item
                    self._cache.popitem(last=False)
                self._cache[key] = {"value": value, "expires_at": expires_at}

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            self._hits = 0
            self._misses = 0

    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            now = time.time()
            valid_count = sum(
                1 for entry in self._cache.values()
                if entry["expires_at"] is None or entry["expires_at"] > now
            )
            return {
                "hits": self._hits,
                "misses": self._misses,
                "size": valid_count,
                "max_size": self.max_size,
                "default_ttl_seconds": self.default_ttl
            }


cache = SimpleMemoryCache()
