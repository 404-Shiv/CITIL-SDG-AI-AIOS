"""Risk prediction routes."""

from flask import Blueprint, jsonify
from ml.risk_predictor import predict_risk, get_class_summary

risk_bp = Blueprint('risk', __name__)


@risk_bp.route('/api/risk/<student_id>', methods=['GET'])
def get_risk(student_id):
    """Get risk prediction for a student."""
    result = predict_risk(student_id)
    return jsonify(result)


@risk_bp.route('/api/risk/class-summary', methods=['GET'])
def class_summary():
    """Get risk summary for all students."""
    result = get_class_summary()
    return jsonify(result)
