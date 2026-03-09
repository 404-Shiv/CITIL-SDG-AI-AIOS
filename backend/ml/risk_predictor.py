"""
Academic Risk Prediction Model.
Uses Random Forest Classifier to predict student academic risk.
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler

_model = None
_scaler = None
_risk_cache = {}  # Cache risk predictions to avoid recomputation
_class_summary_cache = None
_feature_names = ['attendance_pct', 'avg_assessment', 'assignment_submission_rate', 
                  'lms_activity_score', 'historical_gpa', 'engagement_trend']


def _extract_features(student_id, db):
    """Extract feature vector for a student."""
    from models.database import get_attendance, get_assessments, get_lms_activity, get_historical_grades
    
    # Attendance percentage
    attendance = get_attendance(student_id)
    if attendance:
        att_pct = sum(1 for a in attendance if a['present']) / len(attendance) * 100
    else:
        att_pct = 50.0
    
    # Average assessment score (normalized to 100)
    assessments = get_assessments(student_id)
    if assessments and 'internals' in assessments:
        all_scores = []
        for subj, scores in assessments['internals'].items():
            all_scores.extend([s / 50 * 100 for s in scores])
        avg_assessment = np.mean(all_scores) if all_scores else 50.0
    else:
        avg_assessment = 50.0
    
    # Assignment submission rate
    if assessments and 'assignments' in assessments:
        total_assignments = 0
        submitted = 0
        for subj, assignments_list in assessments['assignments'].items():
            for a in assignments_list:
                total_assignments += 1
                if a['submitted']:
                    submitted += 1
        sub_rate = (submitted / total_assignments * 100) if total_assignments > 0 else 50.0
    else:
        sub_rate = 50.0
    
    # LMS activity score (composite)
    lms = get_lms_activity(student_id)
    if lms:
        avg_logins = np.mean([w['logins'] for w in lms])
        avg_time = np.mean([w['time_spent_hours'] for w in lms])
        avg_resources = np.mean([w['resources_accessed'] for w in lms])
        lms_score = (avg_logins / 20 * 30) + (avg_time / 10 * 40) + (avg_resources / 15 * 30)
        lms_score = min(100, max(0, lms_score))
    else:
        lms_score = 50.0
    
    # Historical GPA (normalized to 100)
    grades = get_historical_grades(student_id)
    if grades:
        hist_gpa = np.mean([g['gpa'] for g in grades]) / 10 * 100
    else:
        hist_gpa = 50.0
    
    # Engagement trend (compare last 4 weeks vs first 4 weeks)
    if lms and len(lms) >= 8:
        first_4 = np.mean([w['logins'] + w['resources_accessed'] for w in lms[:4]])
        last_4 = np.mean([w['logins'] + w['resources_accessed'] for w in lms[-4:]])
        engagement_trend = ((last_4 - first_4) / max(first_4, 1)) * 100
        engagement_trend = max(-100, min(100, engagement_trend))
    else:
        engagement_trend = 0.0
    
    return [att_pct, avg_assessment, sub_rate, lms_score, hist_gpa, engagement_trend]


def train_model(db):
    """Train the risk prediction model on all student data."""
    global _model, _scaler
    
    from models.database import get_all_students
    
    students = get_all_students()
    features = []
    labels = []
    
    for s in students:
        feat = _extract_features(s['id'], db)
        features.append(feat)
        
        # Create synthetic labels based on feature heuristics
        composite = (feat[0] * 0.25 + feat[1] * 0.25 + feat[2] * 0.15 + 
                     feat[3] * 0.15 + feat[4] * 0.15 + (feat[5] + 100) / 2 * 0.05)
        
        if composite > 65:
            labels.append(0)  # Low risk
        elif composite > 40:
            labels.append(1)  # Medium risk
        else:
            labels.append(2)  # High risk
    
    X = np.array(features)
    y = np.array(labels)
    
    _scaler = StandardScaler()
    X_scaled = _scaler.fit_transform(X)
    
    _model = RandomForestClassifier(n_estimators=100, random_state=42, max_depth=5)
    _model.fit(X_scaled, y)
    
    return _model


def predict_risk(student_id, db=None):
    """Predict academic risk for a student."""
    global _model, _scaler, _risk_cache
    
    # Return cached result if available
    if student_id in _risk_cache:
        return _risk_cache[student_id]
    
    if _model is None:
        train_model(db)
    
    features = _extract_features(student_id, db)
    X = np.array([features])
    X_scaled = _scaler.transform(X)
    
    prediction = _model.predict(X_scaled)[0]
    probabilities = _model.predict_proba(X_scaled)[0]
    
    risk_levels = ['Low', 'Medium', 'High']
    risk_level = risk_levels[prediction]
    
    # Generate alerts
    alerts = []
    if features[0] < 60:
        alerts.append({'type': 'attendance', 'message': f'Attendance below 60% ({features[0]:.1f}%)', 'severity': 'high'})
    elif features[0] < 75:
        alerts.append({'type': 'attendance', 'message': f'Attendance below 75% ({features[0]:.1f}%)', 'severity': 'medium'})
    
    if features[1] < 40:
        alerts.append({'type': 'assessment', 'message': f'Average assessment score critically low ({features[1]:.1f}%)', 'severity': 'high'})
    elif features[1] < 55:
        alerts.append({'type': 'assessment', 'message': f'Assessment scores below average ({features[1]:.1f}%)', 'severity': 'medium'})
    
    if features[2] < 50:
        alerts.append({'type': 'assignment', 'message': f'Assignment submission rate low ({features[2]:.1f}%)', 'severity': 'high'})
    
    if features[3] < 40:
        alerts.append({'type': 'lms', 'message': f'LMS engagement very low ({features[3]:.1f}%)', 'severity': 'high'})
    
    if features[5] < -30:
        alerts.append({'type': 'trend', 'message': f'Significant decline in engagement trend ({features[5]:.1f}%)', 'severity': 'high'})
    
    result = {
        'student_id': student_id,
        'risk_level': risk_level,
        'risk_score': round(probabilities[2] * 100, 1) if len(probabilities) > 2 else round(probabilities[-1] * 100, 1),
        'probabilities': {
            'low': round(float(probabilities[0]) * 100, 1) if len(probabilities) > 0 else 0,
            'medium': round(float(probabilities[1]) * 100, 1) if len(probabilities) > 1 else 0,
            'high': round(float(probabilities[2]) * 100, 1) if len(probabilities) > 2 else 0,
        },
        'decline_probability': round(float(probabilities[2] if len(probabilities) > 2 else probabilities[-1]) * 100, 1),
        'alerts': alerts,
        'features': {
            'attendance_pct': round(features[0], 1),
            'avg_assessment': round(features[1], 1),
            'assignment_submission_rate': round(features[2], 1),
            'lms_activity_score': round(features[3], 1),
            'historical_gpa': round(features[4], 1),
            'engagement_trend': round(features[5], 1),
        }
    }
    
    # Cache the result
    _risk_cache[student_id] = result
    return result


def get_feature_importance():
    """Return feature importance from the trained model."""
    if _model is None:
        return {}
    
    importances = _model.feature_importances_
    return {name: round(float(imp), 4) for name, imp in zip(_feature_names, importances)}


def get_class_summary(db=None):
    """Get risk summary across all students."""
    global _class_summary_cache
    
    if _class_summary_cache is not None:
        return _class_summary_cache
    
    from models.database import get_all_students
    
    students = get_all_students()
    summary = {'low': 0, 'medium': 0, 'high': 0, 'total': len(students)}
    risk_scores = []
    
    for s in students:
        result = predict_risk(s['id'], db)
        summary[result['risk_level'].lower()] += 1
        risk_scores.append({
            'student_id': s['id'],
            'name': s['name'],
            'department': s['department'],
            'risk_level': result['risk_level'],
            'risk_score': result['risk_score'],
        })
    
    risk_scores.sort(key=lambda x: x['risk_score'], reverse=True)
    
    _class_summary_cache = {
        'summary': summary,
        'students': risk_scores,
    }
    return _class_summary_cache
