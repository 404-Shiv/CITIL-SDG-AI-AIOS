"""Peer matching routes."""

from flask import Blueprint, jsonify
from ml.peer_matcher import find_peer_matches, suggest_study_groups

peer_bp = Blueprint('peers', __name__)


@peer_bp.route('/api/peers/<student_id>', methods=['GET'])
def get_peers(student_id):
    """Get peer match suggestions for a student."""
    result = find_peer_matches(student_id, top_n=5)
    return jsonify(result)


@peer_bp.route('/api/study-groups', methods=['GET'])
def get_study_groups():
    """Get suggested study groups."""
    groups = suggest_study_groups()
    return jsonify({'groups': groups, 'total': len(groups)})
