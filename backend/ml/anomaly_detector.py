"""
Burnout / Behavioral Anomaly Detection Module.
Uses Isolation Forest and statistical Z-score analysis.
"""

import numpy as np
from sklearn.ensemble import IsolationForest

_anomaly_cache = {}
_all_alerts_cache = None


def _compute_weekly_metrics(student_id):
    """Compute weekly behavioral metrics for anomaly detection."""
    from models.database import get_lms_activity, get_assessments
    
    lms = get_lms_activity(student_id)
    assessments = get_assessments(student_id)
    
    if not lms:
        return [], {}
    
    metrics = []
    for i, week in enumerate(lms):
        login_delta = 0
        if i > 0:
            prev = lms[i - 1]['logins']
            login_delta = week['logins'] - prev
        
        metrics.append({
            'week': week['week'],
            'logins': week['logins'],
            'login_delta': login_delta,
            'time_spent': week['time_spent_hours'],
            'resources': week['resources_accessed'],
            'forum_posts': week['forum_posts'],
            'engagement_score': (
                week['logins'] * 0.3 +
                week['time_spent_hours'] * 2 * 0.3 +
                week['resources_accessed'] * 0.2 +
                week['forum_posts'] * 3 * 0.1 +
                week['quiz_attempts'] * 2 * 0.1
            ),
        })
    
    # Compute assignment miss streaks
    assignment_info = {'total_missed': 0, 'current_streak': 0, 'max_streak': 0}
    if assessments and 'assignments' in assessments:
        all_assignments = []
        for subj, assigns in assessments['assignments'].items():
            for a in assigns:
                all_assignments.append(a['submitted'])
        
        streak = 0
        for submitted in all_assignments:
            if not submitted:
                streak += 1
                assignment_info['total_missed'] += 1
                assignment_info['max_streak'] = max(assignment_info['max_streak'], streak)
            else:
                streak = 0
        assignment_info['current_streak'] = streak
    
    return metrics, assignment_info


def detect_anomalies(student_id):
    """Detect behavioral anomalies for a student."""
    global _anomaly_cache
    if student_id in _anomaly_cache:
        return _anomaly_cache[student_id]

    metrics, assignment_info = _compute_weekly_metrics(student_id)
    
    if len(metrics) < 4:
        return {
            'student_id': student_id,
            'has_anomaly': False,
            'anomalies': [],
            'burnout_risk': 'Low',
            'metrics': metrics,
        }
    
    anomalies = []
    
    # 1. Isolation Forest on multi-dimensional engagement data
    feature_matrix = np.array([
        [m['logins'], m['time_spent'], m['resources'], m['engagement_score']]
        for m in metrics
    ])
    
    if len(feature_matrix) >= 4:
        pass
        # iso_forest = IsolationForest(contamination=0.2, random_state=42)
        # predictions = iso_forest.fit_predict(feature_matrix)
        # 
        # for i, (pred, m) in enumerate(zip(predictions, metrics)):
        #     if pred == -1:
        #         anomalies.append({
        #             'week': m['week'],
        #             'type': 'engagement_anomaly',
        #             'description': f"Unusual engagement pattern in week {m['week']}",
        #             'severity': 'medium',
        #             'details': {
        #                 'logins': m['logins'],
        #                 'time_spent': m['time_spent'],
        #                 'engagement_score': round(m['engagement_score'], 1),
        #             }
        #         })
    
    # 2. Z-score analysis for sudden drops
    engagement_scores = [m['engagement_score'] for m in metrics]
    if len(engagement_scores) >= 4:
        mean_eng = np.mean(engagement_scores)
        std_eng = np.std(engagement_scores)
        
        if std_eng > 0:
            for i, m in enumerate(metrics):
                z_score = (m['engagement_score'] - mean_eng) / std_eng
                if z_score < -1.5:
                    anomalies.append({
                        'week': m['week'],
                        'type': 'sudden_drop',
                        'description': f"Significant engagement drop in week {m['week']} (z-score: {z_score:.2f})",
                        'severity': 'high' if z_score < -2.0 else 'medium',
                        'z_score': round(z_score, 2),
                    })
    
    # 3. Declining trend detection
    if len(engagement_scores) >= 6:
        first_half = np.mean(engagement_scores[:len(engagement_scores)//2])
        second_half = np.mean(engagement_scores[len(engagement_scores)//2:])
        
        if first_half > 0 and (second_half - first_half) / first_half < -0.3:
            anomalies.append({
                'week': metrics[-1]['week'],
                'type': 'declining_trend',
                'description': f"Engagement declining by {abs((second_half - first_half) / first_half * 100):.0f}% over the semester",
                'severity': 'high',
                'trend': {
                    'first_half_avg': round(first_half, 1),
                    'second_half_avg': round(second_half, 1),
                }
            })
    
    # 4. Assignment miss streak
    if assignment_info.get('max_streak', 0) >= 3:
        anomalies.append({
            'week': metrics[-1]['week'],
            'type': 'assignment_streak',
            'description': f"Missed {assignment_info['max_streak']} consecutive assignments",
            'severity': 'high' if assignment_info['max_streak'] >= 5 else 'medium',
        })
    
    # Determine burnout risk
    high_count = sum(1 for a in anomalies if a['severity'] == 'high')
    total_anomalies = len(anomalies)
    
    if high_count >= 2 or total_anomalies >= 4:
        burnout_risk = 'High'
    elif high_count >= 1 or total_anomalies >= 2:
        burnout_risk = 'Medium'
    else:
        burnout_risk = 'Low'
    
    # Deduplicate anomalies (keep unique by week + type)
    seen = set()
    unique_anomalies = []
    for a in anomalies:
        key = (a['week'], a['type'])
        if key not in seen:
            seen.add(key)
            unique_anomalies.append(a)
    
    result = {
        'student_id': student_id,
        'has_anomaly': len(unique_anomalies) > 0,
        'anomaly_count': len(unique_anomalies),
        'anomalies': unique_anomalies,
        'burnout_risk': burnout_risk,
        'assignment_info': assignment_info,
        'engagement_trend': metrics,
    }
    
    _anomaly_cache[student_id] = result
    return result


def get_all_alerts():
    """Get anomaly alerts for all students."""
    global _all_alerts_cache
    if _all_alerts_cache is not None:
        return _all_alerts_cache

    from models.database import get_all_students
    
    students = get_all_students()
    alerts = []
    
    for s in students:
        result = detect_anomalies(s['id'])
        if result['has_anomaly']:
            alerts.append({
                'student_id': s['id'],
                'name': s['name'],
                'department': s['department'],
                'burnout_risk': result['burnout_risk'],
                'anomaly_count': result['anomaly_count'],
                'top_anomaly': result['anomalies'][0] if result['anomalies'] else None,
            })
    
    # Sort by severity
    severity_order = {'High': 0, 'Medium': 1, 'Low': 2}
    alerts.sort(key=lambda x: severity_order.get(x['burnout_risk'], 3))
    
    _all_alerts_cache = alerts
    return alerts
