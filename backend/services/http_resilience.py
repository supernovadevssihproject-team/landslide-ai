"""Small, bounded retry helper for external HTTP providers."""

from __future__ import annotations

import logging
import random
import time
from email.utils import parsedate_to_datetime
from typing import Any, Callable

import requests

logger = logging.getLogger("terraguard.external_http")

RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _retry_after_seconds(response: requests.Response) -> float | None:
    value = response.headers.get("Retry-After")
    if not value:
        return None
    try:
        return max(0.0, min(float(value), 8.0))
    except ValueError:
        try:
            return max(
                0.0,
                min(
                    (parsedate_to_datetime(value).timestamp() - time.time()),
                    8.0,
                ),
            )
        except (TypeError, ValueError, OverflowError):
            return None


def request_with_retry(
    request: Callable[..., requests.Response],
    *,
    service: str,
    method: str,
    url: str,
    timeout: tuple[float, float],
    max_attempts: int = 3,
    **kwargs: Any,
) -> requests.Response:
    """Run a bounded request retrying only transient failures."""
    attempts = max(1, min(max_attempts, 3))
    for attempt in range(1, attempts + 1):
        try:
            response = request(url, timeout=timeout, **kwargs)
            if response.status_code not in RETRYABLE_STATUS_CODES or attempt == attempts:
                return response

            delay = _retry_after_seconds(response)
            if delay is None:
                delay = min(2.0, 0.35 * (2 ** (attempt - 1))) + random.uniform(0, 0.1)
            logger.warning(
                "external service=%s method=%s status=%s retry=%s/%s",
                service,
                method,
                response.status_code,
                attempt,
                attempts - 1,
            )
            time.sleep(delay)
        except (requests.Timeout, requests.ConnectionError) as error:
            if attempt == attempts:
                logger.error(
                    "external service=%s method=%s failure=%s retry=%s/%s final=fallback",
                    service,
                    method,
                    type(error).__name__,
                    attempt,
                    attempts - 1,
                )
                raise
            delay = min(2.0, 0.35 * (2 ** (attempt - 1))) + random.uniform(0, 0.1)
            logger.warning(
                "external service=%s method=%s failure=%s retry=%s/%s",
                service,
                method,
                type(error).__name__,
                attempt,
                attempts - 1,
            )
            time.sleep(delay)

    raise RuntimeError(f"{service} request failed without a response")
