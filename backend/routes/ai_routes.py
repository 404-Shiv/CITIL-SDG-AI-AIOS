"""AI Assistant route — rule-based academic advisor."""

from flask import Blueprint, jsonify, request
from models.database import get_student, get_assessments, get_attendance, get_lms_activity
from ml.risk_predictor import predict_risk
from ml.smart_learn import get_learning_recommendations
import random

ai_bp = Blueprint('ai_assistant', __name__)

# Pre-built response templates
GREETING_RESPONSES = [
    "Hello! 👋 I'm your Academic AI Assistant. How can I help you today?",
    "Hi there! I can help you with study tips, risk analysis, course recommendations, and more. What do you need?",
    "Welcome! Ask me anything about your academics — performance, learning resources, study strategies, or courses.",
]

def _analyze_student_context(student_id):
    """Build context about the student for smarter responses."""
    risk = predict_risk(student_id)
    attendance = get_attendance(student_id)
    att_pct = sum(1 for a in attendance if a['present']) / len(attendance) * 100 if attendance else 0
    
    return {
        'risk_level': risk['risk_level'],
        'risk_score': risk['risk_score'],
        'attendance': round(att_pct, 1),
        'alerts': risk['alerts'],
        'features': risk['features'],
    }


def _generate_response(message, student_id):
    """Generate AI assistant response based on the message and student context."""
    msg = message.lower().strip()
    ctx = _analyze_student_context(student_id)
    student = get_student(student_id)
    name = student['name'].split()[0] if student else 'there'
    
    # Greetings
    if any(w in msg for w in ['hi', 'hello', 'hey', 'help', 'start']):
        return {
            'response': random.choice(GREETING_RESPONSES),
            'suggestions': ['How am I performing?', 'Study tips', 'My risk analysis', 'Recommend courses'],
        }
    
    # Performance query
    if any(w in msg for w in ['performance', 'performing', 'how am i', 'my score', 'my grade']):
        level = ctx['risk_level']
        att = ctx['attendance']
        assessment = ctx['features']['avg_assessment']
        
        if level == 'Low':
            perf_msg = f"Great news, {name}! 🎉 You're performing well. Your risk level is **Low** with {att}% attendance and {assessment}% average assessment score. Keep up the excellent work!"
        elif level == 'Medium':
            perf_msg = f"Hey {name}, your performance is at a **Medium** risk level. Attendance is {att}%, assessments average at {assessment}%. There's room for improvement — focus on your weaker subjects."
        else:
            perf_msg = f"{name}, your risk level is currently **High**. Attendance: {att}%, Assessment avg: {assessment}%. I strongly recommend reviewing your learning path and connecting with peer mentors."
        
        return {
            'response': perf_msg,
            'suggestions': ['Study tips', 'Find a peer mentor', 'My learning path', 'Improve attendance'],
        }
    
    # Risk analysis
    if any(w in msg for w in ['risk', 'danger', 'at risk', 'warning']):
        alerts = ctx['alerts']
        if alerts:
            alert_text = '\n'.join([f"⚠️ {a['message']}" for a in alerts])
            return {
                'response': f"Here's your risk analysis, {name}:\n\n**Risk Level: {ctx['risk_level']}** (Score: {ctx['risk_score']})\n\n{alert_text}\n\nI recommend checking your Learning Path tab for personalized improvement suggestions.",
                'suggestions': ['How to improve?', 'Study tips', 'Find peer mentor'],
            }
        else:
            return {
                'response': f"Good news, {name}! No major risk alerts detected. Your risk level is **{ctx['risk_level']}** with a score of {ctx['risk_score']}. Keep it up! 💪",
                'suggestions': ['My performance', 'Course recommendations', 'Study tips'],
            }
    
    # Study tips
    if any(w in msg for w in ['study', 'tips', 'advice', 'improve', 'better']):
        tips = [
            "📚 **Active Recall**: Test yourself instead of re-reading. Use flashcards or practice problems.",
            "⏰ **Pomodoro Technique**: Study in 25-minute focused blocks with 5-minute breaks.",
            "📝 **Spaced Repetition**: Review material at increasing intervals (1 day, 3 days, 1 week).",
            "👥 **Study Groups**: Join peer study groups — teaching others reinforces your understanding.",
            "💻 **LMS Resources**: Regularly check LMS for new materials, quizzes, and forum discussions.",
            "🎯 **Focus on Weak Areas**: Check your Learning Path tab to identify subjects that need attention.",
        ]
        selected = random.sample(tips, min(4, len(tips)))
        return {
            'response': f"Here are some study tips for you, {name}:\n\n" + '\n\n'.join(selected),
            'suggestions': ['My learning path', 'Course recommendations', 'Find peer mentor'],
        }
    
    # Attendance
    if any(w in msg for w in ['attendance', 'absent', 'present', 'class']):
        att = ctx['attendance']
        if att >= 85:
            msg_text = f"Your attendance is excellent at **{att}%**! 🌟 Keep attending regularly."
        elif att >= 75:
            msg_text = f"Your attendance is **{att}%** — acceptable but aim for 85%+. Regular attendance strongly correlates with better grades."
        else:
            msg_text = f"⚠️ Your attendance is **{att}%** which is below the 75% requirement. Missing classes impacts understanding and exam preparation. Try to attend every class going forward."
        
        return {
            'response': msg_text,
            'suggestions': ['My performance', 'Study tips', 'My risk analysis'],
        }
    
    # Peer/mentor
    if any(w in msg for w in ['peer', 'mentor', 'partner', 'group', 'collaborate']):
        return {
            'response': f"Great idea, {name}! 👥 Peer learning is one of the most effective strategies. Head to the **Peer Matching** tab to find study partners matched to your skill profile. You'll see mentors who excel in your weak areas!",
            'suggestions': ['My performance', 'Study tips', 'Course recommendations'],
        }
    
    # Course / learning path
    if any(w in msg for w in ['course', 'learn', 'path', 'recommend', 'resource', 'youtube']):
        learning = get_learning_recommendations(student_id)
        gaps = learning.get('learning_path', [])[:3]
        if gaps:
            gap_text = '\n'.join([f"📌 **{g['subject']}** — Currently: {g['current_level']}, Gap: {g['gap_severity']}" for g in gaps])
            return {
                'response': f"Based on your performance, here are your priority subjects:\n\n{gap_text}\n\nCheck the **Learning Path** and **Resources** tabs for detailed recommendations and YouTube playlists.",
                'suggestions': ['Study tips', 'My performance', 'Find peer mentor'],
            }
        else:
            return {
                'response': f"You're doing well across all subjects! Check the **Courses** tab to explore weekly assessments and track your progress.",
                'suggestions': ['My performance', 'Study tips'],
            }
    
    # Assessment / exam
    if any(w in msg for w in ['assessment', 'exam', 'test', 'quiz', 'assignment']):
        return {
            'response': f"Check the **Courses & Assessments** tab for your weekly assessments across all subjects. Each course has 12 weeks of topics with corresponding assessments. Stay on track by completing them every week!",
            'suggestions': ['Study tips', 'My performance', 'Course recommendations'],
        }
    
    # Default
    return {
        'response': f"I'm here to help with your academics, {name}! You can ask me about:\n\n• 📊 Your performance & risk analysis\n• 📚 Study tips & strategies\n• 🎯 Learning path & course recommendations\n• 👥 Peer matching & mentorship\n• 📝 Assessments & courses\n• 📅 Attendance insights",
        'suggestions': ['How am I performing?', 'Study tips', 'My risk analysis', 'Find peer mentor'],
    }


@ai_bp.route('/api/ai-assistant', methods=['POST'])
def chat():
    """Handle AI assistant chat messages."""
    data = request.get_json()
    message = data.get('message', '')
    student_id = data.get('student_id', 'S001')
    
    if not message.strip():
        return jsonify({
            'response': "Please type a message! I can help with performance analysis, study tips, course recommendations, and more.",
            'suggestions': ['How am I performing?', 'Study tips', 'My risk analysis'],
        })
    
    result = _generate_response(message, student_id)
    return jsonify(result)
