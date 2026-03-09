"""Learning recommendation routes."""

from flask import Blueprint, jsonify
from ml.smart_learn import get_learning_recommendations

learn_bp = Blueprint('learn', __name__)


@learn_bp.route('/api/learn/<student_id>', methods=['GET'])
def get_recommendations(student_id):
    """Get personalized learning recommendations for a student."""
    result = get_learning_recommendations(student_id)
    return jsonify(result)
