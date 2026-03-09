"""
In-memory database using synthetic student data.
Data is generated once on import and persisted for the session.
"""

import json
import os

_data_store = {
    'students': [],
    'attendance': {},
    'assessments': {},
    'lms_activity': {},
    'historical_grades': {},
}

def get_db():
    """Return the in-memory data store."""
    return _data_store

def load_data(data):
    """Load seed data into the store."""
    global _data_store
    _data_store.update(data)

def get_student(student_id):
    """Get a single student by ID."""
    for s in _data_store['students']:
        if s['id'] == student_id:
            return s
    return None

def get_all_students():
    """Return all students."""
    return _data_store['students']

def get_attendance(student_id):
    """Return attendance records for a student."""
    return _data_store['attendance'].get(student_id, [])

def get_assessments(student_id):
    """Return assessment records for a student."""
    return _data_store['assessments'].get(student_id, {})

def get_lms_activity(student_id):
    """Return LMS activity logs for a student."""
    return _data_store['lms_activity'].get(student_id, [])

def get_historical_grades(student_id):
    """Return historical GPA records for a student."""
    return _data_store['historical_grades'].get(student_id, [])
