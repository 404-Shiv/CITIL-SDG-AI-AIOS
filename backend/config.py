"""Application configuration."""

class Config:
    DEBUG = True
    HOST = '0.0.0.0'
    PORT = 5000
    SECRET_KEY = 'sdg-hackathon-academic-risk-platform-2026'
    
    # Number of synthetic students to generate (50 per dept × 3 depts)
    NUM_STUDENTS = 150
    
    # ML Model parameters
    RISK_THRESHOLD_HIGH = 0.7
    RISK_THRESHOLD_MEDIUM = 0.4
    
    # Anomaly detection
    ANOMALY_CONTAMINATION = 0.15
    
    # Peer matching
    TOP_PEERS = 3
    STUDY_GROUP_SIZE = 4
