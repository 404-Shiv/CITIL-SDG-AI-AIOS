"""
Synthetic student data generator.
Produces realistic academic data for 150 students across AIDS, IT, CSBS departments.
Each department has exactly 50 students with South Indian names.
"""

import random
import numpy as np
from datetime import datetime, timedelta

random.seed(42)
np.random.seed(42)

# South Indian first names (male & female)
FIRST_NAMES = [
    # Male — Tamil
    "Aravind", "Balamurugan", "Chandru", "Dhanush", "Ezhilan", "Gokul", "Hariharan",
    "Inbaraj", "Jayakumar", "Karthik", "Logesh", "Manivannan", "Nandha", "Oviya",
    "Prasanth", "Ramesh", "Santhosh", "Tharun", "Udhay", "Vignesh",
    # Male — Telugu
    "Aakash", "Bharath", "Charan", "Dinesh", "Ganesh", "Hemanth", "Jayanth",
    "Kishore", "Lokesh", "Mahesh", "Nagaraj", "Pavan", "Rithik", "Srinivas",
    "Tilak", "Varun", "Yogesh", "Surya", "Vishnu", "Ajith",
    # Male — Kannada/Malayalam 
    "Abhishek", "Darshan", "Girish", "Manjunath", "Nitin", "Rakesh", "Sachin",
    "Tejas", "Vinay", "Deepak", "Anand", "Vivek", "Naveen", "Shiva",
    "Pranav", "Arjun", "Siddharth", "Krishna", "Kiran", "Manoj",
    # Female — Tamil
    "Abinaya", "Brindha", "Chithra", "Deepika", "Gayathri", "Hemapriya", "Iswarya",
    "Janani", "Kavitha", "Lavanya", "Meenakshi", "Nandhini", "Pavithra", "Revathi",
    "Sangeetha", "Thenmozhi", "Vanitha", "Yamuna", "Keerthana", "Dhivya",
    # Female — Telugu
    "Anusha", "Bhavani", "Chaitra", "Divya", "Hasini", "Jyothi", "Keerthi",
    "Lakshmi", "Mounika", "Niharika", "Preethi", "Ramya", "Sowmya", "Tejaswini",
    "Varsha", "Aishwarya", "Snehalatha", "Roshini", "Madhumitha", "Pooja",
    # Female — Kannada/Malayalam
    "Amrutha", "Bhoomika", "Deeksha", "Gowri", "Harini", "Kavya", "Megha",
    "Nithya", "Rashmi", "Sahana", "Shreya", "Swathi", "Trisha", "Vaishnavi",
    "Akshaya", "Ashwini", "Devi", "Priya", "Sindhu", "Thanmaya",
]

# South Indian last names
LAST_NAMES = [
    # Tamil
    "Murugan", "Subramanian", "Natarajan", "Rajagopal", "Venkatesh", "Sundaram",
    "Krishnan", "Balasubramanian", "Palaniappan", "Shanmugam", "Ravichandran",
    "Thirunavukkarasu", "Annamalai", "Pandian", "Chelladurai",
    # Telugu
    "Reddy", "Naidu", "Rao", "Chowdary", "Varma", "Raju", "Shetty",
    "Goud", "Yadav", "Sastry",
    # Kannada
    "Gowda", "Hegde", "Acharya", "Bhat", "Shenoy", "Kamath",
    # Malayalam
    "Nair", "Menon", "Pillai", "Kurup", "Warrier", "Nambiar",
    # Common South Indian
    "Kumar", "Raj", "Prasad", "Iyer", "Iyengar",
]

# Three departments: AIDS, IT, CSBS
DEPARTMENTS = ["AIDS", "IT", "CSBS"]

SUBJECTS = [
    "Data Structures", "Algorithms", "Database Systems", "Operating Systems",
    "Computer Networks", "Machine Learning", "Web Development", "Software Engineering"
]

