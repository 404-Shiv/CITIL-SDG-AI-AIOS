"""
Root Cause Intelligence Module.
Explains WHY a student is at risk using feature importance from the risk model.
"""

import numpy as np


def analyze_root_causes(student_id):
    """Identify and rank the root causes of academic risk for a student."""
    from ml.risk_predictor import predict_risk, get_feature_importance
    from models.database import get_student, get_attendance, get_assessments, get_lms_activity, get_historical_grades
    
    student = get_student(student_id)
    if not student:
        return {'error': 'Student not found'}
    
    # Get risk prediction
    risk_result = predict_risk(student_id)
    features = risk_result['features']
    
    # Get model feature importance
    model_importance = get_feature_importance()
    
    # Analyze each factor
    factors = []
    
    # 1. Attendance
    att_pct = features['attendance_pct']
    factors.append({
        'factor': 'Attendance',
        'value': att_pct,
        'unit': '%',
        'threshold': 75,
        'status': _get_status(att_pct, 75, 60),
        'impact': round(model_importance.get('attendance_pct', 0.15) * 100, 1),
        'detail': _get_attendance_detail(att_pct),
        'icon': 'calendar',
        'color': _get_color(att_pct, 75, 60),
    })
    
    # 2. Assessment Performance
    avg_assess = features['avg_assessment']
    factors.append({
        'factor': 'Assessment Scores',
        'value': avg_assess,
        'unit': '%',
        'threshold': 55,
        'status': _get_status(avg_assess, 55, 40),
        'impact': round(model_importance.get('avg_assessment', 0.2) * 100, 1),
        'detail': _get_assessment_detail(avg_assess, student_id),
        'icon': 'clipboard',
        'color': _get_color(avg_assess, 55, 40),
    })
    
    # 3. Assignment Submissions
    sub_rate = features['assignment_submission_rate']
    factors.append({
        'factor': 'Assignment Submissions',
        'value': sub_rate,
        'unit': '%',
        'threshold': 70,
        'status': _get_status(sub_rate, 70, 50),
        'impact': round(model_importance.get('assignment_submission_rate', 0.15) * 100, 1),
        'detail': _get_submission_detail(sub_rate),
        'icon': 'file-text',
        'color': _get_color(sub_rate, 70, 50),
    })
    
    # 4. LMS Engagement
    lms_score = features['lms_activity_score']
    factors.append({
        'factor': 'LMS Engagement',
        'value': lms_score,
        'unit': '%',
        'threshold': 50,
        'status': _get_status(lms_score, 50, 30),
        'impact': round(model_importance.get('lms_activity_score', 0.15) * 100, 1),
        'detail': _get_lms_detail(lms_score),
        'icon': 'monitor',
        'color': _get_color(lms_score, 50, 30),
    })
    
    # 5. Historical GPA
    hist_gpa = features['historical_gpa']
    actual_gpa = hist_gpa / 10  # convert back to 10-point scale
    factors.append({
        'factor': 'Historical GPA',
        'value': round(actual_gpa, 2),
        'unit': '/10',
        'threshold': 6.0,
        'status': _get_status(hist_gpa, 60, 40),
        'impact': round(model_importance.get('historical_gpa', 0.15) * 100, 1),
        'detail': _get_gpa_detail(actual_gpa),
        'icon': 'trending-up',
        'color': _get_color(hist_gpa, 60, 40),
    })
    
    # 6. Engagement Trend
    eng_trend = features['engagement_trend']
    factors.append({
        'factor': 'Engagement Trend',
        'value': eng_trend,
        'unit': '%',
        'threshold': -10,
        'status': 'good' if eng_trend > -10 else ('warning' if eng_trend > -30 else 'critical'),
        'impact': round(model_importance.get('engagement_trend', 0.1) * 100, 1),
        'detail': _get_trend_detail(eng_trend),
        'icon': 'activity',
        'color': '#22c55e' if eng_trend > -10 else ('#f59e0b' if eng_trend > -30 else '#ef4444'),
    })
    
    # Sort by impact (highest first)
    factors.sort(key=lambda x: x['impact'], reverse=True)
    
    # Identify primary causes (factors with warning or critical status)
    primary_causes = [f for f in factors if f['status'] in ['warning', 'critical']]
    
    # Generate intervention recommendations
    interventions = _generate_interventions(primary_causes, student_id)
    
    return {
        'student_id': student_id,
        'student_name': student['name'],
        'risk_level': risk_result['risk_level'],
        'risk_score': risk_result['risk_score'],
        'factors': factors,
        'primary_causes': primary_causes,
        'interventions': interventions,
    }


