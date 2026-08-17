"""
RAKSHAK Alert Service

Generates alerts from fatigue assessment results.
Implements cooldown logic to prevent duplicate alert spam.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Alert, AlertType, AlertSeverity, RiskCategory
from app.ai.interface import FatigueResult

# In-memory cooldown tracker: (soldier_id, alert_type) -> last_alert_time
_last_alert_time: dict[tuple, datetime] = {}


def _is_in_cooldown(soldier_id: int, alert_type: AlertType) -> bool:
    key = (soldier_id, alert_type)
    last = _last_alert_time.get(key)
    if last is None:
        return False
    return (datetime.utcnow() - last).total_seconds() < settings.ALERT_COOLDOWN_SECONDS


def _record_alert(soldier_id: int, alert_type: AlertType):
    _last_alert_time[(soldier_id, alert_type)] = datetime.utcnow()


async def check_and_create_alert(
    soldier_id: int,
    fatigue_result: FatigueResult,
    db: AsyncSession,
    mission_id: Optional[int] = None,
) -> Optional[Alert]:
    """
    Evaluate the fatigue result and create an Alert if thresholds are crossed.
    Respects cooldown to avoid alert flooding.
    """
    score = fatigue_result.fatigue_score
    category = fatigue_result.risk_category
    
    # Determine alert type and severity
    alert_type: Optional[AlertType] = None
    severity: Optional[AlertSeverity] = None
    message = ""
    
    if category == RiskCategory.CRITICAL or score >= 75:
        alert_type = AlertType.FATIGUE_CRITICAL
        severity = AlertSeverity.CRITICAL
        message = (
            f"CRITICAL fatigue risk detected (score={score:.1f}). "
            f"Contributors: HR_dev={fatigue_result.contributors.get('hr_deviation', 0):.2f}, "
            f"HRV_det={fatigue_result.contributors.get('hrv_deterioration', 0):.2f}, "
            f"Activity={fatigue_result.contributors.get('activity_load', 0):.2f}. "
            "Immediate rest recommended."
        )
    elif category == RiskCategory.HIGH or score >= 55:
        alert_type = AlertType.FATIGUE_HIGH
        severity = AlertSeverity.HIGH
        message = (
            f"HIGH fatigue risk detected (score={score:.1f}). "
            f"Monitor soldier closely. HRV deterioration: {fatigue_result.contributors.get('hrv_deterioration', 0):.2f}."
        )
    elif category == RiskCategory.ELEVATED or score >= 30:
        alert_type = AlertType.FATIGUE_ELEVATED
        severity = AlertSeverity.ELEVATED
        message = f"Elevated fatigue risk (score={score:.1f}). Continued monitoring advised."
    
    if alert_type is None:
        return None  # NORMAL — no alert needed
    
    # Check cooldown
    if _is_in_cooldown(soldier_id, alert_type):
        return None
    
    # Create alert
    alert = Alert(
        soldier_id=soldier_id,
        timestamp=datetime.utcnow(),
        alert_type=alert_type,
        severity=severity,
        message=message,
        mission_id=mission_id,
        fatigue_score_at_alert=score,
        is_acknowledged=False,
    )
    db.add(alert)
    await db.commit()
    _record_alert(soldier_id, alert_type)
    return alert
