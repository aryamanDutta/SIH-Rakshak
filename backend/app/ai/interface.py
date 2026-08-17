"""
RAKSHAK Fatigue Model Interface

All fatigue estimation models must implement the FatigueModel interface.
This ensures the AI layer is swappable without changing the API or processing pipeline.

Current implementation:
    HeuristicFatigueModel — weighted deviation scoring (heuristic prototype)

Future implementations:
    MLFatigueModel — trained scikit-learn or deep learning model
    (requires labeled fatigue dataset, not available at prototype stage)

DISCLAIMER:
    All RAKSHAK fatigue assessments are PROTOTYPE heuristic estimates.
    They are NOT clinically validated. They are NOT medical diagnoses.
    They should NOT be used as the sole basis for medical decisions.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from datetime import datetime

class RiskCategory:
    NORMAL = "NORMAL"
    ELEVATED = "ELEVATED"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

@dataclass
class FatigueResult:
    """Output of the fatigue model."""
    soldier_id: int
    timestamp: datetime
    fatigue_score: float          # 0–100
    risk_category: str            # NORMAL, ELEVATED, HIGH, CRITICAL
    contributors: dict            # {"hr_deviation": float, "hrv_deterioration": float, ...} (0–1 scale each)
    model_version: str
    baseline_valid: bool
    activity_context: Optional[str] = None
    mission_id: Optional[int] = None

class FatigueModel(ABC):
    """Abstract base class for RAKSHAK fatigue estimation models."""
    
    @property
    @abstractmethod
    def model_version(self) -> str:
        ...
    
    @abstractmethod
    def predict(
        self,
        features,          # ExtractedFeatures
        deviations: dict,  # from BaselineEngine.compute_deviations()
        baseline_valid: bool,
        mission_id: Optional[int] = None,
    ) -> FatigueResult:
        """
        Estimate fatigue risk from extracted features and baseline deviations.
        
        Args:
            features:       PhysiologicalFeatures extracted from the current window
            deviations:     Normalized deviations from personal baseline
            baseline_valid: Whether the personal baseline has sufficient data
            mission_id:     Associated mission (for context)
        
        Returns:
            FatigueResult with score, category, and per-contributor breakdown
        """
        ...
    
    @staticmethod
    def score_to_category(score: float) -> str:
        """Convert a 0–100 fatigue score to a risk category."""
        if score < 30:
            return RiskCategory.NORMAL
        elif score < 55:
            return RiskCategory.ELEVATED
        elif score < 75:
            return RiskCategory.HIGH
        else:
            return RiskCategory.CRITICAL
