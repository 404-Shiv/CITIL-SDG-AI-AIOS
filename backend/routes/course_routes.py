"""Course content and weekly assessment routes."""

from flask import Blueprint, jsonify, request
from models.database import get_student, get_assessments
from seed_data import SUBJECTS, YOUTUBE_PLAYLISTS
import random

course_bp = Blueprint('courses', __name__)

# Course content with weekly topics
COURSE_CONTENT = {
    "Data Structures": {
        "description": "Study of organizing and storing data efficiently using arrays, linked lists, trees, graphs, and hash tables.",
        "weeks": [
            {"week": 1, "topic": "Arrays & Strings", "assessment": "Quiz: Array operations & complexity analysis"},
            {"week": 2, "topic": "Linked Lists", "assessment": "Coding: Implement singly & doubly linked list"},
            {"week": 3, "topic": "Stacks & Queues", "assessment": "Quiz: Stack/Queue applications"},
            {"week": 4, "topic": "Trees — Binary Trees & BST", "assessment": "Coding: BST insertion, deletion, traversal"},
            {"week": 5, "topic": "Heaps & Priority Queues", "assessment": "Quiz: Heap operations & applications"},
            {"week": 6, "topic": "Hashing & Hash Tables", "assessment": "Coding: Implement hash map with collision handling"},
            {"week": 7, "topic": "Graphs — BFS & DFS", "assessment": "Coding: Graph traversal algorithms"},
            {"week": 8, "topic": "Sorting Algorithms", "assessment": "Quiz: Compare sorting algorithms by complexity"},
            {"week": 9, "topic": "Advanced Trees — AVL, Red-Black", "assessment": "Coding: Self-balancing BST"},
            {"week": 10, "topic": "Dynamic Programming Intro", "assessment": "Coding: Solve 3 DP problems"},
            {"week": 11, "topic": "Trie & Segment Trees", "assessment": "Quiz: Advanced data structure applications"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: Comprehensive DSA test"},
        ]
    },
    "Algorithms": {
        "description": "Design and analysis of algorithms including divide-and-conquer, greedy, dynamic programming, and graph algorithms.",
        "weeks": [
            {"week": 1, "topic": "Algorithm Analysis & Big-O", "assessment": "Quiz: Time & space complexity"},
            {"week": 2, "topic": "Divide and Conquer", "assessment": "Coding: Merge sort, quick sort"},
            {"week": 3, "topic": "Greedy Algorithms", "assessment": "Coding: Activity selection, Huffman coding"},
            {"week": 4, "topic": "Dynamic Programming — I", "assessment": "Coding: Knapsack, LCS problems"},
            {"week": 5, "topic": "Dynamic Programming — II", "assessment": "Coding: Matrix chain multiplication"},
            {"week": 6, "topic": "Graph Algorithms — Shortest Path", "assessment": "Coding: Dijkstra's & Bellman-Ford"},
            {"week": 7, "topic": "Graph Algorithms — MST", "assessment": "Coding: Kruskal's & Prim's algorithms"},
            {"week": 8, "topic": "Backtracking", "assessment": "Coding: N-Queens, Sudoku solver"},
            {"week": 9, "topic": "String Matching Algorithms", "assessment": "Quiz: KMP, Rabin-Karp analysis"},
            {"week": 10, "topic": "Network Flow", "assessment": "Coding: Ford-Fulkerson algorithm"},
            {"week": 11, "topic": "NP-Completeness", "assessment": "Quiz: P vs NP, reductions"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: Algorithm design test"},
        ]
    },
    "Database Systems": {
        "description": "Relational database design, SQL, normalization, transaction management, and NoSQL fundamentals.",
        "weeks": [
            {"week": 1, "topic": "Introduction to DBMS", "assessment": "Quiz: DBMS vs File System"},
            {"week": 2, "topic": "ER Model & Relational Model", "assessment": "Design: Create ER diagram for a system"},
            {"week": 3, "topic": "SQL Basics — DDL & DML", "assessment": "Coding: Write SQL queries"},
            {"week": 4, "topic": "Advanced SQL — Joins & Subqueries", "assessment": "Coding: Complex SQL queries"},
            {"week": 5, "topic": "Normalization — 1NF to BCNF", "assessment": "Quiz: Normalize given relations"},
            {"week": 6, "topic": "Transaction Management", "assessment": "Quiz: ACID properties, serializability"},
            {"week": 7, "topic": "Concurrency Control", "assessment": "Quiz: Locking protocols, deadlocks"},
            {"week": 8, "topic": "Indexing & B-Trees", "assessment": "Quiz: Index types and their use cases"},
            {"week": 9, "topic": "Query Optimization", "assessment": "Coding: Optimize slow queries"},
            {"week": 10, "topic": "NoSQL Databases", "assessment": "Design: Model data for MongoDB"},
            {"week": 11, "topic": "Distributed Databases", "assessment": "Quiz: CAP theorem, partitioning"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: DBMS comprehensive test"},
        ]
    },
    "Operating Systems": {
        "description": "Process management, memory management, file systems, and synchronization in modern operating systems.",
        "weeks": [
            {"week": 1, "topic": "OS Introduction & Architecture", "assessment": "Quiz: OS types and functions"},
            {"week": 2, "topic": "Process Management", "assessment": "Quiz: Process states, PCB"},
            {"week": 3, "topic": "CPU Scheduling", "assessment": "Coding: Simulate FCFS, SJF, RR scheduling"},
            {"week": 4, "topic": "Process Synchronization", "assessment": "Coding: Implement mutex & semaphore"},
            {"week": 5, "topic": "Deadlocks", "assessment": "Quiz: Deadlock detection & prevention"},
            {"week": 6, "topic": "Memory Management — Paging", "assessment": "Coding: Page replacement algorithms"},
            {"week": 7, "topic": "Virtual Memory", "assessment": "Quiz: Demand paging, thrashing"},
            {"week": 8, "topic": "File Systems", "assessment": "Quiz: File allocation methods"},
            {"week": 9, "topic": "Disk Scheduling", "assessment": "Coding: SCAN, C-SCAN algorithms"},
            {"week": 10, "topic": "I/O Management", "assessment": "Quiz: I/O techniques, DMA"},
            {"week": 11, "topic": "Linux Kernel Basics", "assessment": "Lab: Linux system calls"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: OS comprehensive test"},
        ]
    },
    "Computer Networks": {
        "description": "Network protocols, layered architecture, routing algorithms, and security fundamentals.",
        "weeks": [
            {"week": 1, "topic": "Network Models — OSI & TCP/IP", "assessment": "Quiz: Layer functions & protocols"},
            {"week": 2, "topic": "Physical & Data Link Layer", "assessment": "Quiz: Framing, error detection"},
            {"week": 3, "topic": "MAC Protocols", "assessment": "Quiz: ALOHA, CSMA/CD"},
            {"week": 4, "topic": "Network Layer — IP Addressing", "assessment": "Coding: Subnetting exercises"},
            {"week": 5, "topic": "Routing Algorithms", "assessment": "Coding: Distance vector, link state"},
            {"week": 6, "topic": "Transport Layer — TCP", "assessment": "Quiz: TCP handshake, flow control"},
            {"week": 7, "topic": "Transport Layer — UDP & Sockets", "assessment": "Coding: Socket programming"},
            {"week": 8, "topic": "Application Layer — HTTP, DNS", "assessment": "Lab: Packet analysis with Wireshark"},
            {"week": 9, "topic": "Network Security Basics", "assessment": "Quiz: Encryption, firewalls"},
            {"week": 10, "topic": "Wireless Networks", "assessment": "Quiz: WiFi, Bluetooth protocols"},
            {"week": 11, "topic": "Cloud Networking & SDN", "assessment": "Quiz: SDN architecture"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: Networks comprehensive test"},
        ]
    },
    "Machine Learning": {
        "description": "Supervised & unsupervised learning, neural networks, and practical ML model building with Python.",
        "weeks": [
            {"week": 1, "topic": "Introduction to ML & Python", "assessment": "Lab: NumPy & Pandas basics"},
            {"week": 2, "topic": "Linear Regression", "assessment": "Coding: Implement linear regression"},
            {"week": 3, "topic": "Logistic Regression", "assessment": "Coding: Binary classification"},
            {"week": 4, "topic": "Decision Trees & Random Forest", "assessment": "Coding: Train a random forest model"},
            {"week": 5, "topic": "SVM & Kernel Methods", "assessment": "Coding: SVM classification"},
            {"week": 6, "topic": "K-Means & Clustering", "assessment": "Coding: Customer segmentation project"},
            {"week": 7, "topic": "Dimensionality Reduction — PCA", "assessment": "Coding: Apply PCA to dataset"},
            {"week": 8, "topic": "Neural Networks Basics", "assessment": "Coding: Build a simple neural network"},
            {"week": 9, "topic": "CNNs for Image Recognition", "assessment": "Project: Image classifier"},
            {"week": 10, "topic": "NLP & Text Classification", "assessment": "Coding: Sentiment analysis"},
            {"week": 11, "topic": "Model Evaluation & Tuning", "assessment": "Lab: Cross-validation, hyperparameter tuning"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Project: End-to-end ML pipeline"},
        ]
    },
    "Web Development": {
        "description": "Full-stack web development covering HTML/CSS, JavaScript, React, Node.js, and database integration.",
        "weeks": [
            {"week": 1, "topic": "HTML5 & Semantic Markup", "assessment": "Coding: Build a portfolio page"},
            {"week": 2, "topic": "CSS3 & Responsive Design", "assessment": "Coding: Responsive landing page"},
            {"week": 3, "topic": "JavaScript Fundamentals", "assessment": "Coding: DOM manipulation exercises"},
            {"week": 4, "topic": "Advanced JavaScript & ES6+", "assessment": "Coding: Async/await, promises"},
            {"week": 5, "topic": "React.js — Components & State", "assessment": "Project: Todo app with React"},
            {"week": 6, "topic": "React Router & Hooks", "assessment": "Project: Multi-page React app"},
            {"week": 7, "topic": "Node.js & Express.js", "assessment": "Coding: Build REST API"},
            {"week": 8, "topic": "MongoDB & Mongoose", "assessment": "Coding: CRUD operations"},
            {"week": 9, "topic": "Authentication — JWT & OAuth", "assessment": "Project: Login system"},
            {"week": 10, "topic": "Deployment & DevOps Basics", "assessment": "Lab: Deploy app to cloud"},
            {"week": 11, "topic": "Testing & Performance", "assessment": "Lab: Write unit tests"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Project: Full-stack application"},
        ]
    },
    "Software Engineering": {
        "description": "Software development lifecycle, design patterns, testing strategies, and agile methodologies.",
        "weeks": [
            {"week": 1, "topic": "SDLC Models", "assessment": "Quiz: Waterfall vs Agile"},
            {"week": 2, "topic": "Requirements Engineering", "assessment": "Design: Write SRS document"},
            {"week": 3, "topic": "UML Diagrams", "assessment": "Design: Create use case & class diagrams"},
            {"week": 4, "topic": "Software Architecture", "assessment": "Quiz: Architecture patterns"},
            {"week": 5, "topic": "Design Patterns — Creational", "assessment": "Coding: Implement Singleton, Factory"},
            {"week": 6, "topic": "Design Patterns — Structural", "assessment": "Coding: Implement Adapter, Decorator"},
            {"week": 7, "topic": "Design Patterns — Behavioral", "assessment": "Coding: Implement Observer, Strategy"},
            {"week": 8, "topic": "Software Testing — Unit Tests", "assessment": "Coding: Write test cases"},
            {"week": 9, "topic": "Integration & System Testing", "assessment": "Lab: Test a complete module"},
            {"week": 10, "topic": "Agile & Scrum", "assessment": "Project: Sprint planning exercise"},
            {"week": 11, "topic": "DevOps & CI/CD", "assessment": "Lab: Set up CI pipeline"},
            {"week": 12, "topic": "Revision & Final Assessment", "assessment": "Final Exam: SE comprehensive test"},
        ]
    },
}

# Generate random weekly scores for students
def _generate_weekly_scores(student_id, subject):
    """Generate weekly assessment scores for a student."""
    random.seed(hash(f"{student_id}_{subject}") % 2**32)
    from models.database import get_assessments
    assessments = get_assessments(student_id)
    base = assessments.get('base_performance', 50) if assessments else 50
    
    scores = []
    for week in COURSE_CONTENT.get(subject, {}).get('weeks', []):
        completed = random.random() < (0.5 + base / 200)
        if completed:
            score = max(0, min(100, random.gauss(base, 15)))
            scores.append({
                'week': week['week'],
                'topic': week['topic'],
                'assessment': week['assessment'],
                'completed': True,
                'score': round(score, 1),
                'grade': 'A' if score >= 80 else 'B' if score >= 60 else 'C' if score >= 40 else 'D',
            })
        else:
            scores.append({
                'week': week['week'],
                'topic': week['topic'],
                'assessment': week['assessment'],
                'completed': False,
                'score': 0,
                'grade': 'N/A',
            })
    return scores


@course_bp.route('/api/courses', methods=['GET'])
def list_courses():
    """List all courses."""
    courses = []
    for name, content in COURSE_CONTENT.items():
        courses.append({
            'name': name,
            'description': content['description'],
            'total_weeks': len(content['weeks']),
            'playlists': YOUTUBE_PLAYLISTS.get(name, []),
        })
    return jsonify({'courses': courses})


@course_bp.route('/api/courses/<path:course_name>', methods=['GET'])
def get_course(course_name):
    """Get course details."""
    content = COURSE_CONTENT.get(course_name)
    if not content:
        return jsonify({'error': 'Course not found'}), 404
    
    return jsonify({
        'name': course_name,
        'description': content['description'],
        'weeks': content['weeks'],
        'playlists': YOUTUBE_PLAYLISTS.get(course_name, []),
    })


@course_bp.route('/api/courses/<path:course_name>/student/<student_id>', methods=['GET'])
def get_student_course(course_name, student_id):
    """Get course with student's weekly assessment scores."""
    content = COURSE_CONTENT.get(course_name)
    if not content:
        return jsonify({'error': 'Course not found'}), 404
    
    weekly_scores = _generate_weekly_scores(student_id, course_name)
    completed = sum(1 for s in weekly_scores if s['completed'])
    avg_score = sum(s['score'] for s in weekly_scores if s['completed']) / max(completed, 1)
    
    return jsonify({
        'name': course_name,
        'description': content['description'],
        'weeks': weekly_scores,
        'playlists': YOUTUBE_PLAYLISTS.get(course_name, []),
        'progress': {
            'completed': completed,
            'total': len(weekly_scores),
            'percentage': round(completed / len(weekly_scores) * 100, 1),
            'avg_score': round(avg_score, 1),
        },
    })