YOUTUBE_PLAYLISTS = {
    "Data Structures": [
        {"title": "Data Structures Full Course", "url": "https://youtube.com/playlist?list=PLdo5W4Nhv31bbKJzrsKfMpo_grxuLl8LU", "channel": "Jenny's Lectures"},
        {"title": "DSA with Java", "url": "https://youtube.com/playlist?list=PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", "channel": "Kunal Kushwaha"},
    ],
    "Algorithms": [
        {"title": "Algorithms Playlist", "url": "https://youtube.com/playlist?list=PLDN4rrl48XKpZkf03iYFl-O29szjTrs_O", "channel": "Abdul Bari"},
        {"title": "Algorithm Design", "url": "https://youtube.com/playlist?list=PLUl4u3cNGP6317WaSNfmCvGym2ucw3oGp", "channel": "MIT OpenCourseWare"},
    ],
    "Database Systems": [
        {"title": "DBMS Complete Course", "url": "https://youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y", "channel": "Gate Smashers"},
        {"title": "SQL Tutorial", "url": "https://youtube.com/playlist?list=PLBlnK6fEyqRi_CUQ-FzSFdkvEelGGf0FA", "channel": "Neso Academy"},
    ],
    "Operating Systems": [
        {"title": "OS Full Course", "url": "https://youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p", "channel": "Gate Smashers"},
        {"title": "Operating Systems", "url": "https://youtube.com/playlist?list=PLBlnK6fEyqRiVhbXDGLXDk_OQAdc0cPiS", "channel": "Neso Academy"},
    ],
    "Computer Networks": [
        {"title": "Computer Networks", "url": "https://youtube.com/playlist?list=PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_", "channel": "Gate Smashers"},
        {"title": "Networking Fundamentals", "url": "https://youtube.com/playlist?list=PLIFyRwBY_4bRLmKfP1KnZA6rZbRHtXmn0", "channel": "Practical Networking"},
    ],
    "Machine Learning": [
        {"title": "ML Full Course", "url": "https://youtube.com/playlist?list=PLZoTAELRMXVPBTrWtJkn3wWQxZkmTXGwe", "channel": "Krish Naik"},
        {"title": "Stanford ML", "url": "https://youtube.com/playlist?list=PLoROMvodv4rMiGQp3WXShtMGgzqpfVfbU", "channel": "Stanford Online"},
    ],
    "Web Development": [
        {"title": "Full Stack Web Dev", "url": "https://youtube.com/playlist?list=PLu0W_9lII9agx66oZnT6IyhcMIbUMNMdt", "channel": "CodeWithHarry"},
        {"title": "MERN Stack", "url": "https://youtube.com/playlist?list=PLillGF-RfqbbQeVSccR9PGKHb4Kzb0NII", "channel": "Traversy Media"},
    ],
    "Software Engineering": [
        {"title": "Software Engineering", "url": "https://youtube.com/playlist?list=PLxCzCOWd7aiEed7SKZBnC6ypFDWYLRvB2", "channel": "Gate Smashers"},
        {"title": "Design Patterns", "url": "https://youtube.com/playlist?list=PLrhzvIcii6GNjpARdnO4ueTUAVR9eMBpc", "channel": "Christopher Okhravi"},
    ],
}


def generate_students(n=150):
    """Generate 150 students — 50 per department (AIDS, IT, CSBS) with South Indian names."""
    students = []
    used_names = set()
    per_dept = 50

    for dept_idx, dept in enumerate(DEPARTMENTS):
        for j in range(per_dept):
            i = dept_idx * per_dept + j  # global index

            while True:
                first = random.choice(FIRST_NAMES)
                last = random.choice(LAST_NAMES)
                full_name = f"{first} {last}"
                if full_name not in used_names:
                    used_names.add(full_name)
                    break

            student = {
                'id': f'S{str(i + 1).zfill(3)}',
                'name': full_name,
                'email': f"{first.lower()}.{last.lower()}@university.edu",
                'department': dept,
                'semester': random.randint(1, 8),
                'year': random.choice([1, 2, 3, 4]),
                'enrollment_year': random.choice([2022, 2023, 2024, 2025]),
                'avatar_color': f'hsl({random.randint(0, 360)}, 70%, 50%)',
            }
            students.append(student)

    return students


