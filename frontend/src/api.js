import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Auth
export const login = (id, password, role) => api.post('/auth/login', { id, password, role });

// Student APIs
export const getStudents = () => api.get('/students');
export const getStudent = (id) => api.get(`/students/${id}`);
export const getStudentInfo = (id) => api.get(`/students/${id}/info`);
export const updateStudentInfo = (id, data) => api.post(`/students/${id}/info`, data);

// Risk APIs
export const getRisk = (id) => api.get(`/risk/${id}`);
export const getClassSummary = () => api.get('/risk/class-summary');

// Anomaly APIs
export const getAnomalies = (id) => api.get(`/anomalies/${id}`);
export const getAnomalyAlerts = () => api.get('/anomalies/alerts');

// Peer APIs
export const getPeers = (id) => api.get(`/peers/${id}`);
export const getStudyGroups = () => api.get('/study-groups');

// Learning APIs
export const getLearning = (id) => api.get(`/learn/${id}`);

// Dashboard APIs
export const getStudentDashboard = (id) => api.get(`/dashboard/student/${id}`);
export const getTeacherDashboard = () => api.get('/dashboard/teacher');
export const getRootCause = (id) => api.get(`/dashboard/root-cause/${id}`);

// Course APIs
export const getCourses = () => api.get('/courses');
export const getCourse = (name) => api.get(`/courses/${encodeURIComponent(name)}`);
export const getStudentCourse = (name, studentId) => api.get(`/courses/${encodeURIComponent(name)}/student/${studentId}`);

// AI Assistant
export const sendAIMessage = (message, studentId) => api.post('/ai-assistant', { message, student_id: studentId });

// Teacher Actions
export const assignMark = (studentId, subject, score) => api.post('/teacher/assign-mark', { student_id: studentId, subject, score });
export const assignPeerGroup = (studentIds, focusArea) => api.post('/teacher/assign-peer-group', { student_ids: studentIds, focus_area: focusArea });

// Admin Actions
export const enrollStudent = (data) => api.post('/admin/enroll', data);

// Peer Requests
export const sendPeerRequest = (fromId, toId, message) => api.post('/peer-requests/send', { from_id: fromId, to_id: toId, message });
export const respondPeerRequest = (requestId, action) => api.post('/peer-requests/respond', { request_id: requestId, action });
export const getPeerRequests = (studentId) => api.get(`/peer-requests/${studentId}`);

export default api;
