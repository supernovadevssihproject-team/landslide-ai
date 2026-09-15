"""Official National Center for Seismology earthquake adapter."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from html import unescape
import json
import math
import re
import time
from typing import Any, Dict, List, Optional

import requests
from backend.services.http_resilience import request_with_retry

NCS_EARTHQUAKE_URL = "https://riseq.seismo.gov.in/riseq/earthquake"
NCS_SOURCE_NAME = "National Center for Seismology"
NCS_SOURCE_URL = "https://seismo.gov.in/"
CACHE_TTL_SECONDS = 120

_EVENT_METADATA_PATTERN = re.compile(r"data-json='([^']+)'", re.IGNORECASE)


class EarthquakeService:
    def __init__(self) -> None:
        self._cache: Optional[Dict[str, Any]] = None

    def get_earthquakes(
        self,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        radius_km: float = 500.0,
        limit: int = 100,
    ) -> Dict[str, Any]:
        if not self._valid_coordinate_pair(latitude, longitude):
            latitude = None
            longitude = None
        radius_km = min(max(float(radius_km), 1.0), 2000.0)
        limit = min(max(int(limit), 1), 200)

        try:
            events = self._get_cached_events()
            if latitude is not None and longitude is not None:
                events = [
                    event
                    for event in events
                    if self._distance_km(
                        latitude,
                        longitude,
                        event["latitude"],
                        event["longitude"],
                    )
                    <= radius_km
                ]
            events = events[:limit]
            trigger_score = self._calculate_trigger_score(
                events, latitude, longitude
            )
            return {
                "earthquake_data_available": True,
                "source_status": "available",
                "source": NCS_SOURCE_NAME,
                "source_url": NCS_SOURCE_URL,
                "last_updated": datetime.now(timezone.utc).isoformat(),
                "events": events,
                "earthquake_trigger_score": trigger_score,
                "message": "Live earthquake data loaded from the National Center for Seismology.",
            }
        except Exception as error:
            print(f"[EarthquakeService] NCS feed unavailable: {error}")
            return self._unavailable_response()

    def _get_cached_events(self) -> List[Dict[str, Any]]:
        now = time.time()
        if self._cache and now - self._cache["timestamp"] < CACHE_TTL_SECONDS:
            return self._cache["events"]

        response = request_with_retry(
            requests.get,
            service="NCS earthquake feed",
            method="GET",
            url=NCS_EARTHQUAKE_URL,
            timeout=(3.0, 8.0),
        )
        response.raise_for_status()
        events = self._parse_ncs_html(response.text)
        if not events:
            raise ValueError("NCS response contained no valid earthquake events")
        self._cache = {"timestamp": now, "events": events}
        return events

    @staticmethod
    def _parse_ncs_html(html: str) -> List[Dict[str, Any]]:
        events_by_id: Dict[str, Dict[str, Any]] = {}
        for encoded_metadata in _EVENT_METADATA_PATTERN.findall(html):
            try:
                metadata = json.loads(unescape(encoded_metadata))
                event = EarthquakeService._normalize_event(metadata)
                if event:
                    events_by_id[event["id"]] = event
            except (ValueError, TypeError, json.JSONDecodeError):
                continue
        return list(events_by_id.values())

    @staticmethod
    def _normalize_event(metadata: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        event_id = str(metadata.get("event_id") or "").strip()
        location = str(metadata.get("event_name") or "").strip()
        origin_time = str(metadata.get("origin_time") or "").strip()
        lat_long = str(metadata.get("lat_long") or "").split(",")
        magnitude_depth = str(metadata.get("magnitude_depth") or "")

        magnitude_match = re.search(r"M\s*:\s*(-?\d+(?:\.\d+)?)", magnitude_depth)
        depth_match = re.search(r"D\s*:\s*(-?\d+(?:\.\d+)?)\s*km", magnitude_depth, re.IGNORECASE)
        if not magnitude_match or len(lat_long) != 2:
            return None

        try:
            magnitude = float(magnitude_match.group(1))
            latitude = float(lat_long[0].strip())
            longitude = float(lat_long[1].strip())
            depth_km = float(depth_match.group(1)) if depth_match else None
            parsed_time = EarthquakeService._parse_timestamp(origin_time)
        except (TypeError, ValueError):
            return None

        if not event_id or not location or parsed_time is None:
            return None
        if not all(math.isfinite(value) for value in (magnitude, latitude, longitude)):
            return None
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            return None
        if depth_km is None or not math.isfinite(depth_km) or depth_km < 0:
            depth_km = 0.0

        status_text = str(metadata.get("event_type") or "").strip().lower()
        status = "reviewed" if "review" in status_text else "unreviewed" if "auto" in status_text else "unknown"
        return {
            "id": event_id,
            "magnitude": magnitude,
            "latitude": latitude,
            "longitude": longitude,
            "depth_km": depth_km,
            "location": re.sub(r"^M\s*:\s*-?\d+(?:\.\d+)?\s*-\s*", "", location).strip(),
            "event_time": parsed_time,
            "source": NCS_SOURCE_NAME,
            "status": status,
        }

    @staticmethod
    def _parse_timestamp(value: str) -> Optional[str]:
        for format_string in ("%Y-%m-%d %H:%M:%S IST", "%Y-%m-%d %H:%M:%S"):
            try:
                parsed = datetime.strptime(value, format_string)
                source_timezone = timezone(timedelta(hours=5, minutes=30)) if value.endswith(" IST") else timezone.utc
                return parsed.replace(tzinfo=source_timezone).isoformat()
            except ValueError:
                continue
        return None

    @staticmethod
    def _valid_coordinate_pair(latitude: Optional[float], longitude: Optional[float]) -> bool:
        return (
            latitude is not None
            and longitude is not None
            and math.isfinite(float(latitude))
            and math.isfinite(float(longitude))
            and -90 <= float(latitude) <= 90
            and -180 <= float(longitude) <= 180
        )

    @staticmethod
    def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        earth_radius_km = 6371.0
        lat_delta = math.radians(lat2 - lat1)
        lon_delta = math.radians(lon2 - lon1)
        a = math.sin(lat_delta / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(lon_delta / 2) ** 2
        return 2 * earth_radius_km * math.asin(math.sqrt(a))

    @staticmethod
    def _calculate_trigger_score(
        events: List[Dict[str, Any]],
        latitude: Optional[float],
        longitude: Optional[float],
    ) -> float:
        if not events:
            return 0.0
        strongest = max(event["magnitude"] for event in events)
        if latitude is None or longitude is None:
            return round(min(1.0, max(0.0, (strongest - 3.0) / 4.0)), 3)
        weighted_scores = []
        for event in events:
            distance = EarthquakeService._distance_km(latitude, longitude, event["latitude"], event["longitude"])
            proximity = max(0.0, 1.0 - distance / 500.0)
            magnitude_factor = max(0.0, min(1.0, (event["magnitude"] - 2.5) / 4.5))
            weighted_scores.append(proximity * magnitude_factor)
        return round(min(1.0, max(weighted_scores, default=0.0)), 3)

    @staticmethod
    def _unavailable_response() -> Dict[str, Any]:
        return {
            "earthquake_data_available": False,
            "source_status": "temporarily_unavailable",
            "source": NCS_SOURCE_NAME,
            "source_url": NCS_SOURCE_URL,
            "events": [],
            "earthquake_trigger_score": 0.0,
            "message": "Live earthquake data is temporarily unavailable.",
        }


earthquake_service = EarthquakeService()
