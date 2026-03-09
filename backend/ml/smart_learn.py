"""
Smart Learn — Adaptive Learning Recommendation Engine.
Identifies concept gaps and generates personalized learning paths with YouTube resources.
"""

import numpy as np


def _analyze_concept_gaps(student_id):
    """Analyze per-subject performance to identify concept gaps."""
    from models.database import get_assessments
    from seed_data import SUBJECTS
    
    assessments = get_assessments(student_id)
    
    subject_analysis = []
    
    for subj in SUBJECTS:
        analysis = {
            'subject': subj,
            'internal_avg': 0,
            'assignment_avg': 0,
            'lab_score': 0,
            'overall_score': 0,
            'submission_rate': 0,
            'mastery_level': 'Unknown',
            'gap_severity': 'none',
            'trend': 'stable',
        }
        
        if assessments and 'internals' in assessments:
            internals = assessments['internals'].get(subj, [])
            if internals:
                analysis['internal_avg'] = round(np.mean(internals) / 50 * 100, 1)
                
                # Trend: compare first and last internal
                if len(internals) >= 2:
                    if internals[-1] > internals[0] * 1.1:
                        analysis['trend'] = 'improving'
                    elif internals[-1] < internals[0] * 0.8:
                        analysis['trend'] = 'declining'
        
        if assessments and 'assignments' in assessments:
            assigns = assessments['assignments'].get(subj, [])
            if assigns:
                submitted = [a for a in assigns if a['submitted']]
                analysis['submission_rate'] = round(len(submitted) / len(assigns) * 100, 1)
                if submitted:
                    analysis['assignment_avg'] = round(np.mean([a['score'] for a in submitted]) / 10 * 100, 1)
        
        if assessments and 'lab_scores' in assessments:
            analysis['lab_score'] = round(assessments['lab_scores'].get(subj, 0) / 50 * 100, 1)
        
        # Overall score
        analysis['overall_score'] = round(
            analysis['internal_avg'] * 0.5 +
            analysis['assignment_avg'] * 0.3 +
            analysis['lab_score'] * 0.2, 1
        )
        
        # Mastery level
        if analysis['overall_score'] >= 80:
            analysis['mastery_level'] = 'Advanced'
            analysis['gap_severity'] = 'none'
        elif analysis['overall_score'] >= 60:
            analysis['mastery_level'] = 'Proficient'
            analysis['gap_severity'] = 'minor'
        elif analysis['overall_score'] >= 40:
            analysis['mastery_level'] = 'Developing'
            analysis['gap_severity'] = 'moderate'
        else:
            analysis['mastery_level'] = 'Beginner'
            analysis['gap_severity'] = 'severe'
        
        subject_analysis.append(analysis)
    
    # Sort by gap severity (most severe first)
    severity_order = {'severe': 0, 'moderate': 1, 'minor': 2, 'none': 3}
    subject_analysis.sort(key=lambda x: severity_order.get(x['gap_severity'], 4))
    
    return subject_analysis


def get_learning_recommendations(student_id):
    """Generate adaptive learning path and resource recommendations."""
    from seed_data import YOUTUBE_PLAYLISTS, SUBJECTS
    from models.database import get_student
    
    student = get_student(student_id)
    if not student:
        return {'error': 'Student not found'}
    
    concept_gaps = _analyze_concept_gaps(student_id)
    
    # Build learning path
    learning_path = []
    youtube_recommendations = []
    
    for i, subj_analysis in enumerate(concept_gaps):
        subj = subj_analysis['subject']
        
        if subj_analysis['gap_severity'] == 'none':
            continue
        
        # Build path entry
        path_entry = {
            'priority': i + 1,
            'subject': subj,
            'current_level': subj_analysis['mastery_level'],
            'target_level': _get_target_level(subj_analysis['mastery_level']),
            'gap_severity': subj_analysis['gap_severity'],
            'overall_score': subj_analysis['overall_score'],
            'recommendations': [],
        }
        
        # Generate specific recommendations
        if subj_analysis['internal_avg'] < 50:
            path_entry['recommendations'].append({
                'type': 'concept_review',
                'action': f"Review core concepts of {subj}",
                'detail': f"Internal assessment average is {subj_analysis['internal_avg']}%. Focus on fundamental concepts.",
                'priority': 'high',
            })
        
        if subj_analysis['submission_rate'] < 70:
            path_entry['recommendations'].append({
                'type': 'practice',
                'action': f"Complete pending {subj} assignments",
                'detail': f"Submission rate is only {subj_analysis['submission_rate']}%. Regular practice is essential.",
                'priority': 'high' if subj_analysis['submission_rate'] < 50 else 'medium',
            })
        
        if subj_analysis['lab_score'] < 50:
            path_entry['recommendations'].append({
                'type': 'hands_on',
                'action': f"Practice {subj} lab exercises",
                'detail': f"Lab score is {subj_analysis['lab_score']}%. Hands-on practice will reinforce concepts.",
                'priority': 'medium',
            })
        
        if subj_analysis['trend'] == 'declining':
            path_entry['recommendations'].append({
                'type': 'intervention',
                'action': f"Seek additional help for {subj}",
                'detail': "Performance is declining. Consider office hours or peer tutoring.",
                'priority': 'high',
            })
        
        learning_path.append(path_entry)
        
        # YouTube recommendations
        if subj in YOUTUBE_PLAYLISTS:
            for playlist in YOUTUBE_PLAYLISTS[subj]:
                youtube_recommendations.append({
                    'subject': subj,
                    'title': playlist['title'],
                    'url': playlist['url'],
                    'channel': playlist['channel'],
                    'relevance': subj_analysis['gap_severity'],
                    'priority': i + 1,
                })
    
    # Overall summary
    total_subjects = len(concept_gaps)
    gaps = [g for g in concept_gaps if g['gap_severity'] != 'none']
    severe_gaps = [g for g in gaps if g['gap_severity'] == 'severe']
    
    return {
        'student_id': student_id,
        'student_name': student['name'],
        'summary': {
            'total_subjects': total_subjects,
            'subjects_with_gaps': len(gaps),
            'severe_gaps': len(severe_gaps),
            'overall_readiness': round((total_subjects - len(gaps)) / total_subjects * 100, 1),
        },
        'concept_gaps': concept_gaps,
        'learning_path': learning_path,
        'youtube_recommendations': youtube_recommendations[:10],
    }


def _get_target_level(current_level):
    """Determine target mastery level."""
    level_map = {
        'Beginner': 'Developing',
        'Developing': 'Proficient',
        'Proficient': 'Advanced',
        'Advanced': 'Advanced',
    }
    return level_map.get(current_level, 'Proficient')
