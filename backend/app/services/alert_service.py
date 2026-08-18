"""
RAKSHAK Alert Service

Generates alerts from fatigue assessment results.
Implements cooldown logic to prevent duplicate alert spam.
Manages alert lifecycle: ACTIVE -> ACKNOWLEDGED / RESOLVED.
"""
from datetime import datetime, timedelta
from typing import Optional, List
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import Alert, AlertType, AlertSeverity, RiskCategory, MissionEvent, MissionPhase
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
    If risk has returned to NORMAL, auto-resolves any active unacknowledged alerts for this soldier.
    Respects cooldown to avoid alert flooding.
    """
    score = fatigue_result.fatigue_score
    category = fatigue_result.risk_category

    # If soldier is back to NORMAL, auto-resolve any unacknowledged alerts
    if category == RiskCategory.NORMAL or (isinstance(category, str) and category == "NORMAL") or score < 30.0:
        active_result = await db.execute(
            select(Alert).where(Alert.soldier_id == soldier_id, Alert.is_acknowledged == False)
        )
        active_alerts = list(active_result.scalars().all())
        if active_alerts:
            now = datetime.utcnow()
            for a in active_alerts:
                a.is_acknowledged = True
                a.acknowledged_at = now
            await db.commit()
        return None

    # Determine alert type and severity for elevated/high/critical
    alert_type: Optional[AlertType] = None
    severity: Optional[AlertSeverity] = None
    message = ""

    if category == RiskCategory.CRITICAL or (isinstance(category, str) and category == "CRITICAL") or score >= 75:
        alert_type = AlertType.FATIGUE_CRITICAL
        severity = AlertSeverity.CRITICAL
        message = (
            f"CRITICAL fatigue risk detected for Soldier {soldier_id} (score={score:.1f}). "
            f"HRV deterioration: {fatigue_result.contributors.get('hrv_deterioration', 0):.2f}. "
            "Immediate rest rotation recommended."
        )
    elif category == RiskCategory.HIGH or (isinstance(category, str) and category == "HIGH") or score >= 55:
        alert_type = AlertType.FATIGUE_HIGH
        severity = AlertSeverity.HIGH
        message = (
            f"HIGH fatigue risk detected for Soldier {soldier_id} (score={score:.1f}). "
            f"Monitor soldier closely. HRV deterioration: {fatigue_result.contributors.get('hrv_deterioration', 0):.2f}."
        )
    elif category == RiskCategory.ELEVATED or (isinstance(category, str) and category == "ELEVATED") or score >= 30:
        alert_type = AlertType.FATIGUE_ELEVATED
        severity = AlertSeverity.ELEVATED
        message = f"Elevated fatigue risk for Soldier {soldier_id} (score={score:.1f}). Continued monitoring advised."

    if alert_type is None:
        return None

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

    # Record mission event if attached to a mission
    if mission_id:
        phase = MissionPhase.HIGH_ACTIVITY if severity in (AlertSeverity.HIGH, AlertSeverity.CRITICAL) else MissionPhase.PATROL
        event = MissionEvent(
            mission_id=mission_id,
            timestamp=datetime.utcnow(),
            phase=phase,
            description=f"Alert [{severity.value}]: {message}",
            affected_soldier_ids=str([soldier_id]),
        )
        db.add(event)

    await db.commit()
    _record_alert(soldier_id, alert_type)
    return alert


async def acknowledge_alert(alert_id: int, db: AsyncSession) -> Optional[Alert]:
    """Acknowledge a specific alert by ID."""
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if alert and not alert.is_acknowledged:
        alert.is_acknowledged = True
        alert.acknowledged_at = datetime.utcnow()
        await db.commit()
    return alert


async def get_all_alerts(
    db: AsyncSession, limit: int = 50, active_only: bool = False
) -> List[Alert]:
    """Get system-wide alerts."""
    stmt = select(Alert).order_by(desc(Alert.timestamp)).limit(limit)
    if active_only:
        stmt = stmt.where(Alert.is_acknowledged == False)
    result = await db.execute(stmt)
    return list(result.scalars().all())
