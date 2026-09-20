"""
Emergency Broadcast & SMS Dispatch Gateway (SIH 26001)
Supports SMSHorizon (India Bulk DLT) & Truthful Provider States
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import requests

from backend import config

logger = logging.getLogger("terraguard.sms_service")


class SmsBroadcastService:
    def __init__(self):
        self.provider_name = getattr(config, "SMS_PROVIDER", "sms_horizon")

    def send_broadcast_alert(
        self,
        headline: str,
        instruction: str,
        phone_numbers: Optional[List[str]] = None,
        state: str = "sikkim",
        sender_id: Optional[str] = None,
        dlt_entity_id: Optional[str] = None,
        template_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatches localized evacuation SMS using SMSHorizon DLT or truthful fallback states.
        Never claims 'delivered' or fake recipient counts unless real provider confirmed acceptance.
        
        NOTE: The live HTTP request contract is isolated within this adapter.
        Official SMSHorizon API contract verification remains pending until account credentials
        and provider documentation are issued.
        """
        req_id = f"sms-req-{uuid.uuid4().hex[:8]}"
        timestamp = datetime.now(timezone.utc).isoformat()

        # Sanitize & extract phone numbers
        recipients = [p.strip() for p in (phone_numbers or []) if p and p.strip()]
        
        message_text = f"[GSI-LEWS ALERT] {headline}. {instruction} Call 1077."

        # Check DEMO Mode flag
        if getattr(config, "SMS_DEMO_MODE", True):
            logger.info(
                f"[SMS Gateway] request_id={req_id} status=demo provider={self.provider_name} recipients={len(recipients)}"
            )
            return {
                "status": "demo",
                "gateway": "SMSHorizon DEMO",
                "message": "Demo dispatch only. No real SMS was sent.",
                "request_id": req_id,
                "recipients_count": 0,
            }

        # Resolve DLT configuration
        api_key = getattr(config, "SMSHORIZON_API_KEY", "")
        resolved_sender = sender_id or getattr(config, "SMSHORIZON_SENDER_ID", "")
        resolved_entity = dlt_entity_id or getattr(config, "SMSHORIZON_DLT_ENTITY_ID", "")
        resolved_template = template_id or getattr(config, "SMSHORIZON_TEMPLATE_ID", "")

        # Verify Configuration
        if not api_key or not resolved_sender or not resolved_entity or not resolved_template:
            missing_fields = []
            if not api_key:
                missing_fields.append("SMSHORIZON_API_KEY")
            if not resolved_sender:
                missing_fields.append("SMSHORIZON_SENDER_ID")
            if not resolved_entity:
                missing_fields.append("SMSHORIZON_DLT_ENTITY_ID")
            if not resolved_template:
                missing_fields.append("SMSHORIZON_TEMPLATE_ID")

            logger.warning(
                f"[SMS Gateway] request_id={req_id} status=provider_not_configured missing={','.join(missing_fields)}"
            )
            return {
                "status": "provider_not_configured",
                "gateway": "SMSHorizon",
                "message": f"SMSHorizon is not configured or DLT activation is pending. Missing: {', '.join(missing_fields)}",
                "request_id": req_id,
                "recipients_count": 0,
            }

        if not recipients:
            logger.warning(f"[SMS Gateway] request_id={req_id} status=dispatch_failed reason=no_recipients")
            return {
                "status": "dispatch_failed",
                "gateway": "SMSHorizon",
                "message": "SMS dispatch failed: No valid recipient phone numbers provided.",
                "request_id": req_id,
                "recipients_count": 0,
            }

        # Real SMSHorizon DLT HTTP API Dispatch
        clean_numbers = [num.replace("+91", "").replace(" ", "").replace("-", "") for num in recipients]
        payload = {
            "apikey": api_key,
            "mobile": ",".join(clean_numbers),
            "message": message_text,
            "sender": resolved_sender,
            "type": "txt",
            "entityid": resolved_entity,
            "templateid": resolved_template,
        }

        api_url = getattr(config, "SMSHORIZON_API_URL", "https://smshorizon.in/api/sendsms.php")
        try:
            resp = requests.post(api_url, data=payload, timeout=8)
            if resp.status_code >= 200 and resp.status_code < 300:
                resp_text = resp.text.strip()
                # SMSHorizon returns response string (e.g. numeric message ID or error code)
                if "error" in resp_text.lower() or "fail" in resp_text.lower():
                    logger.error(
                        f"[SMS Gateway] request_id={req_id} status=dispatch_failed provider_msg={resp_text[:100]}"
                    )
                    return {
                        "status": "dispatch_failed",
                        "gateway": "SMSHorizon",
                        "message": f"SMS dispatch rejected by SMSHorizon: {resp_text}",
                        "request_id": req_id,
                        "recipients_count": 0,
                    }
                
                logger.info(
                    f"[SMS Gateway] request_id={req_id} status=sent recipients={len(clean_numbers)}"
                )
                return {
                    "status": "sent",
                    "gateway": "SMSHorizon",
                    "message": f"SMS accepted by SMSHorizon gateway for dispatch (ID: {resp_text}).",
                    "request_id": req_id,
                    "recipients_count": len(clean_numbers),
                }
            else:
                logger.error(
                    f"[SMS Gateway] request_id={req_id} status=dispatch_failed http_code={resp.status_code}"
                )
                return {
                    "status": "dispatch_failed",
                    "gateway": "SMSHorizon",
                    "message": f"SMSHorizon API returned HTTP status {resp.status_code}.",
                    "request_id": req_id,
                    "recipients_count": 0,
                }
        except (requests.Timeout, requests.ConnectionError) as net_err:
            logger.error(f"[SMS Gateway] request_id={req_id} status=provider_unavailable err={net_err}")
            return {
                "status": "provider_unavailable",
                "gateway": "SMSHorizon",
                "message": "SMSHorizon gateway timeout or network connection error.",
                "request_id": req_id,
                "recipients_count": 0,
            }
        except Exception as ex:
            logger.error(f"[SMS Gateway] request_id={req_id} status=dispatch_failed err={ex}")
            return {
                "status": "dispatch_failed",
                "gateway": "SMSHorizon",
                "message": f"SMS dispatch failed due to internal exception: {str(ex)}",
                "request_id": req_id,
                "recipients_count": 0,
            }


sms_service = SmsBroadcastService()

