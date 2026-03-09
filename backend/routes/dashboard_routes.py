"""Dashboard aggregate routes."""

from flask import Blueprint, jsonify
from models.database import get_student, get_all_students, get_attendance, get_assessments, get_lms_activity, get_historical_grades
from ml.risk_predictor import predict_risk, get_class_summary
from ml.anomaly_detector import detect_anomalies, get_all_alerts
from ml.peer_matcher import find_peer_matches
from ml.smart_learn import get_learning_recommendations
from ml.root_cause import analyze_root_causes
import numpy as np

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/api/dashboard/student/<student_id>', methods=['GET'])
def student_dashboard(student_id):
    """Get all data needed for the student dashboard in a single call."""
    student = get_student(student_id)
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    # Gather all data
    risk = predict_risk(student_id)
    anomaly = detect_anomalies(student_id)
    peers = find_peer_matches(student_id, top_n=3)
    learning = get_learning_recommendations(student_id)
    
    # Attendance summary
    attendance = get_attendance(student_id)
    att_pct = sum(1 for a in attendance if a['present']) / len(attendance) * 100 if attendance else 0
    
    # Recent attendance trend (last 4 weeks)
    recent_att = attendance[-20:] if len(attendance) >= 20 else attendance
    recent_att_pct = sum(1 for a in recent_att if a['present']) / len(recent_att) * 100 if recent_att else 0
    
    # Assessment averages per subject
    assessments = get_assessments(student_id)
    subject_scores = {}
    if assessments and 'internals' in assessments:
        for subj, scores in assessments['internals'].items():
            subject_scores[subj] = round(np.mean(scores) / 50 * 100, 1)
    
    # LMS weekly trend
    lms = get_lms_activity(student_id)
    lms_trend = [{'week': w['week'], 'logins': w['logins'], 'hours': w['time_spent_hours']} for w in lms] if lms else []
    
    # Historical GPA
    grades = get_historical_grades(student_id)
    
    # Notifications
    notifications = []
    if risk['risk_level'] == 'High':
        notifications.append({'type': 'danger', 'message': 'Your academic risk level is HIGH. Please review your learning recommendations.'})
    elif risk['risk_level'] == 'Medium':
        notifications.append({'type': 'warning', 'message': 'Your academic risk level is MEDIUM. Some areas need improvement.'})
    
    if anomaly['has_anomaly']:
        notifications.append({'type': 'warning', 'message': f"Behavioral anomaly detected: {anomaly['anomalies'][0]['description']}"})
    
    if att_pct < 75:
        notifications.append({'type': 'info', 'message': f'Your attendance is {att_pct:.1f}%. Aim for 75%+ for best outcomes.'})
    
    if learning['summary']['severe_gaps'] > 0:
        notifications.append({'type': 'info', 'message': f"You have {learning['summary']['severe_gaps']} subject(s) needing urgent attention."})
    
    # Compute streak & calendar from attendance
    streak = 0
    max_streak = 0
    for r in reversed(attendance):
        if r['present']:
            streak += 1
            max_streak = max(max_streak, streak)
        else:
            break
    # Overall max streak
    cur = 0
    for r in attendance:
        if r['present']:
            cur += 1
            max_streak = max(max_streak, cur)
        else:
            cur = 0

    # Build attendance calendar (last 30 days)
    from datetime import datetime, timedelta
    today = datetime.now()
    calendar_data = []
    for i, r in enumerate(attendance[-30:]):
        day_date = today - timedelta(days=30 - i - 1)
        calendar_data.append({
            'date': day_date.strftime('%Y-%m-%d'),
            'day': day_date.day,
            'weekday': day_date.strftime('%a'),
            'present': r['present'],
        })

    return jsonify({
        'student': student,
        'risk': risk,
        'attendance': {
            'percentage': round(att_pct, 1),
            'recent_percentage': round(recent_att_pct, 1),
            'records': attendance[-30:],
            'calendar': calendar_data,
            'streak': streak,
            'max_streak': max_streak,
            'total_present': sum(1 for a in attendance if a['present']),
            'total_days': len(attendance),
        },
        'subject_scores': subject_scores,
        'lms_trend': lms_trend,
        'historical_grades': grades,
        'anomaly': {
            'has_anomaly': anomaly['has_anomaly'],
            'burnout_risk': anomaly['burnout_risk'],
            'anomaly_count': anomaly['anomaly_count'],
            'anomalies': anomaly.get('anomalies', [])[:6],
            'engagement_trend': anomaly.get('engagement_trend', []),
            'assignment_info': anomaly.get('assignment_info', {}),
        },
        'peers': peers['matches'] if 'matches' in peers else [],
        'learning': {
            'summary': learning['summary'],
            'learning_path': learning['learning_path'][:5],
            'youtube': learning['youtube_recommendations'][:6],
        },
        'notifications': notifications,
    })


@dashboard_bp.route('/api/dashboard/teacher', methods=['GET'])
def teacher_dashboard():
    """Get all data needed for the teacher dashboard."""
    # Class risk summary
    class_summary = get_class_summary()
    
    # Anomaly alerts
    alerts = get_all_alerts()
    
    # All students with risk info
    students = get_all_students()
    student_details = []
    
    for s in students:
        risk = predict_risk(s['id'])
        attendance = get_attendance(s['id'])
        att_pct = sum(1 for a in attendance if a['present']) / len(attendance) * 100 if attendance else 0
        
        assessments = get_assessments(s['id'])
        avg_score = assessments.get('base_performance', 50) if assessments else 50
        
        lms = get_lms_activity(s['id'])
        avg_logins = np.mean([w['logins'] for w in lms]) if lms else 0
        
        student_details.append({
            'id': s['id'],
            'name': s['name'],
            'department': s['department'],
            'semester': s['semester'],
            'risk_level': risk['risk_level'],
            'risk_score': risk['risk_score'],
            'attendance_pct': round(att_pct, 1),
            'avg_score': round(avg_score, 1),
            'avg_lms_logins': round(avg_logins, 1),
            'avatar_color': s.get('avatar_color', '#6366f1'),
        })
    
    # Sort by risk score descending
    student_details.sort(key=lambda x: x['risk_score'], reverse=True)
    
    # Department analytics
    dept_stats = {}
    for sd in student_details:
        dept = sd['department']
        if dept not in dept_stats:
            dept_stats[dept] = {'total': 0, 'high': 0, 'medium': 0, 'low': 0, 'avg_attendance': [], 'avg_score': []}
        dept_stats[dept]['total'] += 1
        dept_stats[dept][sd['risk_level'].lower()] += 1
        dept_stats[dept]['avg_attendance'].append(sd['attendance_pct'])
        dept_stats[dept]['avg_score'].append(sd['avg_score'])
    
    dept_analytics = []
    for dept, stats in dept_stats.items():
        dept_analytics.append({
            'department': dept,
            'total': stats['total'],
            'high_risk': stats['high'],
            'medium_risk': stats['medium'],
            'low_risk': stats['low'],
            'avg_attendance': round(np.mean(stats['avg_attendance']), 1),
            'avg_score': round(np.mean(stats['avg_score']), 1),
        })
    
    return jsonify({
        'class_summary': class_summary['summary'],
        'students': student_details,
        'alerts': alerts[:10],  # top 10 alerts
        'department_analytics': dept_analytics,
        'total_students': len(students),
    })


@dashboard_bp.route('/api/dashboard/root-cause/<student_id>', methods=['GET'])
def root_cause_dashboard(student_id):
    """Get root cause analysis for a specific student."""
    result = analyze_root_causes(student_id)
    return jsonify(result)
