"""Authentication and peer request routes."""

from flask import Blueprint, jsonify, request
from models.database import get_all_students, get_student

auth_bp = Blueprint('auth', __name__)

# ─── In-memory stores ───
# Peer requests: { request_id: { from, to, status, timestamp } }
_peer_requests = {}
_request_counter = 0


# ───────── AUTH ─────────

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    """
    Login with credentials.
    Student: id = student_id (e.g. S001), password = "123"
    Teacher: id = "teacher", password = "123"
    """
    data = request.get_json()
    user_id = data.get('id', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'student')

    if not user_id or not password:
        return jsonify({'success': False, 'error': 'Please enter both ID and password.'}), 400

    # Teacher login
    if role == 'teacher' or user_id.upper().startswith('T'):
        # Just a simple hackathon check: T followed by numbers
        if password == '123':
            return jsonify({'success': True, 'role': 'teacher', 'user': {'id': user_id.upper(), 'name': 'Faculty Admin'}})
        else:
            return jsonify({'success': False, 'error': 'Incorrect password.'}), 401

    # Admin login
    if role == 'admin' or user_id.upper().startswith('A'):
        if password == '123':
            return jsonify({'success': True, 'role': 'admin', 'user': {'id': user_id.upper(), 'name': 'System Administrator'}})
        else:
            return jsonify({'success': False, 'error': 'Incorrect password.'}), 401

    # Student login — id must match a student
    student = get_student(user_id.upper())
    if not student:
        return jsonify({'success': False, 'error': f'Student ID "{user_id}" not found.'}), 404

    if password == '123':
        return jsonify({
            'success': True,
            'role': 'student',
            'user': {
                'id': student['id'],
                'name': student['name'],
                'department': student['department'],
                'semester': student['semester'],
            }
        })
    else:
        return jsonify({'success': False, 'error': 'Incorrect password.'}), 401


# ───────── PEER REQUESTS ─────────

@auth_bp.route('/api/peer-requests/send', methods=['POST'])
def send_peer_request():
    """Send a peer study request to another student."""
    global _request_counter
    data = request.get_json()
    from_id = data.get('from_id', '')
    to_id = data.get('to_id', '')
    message = data.get('message', 'Would you like to study together?')

    if not from_id or not to_id:
        return jsonify({'error': 'Both from_id and to_id required'}), 400
    if from_id == to_id:
        return jsonify({'error': 'Cannot send request to yourself'}), 400

    # Check for existing request between these two
    for rid, req in _peer_requests.items():
        if req['status'] == 'pending':
            if (req['from_id'] == from_id and req['to_id'] == to_id):
                return jsonify({'error': 'Request already sent'}), 409
            if (req['from_id'] == to_id and req['to_id'] == from_id):
                return jsonify({'error': 'This student already sent you a request — check your pending requests!'}), 409

    from_student = get_student(from_id)
    to_student = get_student(to_id)
    if not from_student or not to_student:
        return jsonify({'error': 'Student not found'}), 404

    _request_counter += 1
    req_id = f'PR{_request_counter:04d}'
    _peer_requests[req_id] = {
        'id': req_id,
        'from_id': from_id,
        'from_name': from_student['name'],
        'from_dept': from_student['department'],
        'from_avatar': from_student['avatar_color'],
        'to_id': to_id,
        'to_name': to_student['name'],
        'to_dept': to_student['department'],
        'to_avatar': to_student['avatar_color'],
        'message': message,
        'status': 'pending',  # pending | accepted | rejected
    }

    return jsonify({'success': True, 'request_id': req_id, 'message': f'Request sent to {to_student["name"]}!'})


@auth_bp.route('/api/peer-requests/respond', methods=['POST'])
def respond_peer_request():
    """Accept or reject a peer request."""
    data = request.get_json()
    req_id = data.get('request_id', '')
    action = data.get('action', '')  # 'accept' or 'reject'

    if req_id not in _peer_requests:
        return jsonify({'error': 'Request not found'}), 404

    if action not in ('accept', 'reject'):
        return jsonify({'error': 'Action must be "accept" or "reject"'}), 400

    req = _peer_requests[req_id]
    if req['status'] != 'pending':
        return jsonify({'error': f'Request already {req["status"]}'}), 409

    req['status'] = 'accepted' if action == 'accept' else 'rejected'

    return jsonify({
        'success': True,
        'message': f'Request {req["status"]}!',
        'request': req,
    })


@auth_bp.route('/api/peer-requests/<student_id>', methods=['GET'])
def get_peer_requests(student_id):
    """Get all peer requests for a student (sent, received, accepted)."""
    sent = []
    received = []
    accepted = []

    for rid, req in _peer_requests.items():
        if req['from_id'] == student_id:
            sent.append(req)
            if req['status'] == 'accepted':
                accepted.append({
                    'id': req['to_id'],
                    'name': req['to_name'],
                    'department': req['to_dept'],
                    'avatar_color': req['to_avatar'],
                })
        elif req['to_id'] == student_id:
            received.append(req)
            if req['status'] == 'accepted':
                accepted.append({
                    'id': req['from_id'],
                    'name': req['from_name'],
                    'department': req['from_dept'],
                    'avatar_color': req['from_avatar'],
                })

    pending_received = [r for r in received if r['status'] == 'pending']

    return jsonify({
        'sent': sent,
        'pending_received': pending_received,
        'accepted_partners': accepted,
        'counts': {
            'pending_sent': sum(1 for r in sent if r['status'] == 'pending'),
            'pending_received': len(pending_received),
            'accepted': len(accepted),
        }
    })

# ───────── ADMIN ENDPOINTS ─────────

@auth_bp.route('/api/admin/enroll', methods=['POST'])
def admin_enroll():
    """Enroll a new student in the system."""
    data = request.get_json()
    name = data.get('name')
    dept = data.get('department')
    semester = data.get('semester', 1)
    
    if not name or not dept:
        return jsonify({'error': 'Name and department required'}), 400
        
    from models.database import get_db
    db = get_db()
    students = db['students']
    
    # Generate new ID (e.g., S016)
    new_id_num = len(students) + 1
    new_id = f"S{new_id_num:03d}"
    
    new_student = {
        'id': new_id,
        'name': name,
        'department': dept,
        'semester': semester,
        'avatar_color': '#14b8a6'
    }
    
    students.append(new_student)
    
    # Generate mock baseline records so the dashboards do not crash
    db['attendance'][new_id] = [{'date': '2023-10-01', 'present': True} for _ in range(30)]
    db['assessments'][new_id] = {'internals': {}, 'base_performance': 75}
    db['lms_activity'][new_id] = []
    db['historical_grades'][new_id] = []
    
    return jsonify({
        'success': True,
        'message': 'Student enrolled successfully',
        'student': new_student
    })
