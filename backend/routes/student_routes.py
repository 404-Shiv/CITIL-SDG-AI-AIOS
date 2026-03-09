"""Student data routes."""

from flask import Blueprint, jsonify
from models.database import get_all_students, get_student, get_attendance, get_assessments, get_lms_activity, get_historical_grades

student_bp = Blueprint('students', __name__)


@student_bp.route('/api/students', methods=['GET'])
def list_students():
    """Get all students."""
    students = get_all_students()
    return jsonify({'students': students, 'total': len(students)})


@student_bp.route('/api/students/<student_id>/info', methods=['GET'])
def get_student_personal_info(student_id):
    """Get personal info for a student."""
    from models.database import get_db
    db = get_db()
    
    # Initialize info dict if it doesn't exist
    if 'personal_info' not in db:
        db['personal_info'] = {}
        
    info = db['personal_info'].get(student_id, {})
    return jsonify({'info': info})


@student_bp.route('/api/students/<student_id>/info', methods=['POST'])
def update_student_personal_info(student_id):
    """Update personal info for a student."""
    from flask import request
    from models.database import get_db
    db = get_db()
    
    data = request.get_json()
    
    # Initialize info dict if it doesn't exist
    if 'personal_info' not in db:
        db['personal_info'] = {}
        
    # Get existing or create new
    existing_info = db['personal_info'].get(student_id, {})
    
    # Update explicitly allowed fields
    for field in ['phone', 'email', 'address', 'parent_contact', 'medical_info']:
        if field in data:
            existing_info[field] = data[field]
            
    db['personal_info'][student_id] = existing_info
    
    return jsonify({'success': True, 'info': existing_info})


@student_bp.route('/api/students/<student_id>', methods=['GET'])
def get_student_detail(student_id):
    """Get detailed student info."""
    student = get_student(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    attendance = get_attendance(student_id)
    assessments = get_assessments(student_id)
    lms = get_lms_activity(student_id)
    grades = get_historical_grades(student_id)
    
    # Compute summary stats
    att_pct = sum(1 for a in attendance if a['present']) / len(attendance) * 100 if attendance else 0
    
    return jsonify({
        'student': student,
        'attendance': {
            'records': attendance,
            'percentage': round(att_pct, 1),
            'total_days': len(attendance),
            'present_days': sum(1 for a in attendance if a['present']),
        },
        'assessments': assessments,
        'lms_activity': lms,
        'historical_grades': grades,
    })
