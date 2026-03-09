"""
Peer Matching System.
Uses cosine similarity on student skill vectors to suggest mentors and study groups.
"""

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


def _build_skill_vector(student_id):
    """Build a per-subject skill vector for a student."""
    from models.database import get_assessments
    from seed_data import SUBJECTS
    
    assessments = get_assessments(student_id)
    
    vector = []
    strengths = []
    weaknesses = []
    
    for subj in SUBJECTS:
        score = 50.0  # default
        
        if assessments and 'internals' in assessments:
            internals = assessments['internals'].get(subj, [])
            if internals:
                internal_avg = np.mean(internals) / 50 * 100
            else:
                internal_avg = 50.0
            
            # Include assignment scores
            assigns = assessments.get('assignments', {}).get(subj, [])
            if assigns:
                assign_scores = [a['score'] / 10 * 100 for a in assigns if a['submitted']]
                assign_avg = np.mean(assign_scores) if assign_scores else 50.0
            else:
                assign_avg = 50.0
            
            # Include lab scores
            lab = assessments.get('lab_scores', {}).get(subj, 25.0)
            lab_score = lab / 50 * 100
            
            score = internal_avg * 0.5 + assign_avg * 0.3 + lab_score * 0.2
        
        vector.append(score)
        
        if score >= 70:
            strengths.append(subj)
        elif score < 45:
            weaknesses.append(subj)
    
    return np.array(vector), strengths, weaknesses


def find_peer_matches(student_id, top_n=3):
    """Find the best peer matches for a student based on complementary skills."""
    from models.database import get_all_students, get_student
    
    students = get_all_students()
    target_student = get_student(student_id)
    
    if not target_student:
        return {'error': 'Student not found'}
    
    target_vector, target_strengths, target_weaknesses = _build_skill_vector(student_id)
    
    matches = []
    
    for s in students:
        if s['id'] == student_id:
            continue
        
        other_vector, other_strengths, other_weaknesses = _build_skill_vector(s['id'])
        
        # Complementary score: how well does the other student cover our weaknesses?
        complementary_score = 0
        for subj in target_weaknesses:
            if subj in other_strengths:
                complementary_score += 2
            elif subj not in other_weaknesses:
                complementary_score += 1
        
        # Overall similarity for common ground
        sim = cosine_similarity([target_vector], [other_vector])[0][0]
        
        # Combined score: balance similarity (can study together) with complementarity (can help)
        combined_score = sim * 0.4 + (complementary_score / max(len(target_weaknesses), 1)) * 0.6
        
        # Determine match type
        if complementary_score >= 2:
            match_type = 'mentor'
            reason = f"Strong in {', '.join([s for s in other_strengths if s in target_weaknesses][:3])}"
        elif sim > 0.85:
            match_type = 'study_partner'
            reason = f"Similar academic profile — great for collaborative study"
        else:
            match_type = 'peer'
            reason = f"Complementary skills in different areas"
        
        matches.append({
            'student_id': s['id'],
            'name': s['name'],
            'department': s['department'],
            'match_score': round(float(combined_score) * 100, 1),
            'similarity': round(float(sim) * 100, 1),
            'match_type': match_type,
            'reason': reason,
            'strengths': other_strengths[:4],
            'weaknesses': other_weaknesses[:4],
            'avatar_color': s.get('avatar_color', '#6366f1'),
        })
    
    matches.sort(key=lambda x: x['match_score'], reverse=True)
    
    return {
        'student_id': student_id,
        'student_name': target_student['name'],
        'strengths': target_strengths,
        'weaknesses': target_weaknesses,
        'matches': matches[:top_n],
    }


def suggest_study_groups(group_size=4):
    """Form study groups that maximize skill diversity."""
    from models.database import get_all_students
    from seed_data import SUBJECTS
    
    students = get_all_students()
    
    # Build all skill vectors
    student_vectors = {}
    for s in students:
        vec, strengths, weaknesses = _build_skill_vector(s['id'])
        student_vectors[s['id']] = {
            'vector': vec,
            'student': s,
            'strengths': strengths,
            'weaknesses': weaknesses,
        }
    
    # Greedy grouping: pick a seed student, find complementary members
    used = set()
    groups = []
    
    sorted_students = sorted(student_vectors.items(), 
                              key=lambda x: np.mean(x[1]['vector']))
    
    for sid, sdata in sorted_students:
        if sid in used:
            continue
        
        group = [sid]
        used.add(sid)
        group_vector = sdata['vector'].copy()
        
        # Find complementary members
        candidates = [(oid, odata) for oid, odata in student_vectors.items() if oid not in used]
        
        for _ in range(group_size - 1):
            if not candidates:
                break
            
            best_cand = None
            best_score = -1
            
            for oid, odata in candidates:
                # Score based on how much this candidate fills group gaps
                gap_fill = sum(max(0, odata['vector'][i] - group_vector[i]) 
                              for i in range(len(group_vector)))
                if gap_fill > best_score:
                    best_score = gap_fill
                    best_cand = (oid, odata)
            
            if best_cand:
                group.append(best_cand[0])
                used.add(best_cand[0])
                group_vector = np.maximum(group_vector, best_cand[1]['vector'])
                candidates = [(oid, odata) for oid, odata in candidates if oid != best_cand[0]]
        
        group_info = {
            'group_id': len(groups) + 1,
            'members': [],
            'collective_strengths': [],
        }
        
        for member_id in group:
            sv = student_vectors[member_id]
            group_info['members'].append({
                'student_id': member_id,
                'name': sv['student']['name'],
                'department': sv['student']['department'],
                'strengths': sv['strengths'][:3],
                'avatar_color': sv['student'].get('avatar_color', '#6366f1'),
            })
        
        # Determine collective strengths
        avg_vector = np.mean([student_vectors[m]['vector'] for m in group], axis=0)
        for i, subj in enumerate(SUBJECTS):
            if avg_vector[i] >= 60:
                group_info['collective_strengths'].append(subj)
        
        groups.append(group_info)
    
    return groups[:12]  # return at most 12 groups
