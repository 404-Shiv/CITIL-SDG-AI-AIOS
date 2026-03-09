"""Anomaly detection routes."""

from flask import Blueprint, jsonify
from ml.anomaly_detector import detect_anomalies, get_all_alerts

anomaly_bp = Blueprint('anomalies', __name__)


@anomaly_bp.route('/api/anomalies/<student_id>', methods=['GET'])
def get_anomalies(student_id):
    """Get anomaly detection results for a student."""
    result = detect_anomalies(student_id)
    return jsonify(result)


@anomaly_bp.route('/api/anomalies/alerts', methods=['GET'])
def get_alerts():
    """Get all anomaly alerts."""
    alerts = get_all_alerts()
    return jsonify({'alerts': alerts, 'total': len(alerts)})