def _get_status(value, good_threshold, critical_threshold):
    if value >= good_threshold:
        return 'good'
    elif value >= critical_threshold:
        return 'warning'
    else:
        return 'critical'


def _get_color(value, good_threshold, critical_threshold):
    if value >= good_threshold:
        return '#22c55e'
    elif value >= critical_threshold:
        return '#f59e0b'
    else:
        return '#ef4444'


def _get_attendance_detail(pct):
    if pct >= 85:
        return "Excellent attendance. Keep it up!"
    elif pct >= 75:
        return "Attendance is acceptable but could improve."
    elif pct >= 60:
        return "Attendance is below requirement. Multiple classes missed."
    else:
        return "Critical attendance shortage. At risk of detention."


def _get_assessment_detail(avg, student_id):
    if avg >= 70:
        return "Strong academic performance across assessments."
    elif avg >= 55:
        return "Average performance. Room for improvement in weaker subjects."
    elif avg >= 40:
        return "Below average scores. Multiple subjects need attention."
    else:
        return "Critical performance level. Immediate intervention required."


def _get_submission_detail(rate):
    if rate >= 85:
        return "Excellent submission record."
    elif rate >= 70:
        return "Good but some assignments missed."
    elif rate >= 50:
        return "Multiple assignments missing. Pattern of incomplete work."
    else:
        return "Majority of assignments not submitted. Serious concern."


def _get_lms_detail(score):
    if score >= 70:
        return "Active LMS user. Regularly accesses learning materials."
    elif score >= 50:
        return "Moderate LMS usage. Could benefit from more engagement."
    elif score >= 30:
        return "Low LMS engagement. Missing learning resources."
    else:
        return "Minimal LMS activity. Not utilizing online resources."


def _get_gpa_detail(gpa):
    if gpa >= 8.0:
        return "Strong academic history with consistently high GPA."
    elif gpa >= 6.0:
        return "Decent academic record with room for improvement."
    elif gpa >= 4.0:
        return "Below average GPA. Struggling with coursework."
    else:
        return "Very low historical GPA. Academic probation territory."


def _get_trend_detail(trend):
    if trend > 10:
        return "Engagement is improving. Positive trajectory!"
    elif trend > -10:
        return "Engagement is stable."
    elif trend > -30:
        return "Noticeable decline in engagement over the semester."
    else:
        return "Severe disengagement detected. Immediate attention needed."


def _generate_interventions(primary_causes, student_id):
    """Generate specific intervention recommendations based on root causes."""
    interventions = []
    
    for cause in primary_causes:
        if cause['factor'] == 'Attendance':
            interventions.append({
                'type': 'attendance',
                'title': 'Attendance Intervention',
                'description': 'Schedule a meeting to discuss attendance barriers. Consider flexible scheduling or remote options.',
                'urgency': 'high' if cause['status'] == 'critical' else 'medium',
                'actions': [
                    'Contact student to understand absence reasons',
                    'Consider mentoring or buddy system',
                    'Review class schedule conflicts',
                ]
            })
        
        elif cause['factor'] == 'Assessment Scores':
            interventions.append({
                'type': 'academic',
                'title': 'Academic Support',
                'description': 'Arrange supplementary learning sessions and connect with peer tutors.',
                'urgency': 'high' if cause['status'] == 'critical' else 'medium',
                'actions': [
                    'Assign a peer tutor for weak subjects',
                    'Provide additional practice materials',
                    'Schedule extra lab sessions',
                ]
            })
        
        elif cause['factor'] == 'Assignment Submissions':
            interventions.append({
                'type': 'engagement',
                'title': 'Assignment Completion Support',
                'description': 'Help student develop a study schedule and break assignments into manageable tasks.',
                'urgency': 'medium',
                'actions': [
                    'Create a structured assignment calendar',
                    'Set intermediate deadlines',
                    'Pair with study partner for accountability',
                ]
            })
        
        elif cause['factor'] == 'LMS Engagement':
            interventions.append({
                'type': 'digital',
                'title': 'Digital Engagement Plan',
                'description': 'Ensure student has access and motivation to use LMS resources.',
                'urgency': 'medium',
                'actions': [
                    'Verify LMS access and technical issues',
                    'Highlight specific resources relevant to gaps',
                    'Set weekly engagement targets',
                ]
            })
        
        elif cause['factor'] == 'Engagement Trend':
            interventions.append({
                'type': 'wellbeing',
                'title': 'Student Wellbeing Check',
                'description': 'Declining engagement may indicate personal issues. A supportive conversation is recommended.',
                'urgency': 'high',
                'actions': [
                    'Schedule a private counseling session',
                    'Connect with student wellness services',
                    'Reduce academic pressure temporarily if needed',
                ]
            })
    
    return interventions
