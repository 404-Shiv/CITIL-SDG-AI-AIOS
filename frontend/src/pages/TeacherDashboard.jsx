import { useState, useEffect } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    AlertTriangle, Users, TrendingUp, Shield, Brain,
    Search, Eye, BookOpen, Flame, Zap, UserPlus, LayoutDashboard, Edit2, CheckCircle, X, ChevronRight, Upload
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { getTeacherDashboard, getRootCause, getStudyGroups, assignMark, getStudentInfo, updateStudentInfo } from '../api';

const RISK_COLORS = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };

const TEACHER_TABS = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
    { id: 'students', label: 'All Students', icon: <Users size={16} /> },
    { id: 'peers', label: 'Peer Matching', icon: <UserPlus size={16} /> },
    { id: 'anomalies', label: 'Anomaly Alerts', icon: <AlertTriangle size={16} /> },
];

export default function TeacherDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [rootCause, setRootCause] = useState(null);
    const [rootCauseLoading, setRootCauseLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRisk, setFilterRisk] = useState('All');
    const [filterDept, setFilterDept] = useState('All');
    const [studyGroups, setStudyGroups] = useState(null);

    // Modal States
    const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
    const [isMarksModalOpen, setIsMarksModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Marks Form State
    const [markSubject, setMarkSubject] = useState('Data Structures');
    const [markAssessment, setMarkAssessment] = useState('Offline Test');
    const [markScore, setMarkScore] = useState('');
    const [markLoading, setMarkLoading] = useState(false);
    const [markSuccess, setMarkSuccess] = useState('');

    // Info Form State
    const [personalInfo, setPersonalInfo] = useState({ phone: '', email: '', parent_contact: '', medical_info: '' });
    const [infoLoading, setInfoLoading] = useState(false);
    const [infoSuccess, setInfoSuccess] = useState('');

    useEffect(() => {
        getTeacherDashboard()
            .then(res => { setData(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (activeTab === 'peers' && !studyGroups) {
            getStudyGroups().then(res => setStudyGroups(res.data)).catch(() => { });
        }
    }, [activeTab]);

    const handleViewRootCause = (studentId) => {
        setSelectedStudent(studentId);
        setRootCauseLoading(true);
        getRootCause(studentId)
            .then(res => { setRootCause(res.data); setRootCauseLoading(false); })
            .catch(() => setRootCauseLoading(false));
    };

    const handleAssignMark = async (e) => {
        e.preventDefault();
        setMarkLoading(true);
        setMarkSuccess('');
        try {
            await assignMark(selectedStudentForModal.id, {
                subject: markSubject,
                assessment_name: markAssessment,
                score: Number(markScore)
            });
            setMarkSuccess(`Assigned ${markScore} to ${selectedStudentForModal.name}`);
            setTimeout(() => { setIsMarksModalOpen(false); setMarkSuccess(''); setMarkScore(''); }, 2000);
        } catch (err) {
            console.error(err);
        }
        setMarkLoading(false);
    };

    const openInfoModal = async (student) => {
        setSelectedStudentForModal(student);
        setIsInfoModalOpen(true);
        setInfoLoading(true);
        setInfoSuccess('');
        try {
            const res = await getStudentInfo(student.id);
            setPersonalInfo(res.data.info || { phone: '', email: '', parent_contact: '', medical_info: '' });
        } catch (err) {
            console.error(err);
        }
        setInfoLoading(false);
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        try {
            await updateStudentInfo(selectedStudentForModal.id, personalInfo);
            setInfoSuccess('Information updated successfully');
            setTimeout(() => { setIsInfoModalOpen(false); setInfoSuccess(''); }, 2000);
        } catch (err) {
            console.error(err);
        }
    };

    const handleTeacherQuickAction = (action) => {
        if (action === 'anomalies') setActiveTab('anomalies');
        else if (action === 'peermatching') setActiveTab('peers');
        else if (action === 'rootcause') setActiveTab('students');
    };

    if (loading || !data) {
        return (
            <div className="app-layout">
                <Sidebar role="teacher" onQuickAction={handleTeacherQuickAction} />
                <main className="main-content">
                    <div className="loading-container"><div className="spinner" /><p style={{ color: 'var(--text-secondary)' }}>Loading teacher dashboard...</p></div>
                </main>
            </div>
        );
    }

    const { class_summary, students, alerts, department_analytics } = data;

    const filteredStudents = students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRisk = filterRisk === 'All' || s.risk_level === filterRisk;
        const matchesDept = filterDept === 'All' || s.department === filterDept;
        return matchesSearch && matchesRisk && matchesDept;
    });

    const pieData = [
        { name: 'Low Risk', value: class_summary.low, color: RISK_COLORS.Low },
        { name: 'Medium Risk', value: class_summary.medium, color: RISK_COLORS.Medium },
        { name: 'High Risk', value: class_summary.high, color: RISK_COLORS.High },
    ];

    const deptChartData = department_analytics.map(d => ({
        name: d.department,
        'High Risk': d.high_risk,
        'Medium Risk': d.medium_risk,
        'Low Risk': d.low_risk,
    }));

    const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, fontSize: 12, color: 'var(--text-primary)' };

    return (
        <div className="app-layout">
            <Sidebar role="teacher" onQuickAction={handleTeacherQuickAction} />
            <main className="main-content">
                <div className="page-header">
                    <h1>Teacher Dashboard</h1>
                    <p>Class-level intelligence and intervention tools for {class_summary.total} students.</p>
                </div>

                {/* Tab Navigation */}
                <div className="tab-nav">
                    {TEACHER_TABS.map(tab => (
                        <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* ========== OVERVIEW TAB ========== */}
                {activeTab === 'overview' && (
                    <div className="fade-in">
                        {/* Stats */}
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.1)', color: 'var(--accent-yellow)' }}><Users size={22} /></div>
                                <div className="stat-info"><h3>{class_summary.total}</h3><p>Total Students</p></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.08)', color: 'var(--risk-high)' }}><AlertTriangle size={22} /></div>
                                <div className="stat-info"><h3>{class_summary.high}</h3><p>High Risk</p></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.08)', color: 'var(--risk-medium)' }}><Shield size={22} /></div>
                                <div className="stat-info"><h3>{class_summary.medium}</h3><p>Medium Risk</p></div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.08)', color: 'var(--risk-low)' }}><TrendingUp size={22} /></div>
                                <div className="stat-info"><h3>{class_summary.low}</h3><p>Low Risk</p></div>
                            </div>
                        </div>

                        {/* Charts */}
                        <div className="charts-grid">
                            <div className="chart-card">
                                <h3>📊 Risk Distribution</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3} stroke="none">
                                            {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="chart-card">
                                <h3>🏢 Department-wise Risk</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={deptChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                                        <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                        <Tooltip contentStyle={tooltipStyle} />
                                        <Bar dataKey="High Risk" stackId="a" fill="#ef4444" />
                                        <Bar dataKey="Medium Risk" stackId="a" fill="#f59e0b" />
                                        <Bar dataKey="Low Risk" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <h2 className="section-title"><Zap size={20} /> Quick Actions</h2>
                        <div className="quick-actions" style={{ marginBottom: 20 }}>
                            <button className="quick-action-btn" onClick={() => setActiveTab('students')}><Users size={16} /> View All Students</button>
                            <button className="quick-action-btn" onClick={() => setActiveTab('peers')}><UserPlus size={16} /> Peer Matching & Study Groups</button>
                            <button className="quick-action-btn" onClick={() => setActiveTab('anomalies')}><AlertTriangle size={16} /> View Anomaly Alerts</button>
                        </div>
                    </div>
                )}

                {/* ========== ALL STUDENTS TAB ========== */}
                {activeTab === 'students' && (
                    <div className="fade-in">
                        <h2 className="section-title"><Users size={20} /> Student Risk Overview</h2>
                        <div className="glass-card no-hover" style={{ marginBottom: 24, padding: 0 }}>
                            <div style={{ display: 'flex', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                    <input type="text" placeholder="Search students..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none' }} />
                                </div>
                                <select value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}>
                                    <option value="All">All Depts</option>
                                    <option value="AIDS">AIDS</option>
                                    <option value="IT">IT</option>
                                    <option value="CSBS">CSBS</option>
                                </select>
                                <select value={filterRisk} onChange={e => setFilterRisk(e.target.value)} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', padding: '8px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif', cursor: 'pointer', outline: 'none' }}>
                                    <option value="All">All Risk</option>
                                    <option value="High">High Risk</option>
                                    <option value="Medium">Medium Risk</option>
                                    <option value="Low">Low Risk</option>
                                </select>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead><tr><th>Student</th><th>Dept</th><th>Risk</th><th>Score</th><th>Attendance</th><th>Avg Score</th><th>LMS/wk</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filteredStudents.slice(0, 30).map((s, i) => (
                                            <tr key={s.id} className="fade-in" style={{ animationDelay: `${i * 0.02}s` }}>
                                                <td><div className="student-cell"><div className="avatar" style={{ background: s.avatar_color }}>{s.name.split(' ').map(n => n[0]).join('')}</div><div><div style={{ fontWeight: 500 }}>{s.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.id}</div></div></div></td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.department}</td>
                                                <td><span className={`risk-badge ${s.risk_level.toLowerCase()}`}>{s.risk_level}</span></td>
                                                <td style={{ fontWeight: 600, color: RISK_COLORS[s.risk_level] }}>{s.risk_score}</td>
                                                <td style={{ color: s.attendance_pct < 75 ? 'var(--risk-high)' : 'var(--text-secondary)' }}>{s.attendance_pct}%</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.avg_score}</td>
                                                <td style={{ color: 'var(--text-secondary)' }}>{s.avg_lms_logins}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button title="Analyze Risk" onClick={() => handleViewRootCause(s.id)} style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8, padding: '5px 8px', color: 'var(--accent-yellow)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = 'var(--accent-yellow)'; e.target.style.color = 'white'; }} onMouseLeave={e => { e.target.style.background = 'rgba(251,191,36,0.06)'; e.target.style.color = 'var(--accent-yellow)'; }}>
                                                            <Brain size={14} />
                                                        </button>
                                                        <button title="Upload Offline Mark" onClick={() => { setSelectedStudentForModal(s); setIsMarksModalOpen(true); }} style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '5px 8px', color: '#3b82f6', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = '#3b82f6'; e.target.style.color = 'white'; }} onMouseLeave={e => { e.target.style.background = 'rgba(59,130,246,0.06)'; e.target.style.color = '#3b82f6'; }}>
                                                            <Upload size={14} />
                                                        </button>
                                                        <button title="Edit Personal Info" onClick={() => openInfoModal(s)} style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '5px 8px', color: '#22c55e', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.target.style.background = '#22c55e'; e.target.style.color = 'white'; }} onMouseLeave={e => { e.target.style.background = 'rgba(34,197,94,0.06)'; e.target.style.color = '#22c55e'; }}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ padding: '10px 20px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-light)' }}>
                                Showing {Math.min(filteredStudents.length, 30)} of {filteredStudents.length} students
                            </div>
                        </div>

                        {/* Root Cause Panel */}
                        {selectedStudent && (
                            <div className="glass-card no-hover fade-in" style={{ marginBottom: 40 }}>
                                <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Brain size={20} style={{ color: 'var(--accent-yellow)' }} />
                                    Root Cause Intelligence — {rootCause?.student_name || selectedStudent}
                                </h3>
                                {rootCauseLoading ? (
                                    <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                                ) : rootCause ? (
                                    <div>
                                        <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 28, fontWeight: 800, color: RISK_COLORS[rootCause.risk_level] }}>{rootCause.risk_score}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Risk Score</div></div>
                                            <div style={{ textAlign: 'center' }}><span className={`risk-badge ${rootCause.risk_level.toLowerCase()}`} style={{ fontSize: 13, padding: '6px 16px' }}>{rootCause.risk_level} Risk</span></div>
                                            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{rootCause.primary_causes.length} Issues</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Need Attention</div></div>
                                        </div>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Contributing Factors</h4>
                                        {rootCause.factors.map((f, i) => (
                                            <div key={i} className="factor-bar">
                                                <div className="factor-label">{f.factor}</div>
                                                <div className="factor-track"><div className="factor-fill" style={{ width: `${f.factor === 'Engagement Trend' ? Math.max(0, (f.value + 100) / 2) : (typeof f.value === 'number' && f.unit === '/10' ? f.value * 10 : f.value)}%`, background: f.color }} /></div>
                                                <div className="factor-value" style={{ color: f.color }}>{typeof f.value === 'number' ? (f.unit === '/10' ? f.value.toFixed(1) : f.value.toFixed(0)) : f.value}{f.unit}</div>
                                            </div>
                                        ))}
                                        {rootCause.interventions.length > 0 && (
                                            <>
                                                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '20px 0 10px' }}>Recommended Interventions</h4>
                                                {rootCause.interventions.map((inv, i) => (
                                                    <div key={i} className="intervention-card">
                                                        <h4><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: inv.urgency === 'high' ? 'var(--risk-high)' : 'var(--risk-medium)' }} /> {inv.title}</h4>
                                                        <p>{inv.description}</p>
                                                        <ul>{inv.actions.map((a, j) => <li key={j}>{a}</li>)}</ul>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                ) : <p style={{ color: 'var(--text-muted)' }}>Failed to load analysis.</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* ========== PEER MATCHING TAB ========== */}
                {activeTab === 'peers' && (
                    <div className="fade-in">
                        <h2 className="section-title"><UserPlus size={20} /> Peer Matching & Study Groups</h2>
                        {studyGroups ? (
                            <div className="cards-grid" style={{ marginBottom: 24 }}>
                                {studyGroups.groups?.map((group, i) => (
                                    <div key={i} className="glass-card" style={{ margin: 0, animationDelay: `${i * 0.05}s` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-yellow)' }}>Group {i + 1}</span>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Focus: {group.focus_areas?.join(', ') || 'General'}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {group.members?.map((m, j) => (
                                                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.avatar_color || `hsl(${j * 90}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                                        {m.name.split(' ').map(n => n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{m.department || ''} · Role: {m.role}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="loading-container" style={{ height: 200 }}><div className="spinner" /></div>
                        )}
                    </div>
                )}

                {/* ========== ANOMALY ALERTS TAB ========== */}
                {activeTab === 'anomalies' && (
                    <div className="fade-in">
                        <h2 className="section-title"><Flame size={20} /> Burnout & Anomaly Alerts</h2>
                        {alerts.length > 0 ? (
                            <div className="cards-grid" style={{ marginBottom: 24 }}>
                                {alerts.map((alert, i) => (
                                    <div key={i} className="glass-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', background: alert.burnout_risk === 'High' ? 'var(--risk-high)' : 'var(--risk-medium)' }}>{alert.name.split(' ').map(n => n[0]).join('')}</div>
                                                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{alert.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{alert.student_id}</div></div>
                                            </div>
                                            <span className={`risk-badge ${alert.burnout_risk.toLowerCase()}`}>{alert.burnout_risk}</span>
                                        </div>
                                        {alert.top_anomaly && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{alert.top_anomaly.description}</div>}
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{alert.anomaly_count} anomal{alert.anomaly_count === 1 ? 'y' : 'ies'} detected</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="glass-card no-hover" style={{ textAlign: 'center', padding: 40 }}>
                                <p style={{ color: 'var(--text-muted)' }}>No anomaly alerts at this time. All students are within normal behavioral parameters.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Offline Marks Modal */}
            {isMarksModalOpen && (
                <div className="modal-overlay" onClick={() => setIsMarksModalOpen(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, margin: 0 }}>Assign Offline Mark</h2>
                            <button onClick={() => setIsMarksModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>
                        <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                            Student: <strong>{selectedStudentForModal?.name}</strong> ({selectedStudentForModal?.id})
                        </p>
                        {markSuccess && <div className="notification-banner info"><CheckCircle size={16} /> {markSuccess}</div>}
                        <form onSubmit={handleAssignMark}>
                            <div className="input-group">
                                <label>Subject</label>
                                <select value={markSubject} onChange={e => setMarkSubject(e.target.value)}>
                                    {['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'].map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Assessment Name</label>
                                <input type="text" value={markAssessment} onChange={e => setMarkAssessment(e.target.value)} required placeholder="e.g. Midterm Lab Test" />
                            </div>
                            <div className="input-group">
                                <label>Score (0-100)</label>
                                <input type="number" min="0" max="100" value={markScore} onChange={e => setMarkScore(e.target.value)} required />
                            </div>
                            <button type="submit" className="login-submit-btn" style={{ marginTop: 20 }} disabled={markLoading}>
                                {markLoading ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Assign mark'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Personal Info Modal */}
            {isInfoModalOpen && (
                <div className="modal-overlay" onClick={() => setIsInfoModalOpen(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, margin: 0 }}>Edit Personal Info</h2>
                            <button onClick={() => setIsInfoModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>
                        <p style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                            Student: <strong>{selectedStudentForModal?.name}</strong> ({selectedStudentForModal?.id})
                        </p>
                        {infoSuccess && <div className="notification-banner info"><CheckCircle size={16} /> {infoSuccess}</div>}
                        {infoLoading ? (
                            <div className="loading-container" style={{ height: 100 }}><div className="spinner" /></div>
                        ) : (
                            <form onSubmit={handleUpdateInfo}>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input type="email" value={personalInfo.email || ''} onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Phone</label>
                                    <input type="tel" value={personalInfo.phone || ''} onChange={e => setPersonalInfo({ ...personalInfo, phone: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Parent Contact</label>
                                    <input type="tel" value={personalInfo.parent_contact || ''} onChange={e => setPersonalInfo({ ...personalInfo, parent_contact: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <label>Medical Info / Allergies</label>
                                    <textarea value={personalInfo.medical_info || ''} onChange={e => setPersonalInfo({ ...personalInfo, medical_info: e.target.value })} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-primary)', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', fontFamily: 'Inter', minHeight: '80px', resize: 'vertical' }} />
                                </div>
                                <button type="submit" className="login-submit-btn" style={{ marginTop: 20 }}>Save Information</button>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
