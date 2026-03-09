import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Shield, CheckCircle, Edit2, X, Search, Filter, ArrowRight } from 'lucide-react';
import { enrollStudent, getStudents, getStudentInfo, updateStudentInfo } from '../api';
import Sidebar from '../components/Sidebar';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [department, setDepartment] = useState('Computer Science');
    const [semester, setSemester] = useState(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [students, setStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [sortBy, setSortBy] = useState('name'); // 'name', 'id', 'semester'

    const [selectedStudent, setSelectedStudent] = useState(null);
    const [personalInfo, setPersonalInfo] = useState({ phone: '', email: '', parent_contact: '', medical_info: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [infoLoading, setInfoLoading] = useState(false);

    useEffect(() => {
        const role = sessionStorage.getItem('role');
        if (role !== 'admin') {
            navigate('/');
            return;
        }
        fetchStudents();
    }, [navigate]);

    const fetchStudents = async () => {
        try {
            const res = await getStudents();
            setStudents(res.data.students || []);
        } catch (err) {
            console.error("Failed to fetch students", err);
        }
    };

    const openStudentModal = async (student) => {
        setSelectedStudent(student);
        setIsModalOpen(true);
        setInfoLoading(true);
        try {
            const res = await getStudentInfo(student.id);
            setPersonalInfo(res.data.info || { phone: '', email: '', parent_contact: '', medical_info: '' });
        } catch (err) {
            console.error("Failed to fetch student info", err);
        }
        setInfoLoading(false);
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        try {
            await updateStudentInfo(selectedStudent.id, personalInfo);
            setSuccess(`Updated info for ${selectedStudent.name}`);
            setIsModalOpen(false);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update info');
        }
    };

    const handleEnroll = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await enrollStudent({ name, department, semester });
            if (res.data.success) {
                setSuccess(`Student ${res.data.student.name} enrolled successfully with Default ID: ${res.data.student.id} & Pass: 123`);
                setName('');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to enroll student');
        }
        setLoading(false);
    };

    const filteredAndSortedStudents = students
        .filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesDept = filterDept === 'All' || s.department === filterDept;
            return matchesSearch && matchesDept;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'id') return a.id.localeCompare(b.id);
            if (sortBy === 'semester') return a.semester - b.semester;
            return 0;
        });

    return (
        <div className="app-layout">
            <Sidebar role="admin" />
            <main className="main-content">
                <div className="page-header fade-in">
                    <h1>Administrator Dashboard</h1>
                    <p>Manage system users, enroll new students, and monitor platform activity.</p>
                </div>

                <div className="stats-grid fade-in">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                            <Shield size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>System Live</h3>
                            <p>Status: Healthy & Active</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                            <Users size={22} />
                        </div>
                        <div className="stat-info">
                            <h3>Access Control</h3>
                            <p>Admin Privileges Validated</p>
                        </div>
                    </div>
                </div>

                <div className="glass-card fade-in" style={{ maxWidth: '600px', margin: '0 auto', marginTop: '40px', animationDelay: '0.1s' }}>
                    <div className="section-title" style={{ marginBottom: '24px' }}>
                        <UserPlus size={20} /> Enroll New Student
                    </div>

                    {error && <div className="notification-banner danger">{error}</div>}
                    {success && <div className="notification-banner info"><CheckCircle size={16} /> {success}</div>}

                    <form onSubmit={handleEnroll}>
                        <div className="input-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(''); setSuccess(''); }}
                                required
                                placeholder="Enter full name (e.g. John Doe)"
                            />
                        </div>

                        <div className="input-group">
                            <label>Department</label>
                            <select
                                value={department}
                                onChange={e => setDepartment(e.target.value)}
                            >
                                <option>Computer Science</option>
                                <option>Information Technology</option>
                                <option>Electronics</option>
                                <option>Mechanical</option>
                                <option>Civil Engineering</option>
                            </select>
                        </div>

                        <div className="input-group">
                            <label>Semester</label>
                            <input
                                type="number"
                                min="1" max="8"
                                value={semester}
                                onChange={e => setSemester(Number(e.target.value))}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="login-submit-btn"
                            style={{ marginTop: '24px' }}
                            disabled={loading || !name.trim()}
                        >
                            {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><UserPlus size={18} /> Register Student</>}
                        </button>
                    </form>
                </div>

                <div className="glass-card fade-in" style={{ marginTop: '40px', animationDelay: '0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: 16 }}>
                        <div className="section-title" style={{ margin: 0 }}>
                            <Users size={20} /> All Students
                        </div>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search name or ID..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        style={{ paddingLeft: 36, width: 220, marginBottom: 0 }}
                                    />
                                </div>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Filter size={16} color="var(--text-muted)" />
                                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ marginBottom: 0 }}>
                                    <option value="All">All Departments</option>
                                    <option value="Computer Science">Computer Science</option>
                                    <option value="Information Technology">Information Technology</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Mechanical">Mechanical</option>
                                    <option value="Civil Engineering">Civil Engineering</option>
                                    <option value="AIDS">AIDS</option>
                                    <option value="IT">IT</option>
                                    <option value="CSBS">CSBS</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</span>
                                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ marginBottom: 0 }}>
                                    <option value="name">Name</option>
                                    <option value="id">ID</option>
                                    <option value="semester">Semester</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Semester</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedStudents.map((sys, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{sys.id}</td>
                                        <td>{sys.name}</td>
                                        <td>{sys.department}</td>
                                        <td>{sys.semester}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="quick-action-btn"
                                                    style={{ padding: '6px 12px', fontSize: 12 }}
                                                    onClick={() => openStudentModal(sys)}
                                                >
                                                    <Edit2 size={12} /> Personal Info
                                                </button>
                                                <button
                                                    className="quick-action-btn"
                                                    style={{ padding: '6px 12px', fontSize: 12, background: 'var(--bg-primary)', color: 'var(--text-primary)', borderColor: 'var(--border-card)' }}
                                                    onClick={() => navigate(`/student/${sys.id}`)}
                                                >
                                                    <ArrowRight size={12} /> View Dashboard
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredAndSortedStudents.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No students enrolled.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- TEACHERS LIST --- */}
                <div className="glass-card fade-in" style={{ marginTop: '40px', animationDelay: '0.3s' }}>
                    <div className="section-title" style={{ marginBottom: '24px' }}>
                        <Users size={20} /> All Teachers
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Department</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { id: 'T001', name: 'Dr. John Smith', department: 'Computer Science', status: 'Active' },
                                    { id: 'T002', name: 'Prof. Sarah Johnson', department: 'Information Technology', status: 'Active' },
                                    { id: 'T003', name: 'Dr. Michael Chen', department: 'AIDS', status: 'On Leave' },
                                ].map((teacher, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600 }}>{teacher.id}</td>
                                        <td>{teacher.name}</td>
                                        <td>{teacher.department}</td>
                                        <td>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '12px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: teacher.status === 'Active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                color: teacher.status === 'Active' ? '#16a34a' : '#dc2626'
                                            }}>
                                                {teacher.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Modal for Personal Info */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, margin: 0 }}>{selectedStudent?.name} - Personal Info</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>

                        {infoLoading ? (
                            <div className="loading-container" style={{ height: 100 }}><div className="spinner" /></div>
                        ) : (
                            <form onSubmit={handleUpdateInfo}>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={personalInfo.email || ''}
                                        onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="tel"
                                        value={personalInfo.phone || ''}
                                        onChange={e => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Parent Contact</label>
                                    <input
                                        type="tel"
                                        value={personalInfo.parent_contact || ''}
                                        onChange={e => setPersonalInfo({ ...personalInfo, parent_contact: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Medical Info / Allergies</label>
                                    <textarea
                                        value={personalInfo.medical_info || ''}
                                        onChange={e => setPersonalInfo({ ...personalInfo, medical_info: e.target.value })}
                                        style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter', minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                                    <button type="button" className="peer-reject-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                    <button type="submit" className="peer-accept-btn">Save Information</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
