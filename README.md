# RAKSHAK — Soldier Health & Fatigue Monitoring System

RAKSHAK is a modular soldier health and fatigue monitoring platform designed to continuously monitor a soldier's physiological and physical state.

The system is designed around a wearable sensor harness that can be worn underneath existing tactical equipment. The prototype combines physiological and movement data and uses AI-based analysis to generate insights related to fatigue, stress, exertion, readiness and other health indicators.

The current software prototype uses simulated sensor data. The architecture is designed so that simulated data can later be replaced with real sensor streams from an ESP32 without changing the core processing pipeline.

---

## Features

- Real-time soldier health monitoring
- ECG, temperature and movement data processing
- Sensor data preprocessing and feature extraction
- Personalized physiological baseline calculation
- AI-based fatigue and health-state estimation
- Soldier-level monitoring
- Squad-level monitoring architecture
- Modular sensor architecture for future sensors
- Web-based monitoring dashboard

---

## Project Structure

```text
RAKSHAK/
│
├── backend/
│   ├── tests/
│   ├── seed_data.py
│   ├── requirements.txt
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
│
└── README.md