def generate_attendance(students, days=90):
    """Generate daily attendance for each student over `days` days."""
    attendance = {}
    base_date = datetime(2025, 9, 1)
    
    for s in students:
        # Some students have higher base attendance
        base_rate = np.random.beta(5, 2)  # skewed toward higher attendance
        records = []
        
        for d in range(days):
            date = base_date + timedelta(days=d)
            if date.weekday() >= 5:  # skip weekends
                continue
            
            # Add some variance — some students drop off later
            if d > 60 and random.random() < 0.3:
                present = random.random() < (base_rate * 0.6)
            else:
                present = random.random() < base_rate
            
            records.append({
                'date': date.strftime('%Y-%m-%d'),
                'present': present,
                'day': d + 1
            })
        
        attendance[s['id']] = records
    
    return attendance


def generate_assessments(students):
    """Generate internal assessments, assignments, lab scores per student."""
    assessments = {}
    
    for s in students:
        base_performance = np.random.beta(4, 3) * 100  # 0-100 scale
        
        # 3 Internal assessments per subject (out of 50)
        internals = {}
        for subj in SUBJECTS:
            subj_bias = random.uniform(-15, 15)
            scores = []
            for i in range(3):
                score = max(0, min(50, np.random.normal(base_performance * 0.5, 8) + subj_bias))
                scores.append(round(score, 1))
            internals[subj] = scores
        
        # Assignments (out of 10 each, 5 assignments per subject)
        assignments = {}
        for subj in SUBJECTS:
            subj_scores = []
            for a in range(5):
                submitted = random.random() < (0.5 + base_performance / 200)
                if submitted:
                    score = max(0, min(10, np.random.normal(base_performance / 10, 2)))
                    subj_scores.append({'submitted': True, 'score': round(score, 1)})
                else:
                    subj_scores.append({'submitted': False, 'score': 0})
            assignments[subj] = subj_scores
        
        # Lab scores (out of 50)
        lab_scores = {}
        for subj in SUBJECTS:
            lab_scores[subj] = round(max(0, min(50, np.random.normal(base_performance * 0.5, 10))), 1)
        
        assessments[s['id']] = {
            'internals': internals,
            'assignments': assignments,
            'lab_scores': lab_scores,
            'base_performance': round(base_performance, 1),
        }
    
    return assessments


def generate_lms_activity(students, weeks=12):
    """Generate weekly LMS activity logs."""
    lms_activity = {}
    
    for s in students:
        base_engagement = np.random.beta(3, 2)
        records = []
        
        for w in range(weeks):
            # Some students disengage over time
            decay = 1.0
            if random.random() < 0.2:
                decay = max(0.3, 1.0 - (w * 0.05))
            
            logins = max(0, int(np.random.normal(base_engagement * 20, 4) * decay))
            time_spent = max(0, round(np.random.normal(base_engagement * 10, 3) * decay, 1))  # hours
            resources_accessed = max(0, int(np.random.normal(base_engagement * 15, 5) * decay))
            forum_posts = max(0, int(np.random.normal(base_engagement * 3, 1.5)))
            quiz_attempts = max(0, int(np.random.normal(base_engagement * 5, 2)))
            
            records.append({
                'week': w + 1,
                'logins': logins,
                'time_spent_hours': time_spent,
                'resources_accessed': resources_accessed,
                'forum_posts': forum_posts,
                'quiz_attempts': quiz_attempts,
            })
        
        lms_activity[s['id']] = records
    
    return lms_activity


def generate_historical_grades(students):
    """Generate historical semester GPAs."""
    historical = {}
    
    for s in students:
        base_gpa = np.random.beta(4, 2) * 10  # 0-10 CGPA scale
        semesters = s['semester'] - 1
        gpas = []
        
        for sem in range(max(1, semesters)):
            gpa = max(2.0, min(10.0, np.random.normal(base_gpa, 0.8)))
            gpas.append({
                'semester': sem + 1,
                'gpa': round(gpa, 2),
            })
        
        historical[s['id']] = gpas
    
    return historical


def generate_all_data(n=150):
    """Generate the complete synthetic dataset (150 students: 50 per dept)."""
    students = generate_students(n)
    
    data = {
        'students': students,
        'attendance': generate_attendance(students),
        'assessments': generate_assessments(students),
        'lms_activity': generate_lms_activity(students),
        'historical_grades': generate_historical_grades(students),
    }
    
    return data
