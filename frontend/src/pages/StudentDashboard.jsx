import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
    AlertTriangle, TrendingUp, BookOpen, Users, Calendar, Activity,
    Bell, Play, CheckCircle, Flame, Target, Zap, BookMarked, GraduationCap,
    ChevronRight, ChevronLeft, Clock, Award, UserPlus, UserCheck, X, Send, Inbox,
    BarChart2, Brain, TrendingDown, Edit2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import AIAssistant from '../components/AIAssistant';
import { getStudentDashboard, getPeers, getLearning, getStudentCourse, sendPeerRequest, respondPeerRequest, getPeerRequests, getStudentInfo, updateStudentInfo } from '../api';

const TABS = [
    { id: 'overview', label: 'Overview', icon: <Zap size={16} /> },
    { id: 'behavior', label: 'Behavioral Analysis', icon: <Brain size={16} /> },
    { id: 'learning', label: 'Learning Path', icon: <BookOpen size={16} /> },
    { id: 'resources', label: 'Resources', icon: <Play size={16} /> },
    { id: 'peers', label: 'Peer Matching', icon: <Users size={16} /> },
    { id: 'courses', label: 'Courses & Assessments', icon: <BookMarked size={16} /> },
];

export default function StudentDashboard() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const sid = studentId || 'S001';
    const [activeTab, setActiveTab] = useState('overview');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [peerData, setPeerData] = useState(null);
    const [peerRequests, setPeerRequests] = useState(null);
    const [sendingTo, setSendingTo] = useState(null);
    const [fullLearning, setFullLearning] = useState(null);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseData, setCourseData] = useState(null);
    const [courseLoading, setCourseLoading] = useState(false);
    const [authError, setAuthError] = useState(null);

    // Personal Info Modal States
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [personalInfo, setPersonalInfo] = useState({ phone: '', email: '', parent_contact: '', medical_info: '' });
    const [infoLoading, setInfoLoading] = useState(false);
    const [infoSuccess, setInfoSuccess] = useState('');

    useEffect(() => {
        if (!studentId) { navigate('/'); return; }

        // --- Privacy Guard ---
        const userStr = sessionStorage.getItem('user');
        const role = sessionStorage.getItem('role');
        if (role !== 'admin') {
            const user = userStr ? JSON.parse(userStr) : null;
            if (!user || user.id !== studentId) {
                setAuthError("Unauthorized: You can only view your own analysis.");
                setLoading(false);
                return;
            }
        }
        // ---------------------

        setLoading(true);
        getStudentDashboard(sid)
            .then(res => { setData(res.data); setLoading(false); })
            .catch(() => setLoading(false));
    }, [sid]);

    // Load peer data on tab switch
    useEffect(() => {
        if (activeTab === 'peers') {
            if (!peerData) getPeers(sid).then(res => setPeerData(res.data)).catch(() => { });
            refreshPeerRequests();
        }
        if ((activeTab === 'learning' || activeTab === 'resources') && !fullLearning) {
            getLearning(sid).then(res => setFullLearning(res.data)).catch(() => { });
        }
    }, [activeTab]);

    const refreshPeerRequests = () => {
        getPeerRequests(sid).then(res => setPeerRequests(res.data)).catch(() => { });
    };

    const handleSendRequest = async (toId) => {
        setSendingTo(toId);
        try {
            await sendPeerRequest(sid, toId);
            refreshPeerRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to send request');
        }
        setSendingTo(null);
    };

    const handleRespondRequest = async (reqId, action) => {
        try {
            await respondPeerRequest(reqId, action);
            refreshPeerRequests();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to respond');
        }
    };

    const handleCourseClick = (courseName) => {
        setSelectedCourse(courseName);
        setCourseLoading(true);
        getStudentCourse(courseName, sid)
            .then(res => { setCourseData(res.data); setCourseLoading(false); })
            .catch(() => setCourseLoading(false));
    };

    const openInfoModal = async () => {
        setIsInfoModalOpen(true);
        setInfoLoading(true);
        setInfoSuccess('');
        try {
            const res = await getStudentInfo(sid);
            setPersonalInfo(res.data.info || { phone: '', email: '', parent_contact: '', medical_info: '' });
        } catch (err) {
            console.error(err);
        }
        setInfoLoading(false);
    };

    const handleUpdateInfo = async (e) => {
        e.preventDefault();
        try {
            await updateStudentInfo(sid, personalInfo);
            setInfoSuccess('Information updated successfully');
            setTimeout(() => { setIsInfoModalOpen(false); setInfoSuccess(''); }, 2000);
        } catch (err) {
            console.error(err);
        }
    };

    if (authError) {
        return (
            <div className="login-page">
                <div className="login-container">
                    <AlertTriangle size={48} style={{ color: 'var(--risk-high)', margin: '0 auto 16px' }} />
                    <h1 style={{ fontSize: 24, marginBottom: 12 }}>Access Denied</h1>
                    <p style={{ marginBottom: 24 }}>{authError}</p>
                    <button className="login-submit" onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </div>
        );
    }

    if (loading || !data) {
        return (
            <div className="app-layout">
                <Sidebar role="student" onQuickAction={(tab) => setActiveTab(tab)} />
                <main className="main-content">
                    <div className="loading-container">
                        <div className="spinner" />
                        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard...</p>
                    </div>
                </main>
            </div>
        );
    }

    const { student, risk, attendance, subject_scores, lms_trend, historical_grades, anomaly, peers, learning, notifications } = data;
    const riskColor = risk.risk_level === 'High' ? 'var(--risk-high)' : risk.risk_level === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)';

    const subjectChartData = Object.entries(subject_scores).map(([name, score]) => ({
        subject: name.length > 12 ? name.slice(0, 12) + '…' : name, score, fullMark: 100,
    }));

    const attendanceChartData = attendance.records.map((r, i) => ({
        day: i + 1,
        cumulative: attendance.records.slice(0, i + 1).filter(a => a.present).length / (i + 1) * 100,
    }));

    const lmsChartData = lms_trend.map(w => ({ week: `W${w.week}`, logins: w.logins, hours: w.hours }));
    const gpaChartData = historical_grades.map(g => ({ semester: `Sem ${g.semester}`, gpa: g.gpa }));

    return (
        <div className="app-layout">
            <div className="app-container">
                <Sidebar role="student" onQuickAction={(tab) => setActiveTab(tab)} />
                <main className="main-content">
                    <div className="page-header">
                        <h1>Welcome, {student.name}</h1>
                        <p>{student.department} · Semester {student.semester} · {student.id}</p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="tab-nav">
                        {TABS.map(tab => (
                            <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* ========== OVERVIEW TAB ========== */}
                    {activeTab === 'overview' && (
                        <div className="fade-in">
                            {/* Notifications */}
                            {notifications.map((n, i) => (
                                <div key={i} className={`notification-banner ${n.type}`}>
                                    <Bell size={16} /> {n.message}
                                </div>
                            ))}

                            {/* Quick Actions */}
                            <h2 className="section-title"><Zap size={20} /> Quick Actions</h2>
                            <div className="quick-actions" style={{ marginBottom: 20 }}>
                                <button className="quick-action-btn" onClick={() => setActiveTab('learning')}><BookOpen size={16} /> View Learning Path</button>
                                <button className="quick-action-btn" onClick={() => setActiveTab('peers')}><Users size={16} /> Find Study Partner</button>
                                <button className="quick-action-btn" onClick={() => setActiveTab('courses')}><BookMarked size={16} /> Weekly Assessments</button>
                                <button className="quick-action-btn" onClick={() => setActiveTab('behavior')}><Brain size={16} /> Behavioral Analysis</button>
                            </div>

                            {/* Calendar + Streak Row */}
                            <div className="charts-grid" style={{ marginBottom: 24 }}>
                                {/* Daily Streak */}
                                <div className="glass-card no-hover streak-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                        <div className="streak-fire"><Flame size={28} /></div>
                                        <div>
                                            <div className="streak-count">{attendance.streak || 0}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Day Streak</div>
                                        </div>
                                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-yellow)' }}>{attendance.max_streak || 0}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Best Streak</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 6, justifyContent: 'space-between', marginBottom: 12 }}>
                                        {['Attendance', 'Present', 'Absent'].map((label, i) => (
                                            <div key={i} style={{ textAlign: 'center', flex: 1 }}>
                                                <div style={{ fontSize: 16, fontWeight: 700, color: i === 0 ? 'var(--accent-blue)' : i === 1 ? 'var(--risk-low)' : 'var(--risk-high)' }}>
                                                    {i === 0 ? `${attendance.percentage}%` : i === 1 ? (attendance.total_present || 0) : ((attendance.total_days || 0) - (attendance.total_present || 0))}
                                                </div>
                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="progress-bar" style={{ height: 8 }}>
                                        <div className="progress-fill" style={{ width: `${attendance.percentage}%`, background: attendance.percentage >= 75 ? 'var(--risk-low)' : 'var(--risk-high)' }} />
                                    </div>
                                </div>

                                {/* Attendance Calendar Removed */}
                            </div>

                            {/* Stats */}
                            <div className="stats-grid">
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(251, 191, 36, 0.15)', color: 'var(--accent-yellow)' }}><Target size={22} /></div>
                                    <div className="stat-info"><h3 style={{ color: riskColor }}>{risk.risk_level}</h3><p>Risk Level</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}><Calendar size={22} /></div>
                                    <div className="stat-info"><h3>{attendance.percentage}%</h3><p>Attendance</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-teal)' }}><Activity size={22} /></div>
                                    <div className="stat-info"><h3>{learning.summary.overall_readiness}%</h3><p>Academic Readiness</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: anomaly.burnout_risk === 'Low' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: anomaly.burnout_risk === 'Low' ? 'var(--risk-low)' : 'var(--risk-medium)' }}><Flame size={22} /></div>
                                    <div className="stat-info"><h3>{anomaly.burnout_risk}</h3><p>Burnout Risk</p></div>
                                </div>
                            </div>

                            {/* Risk + Radar */}
                            <div className="charts-grid">
                                <div className="chart-card">
                                    <h3>📊 Risk Score</h3>
                                    <div className="risk-gauge">
                                        <div className="gauge-circle">
                                            <span className="gauge-score" style={{ color: riskColor }}>{risk.risk_score}</span>
                                            <span className="gauge-label">Risk Score</span>
                                        </div>
                                        <span className="gauge-risk-level" style={{ color: riskColor }}>{risk.risk_level} Risk</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 8 }}>
                                        {['low', 'medium', 'high'].map(l => (
                                            <div key={l} style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 18, fontWeight: 700, color: `var(--risk-${l})` }}>{risk.probabilities[l]}%</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{l}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="chart-card">
                                    <h3>📈 Subject Performance</h3>
                                    <ResponsiveContainer width="100%" height={280}>
                                        <RadarChart data={subjectChartData}>
                                            <PolarGrid stroke="rgba(0,0,0,0.06)" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 9 }} />
                                            <Radar name="Score" dataKey="score" stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.25} strokeWidth={2} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Attendance + LMS */}
                            <div className="charts-grid">
                                <div className="chart-card">
                                    <h3>📅 Attendance Trend</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <AreaChart data={attendanceChartData}>
                                            <defs><linearGradient id="attG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                            <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, fontSize: 12 }} />
                                            <Area type="monotone" dataKey="cumulative" stroke="#3b82f6" fill="url(#attG)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="chart-card">
                                    <h3>💻 LMS Activity</h3>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <BarChart data={lmsChartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                                            <XAxis dataKey="week" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-card)', borderRadius: 10, fontSize: 12 }} />
                                            <Bar dataKey="logins" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="hours" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== BEHAVIORAL ANALYSIS TAB ========== */}
                    {activeTab === 'behavior' && (
                        <div className="fade-in">
                            <h2 className="section-title"><Brain size={20} /> Behavioral Analysis</h2>

                            {/* Burnout + Assignment Stats */}
                            <div className="stats-grid" style={{ marginBottom: 24 }}>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: anomaly.burnout_risk === 'High' ? 'rgba(239,68,68,0.15)' : anomaly.burnout_risk === 'Medium' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)', color: anomaly.burnout_risk === 'High' ? 'var(--risk-high)' : anomaly.burnout_risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)' }}>
                                        <Flame size={22} />
                                    </div>
                                    <div className="stat-info"><h3 style={{ color: anomaly.burnout_risk === 'High' ? 'var(--risk-high)' : anomaly.burnout_risk === 'Medium' ? 'var(--risk-medium)' : 'var(--risk-low)' }}>{anomaly.burnout_risk}</h3><p>Burnout Risk</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-yellow)' }}><AlertTriangle size={22} /></div>
                                    <div className="stat-info"><h3>{anomaly.anomaly_count}</h3><p>Anomalies Detected</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}><BarChart2 size={22} /></div>
                                    <div className="stat-info"><h3>{anomaly.assignment_info?.total_missed || 0}</h3><p>Assignments Missed</p></div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.15)', color: 'var(--accent-teal)' }}><TrendingUp size={22} /></div>
                                    <div className="stat-info"><h3>{anomaly.engagement_trend?.length || 0}</h3><p>Weeks Tracked</p></div>
                                </div>
                            </div>

                            {/* Engagement Trend Chart */}
                            <div className="charts-grid" style={{ marginBottom: 24 }}>
                                <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                                    <h3 style={{ marginBottom: 16 }}>📈 Weekly Engagement Trend</h3>
                                    {anomaly.engagement_trend?.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={280}>
                                            <LineChart data={anomaly.engagement_trend.map(m => ({ ...m, engagement: Math.round(m.engagement_score * 10) / 10 }))}>
                                                <defs>
                                                    <linearGradient id="engG" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.3} />
                                                        <stop offset="100%" stopColor="#fbbf24" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                                <XAxis dataKey="week" tick={{ fill: '#6a6a85', fontSize: 11 }} label={{ value: 'Week', position: 'insideBottom', offset: -5, fill: '#6a6a85', fontSize: 11 }} />
                                                <YAxis tick={{ fill: '#6a6a85', fontSize: 10 }} />
                                                <Tooltip contentStyle={{ background: '#1a1a3e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                                                <Line type="monotone" dataKey="engagement" name="Engagement Score" stroke="#fbbf24" strokeWidth={2.5} dot={{ fill: '#fbbf24', r: 3 }} activeDot={{ r: 5, fill: '#fcd34d' }} />
                                                <Line type="monotone" dataKey="logins" name="Logins" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                                                <Line type="monotone" dataKey="time_spent" name="Hours Spent" stroke="#14b8a6" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>No engagement data yet.</p>}
                                </div>
                            </div>

                            {/* Anomaly Timeline */}
                            {anomaly.anomalies?.length > 0 && (
                                <>
                                    <h2 className="section-title"><AlertTriangle size={20} /> Detected Anomalies</h2>
                                    <div className="cards-grid" style={{ marginBottom: 24 }}>
                                        {anomaly.anomalies.map((a, i) => (
                                            <div key={i} className="glass-card fade-in" style={{ animationDelay: `${i * 0.05}s`, borderLeft: `3px solid ${a.severity === 'high' ? 'var(--risk-high)' : 'var(--risk-medium)'}` }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600 }}>Week {a.week}</span>
                                                    <span className={`risk-badge ${a.severity}`}>{a.severity}</span>
                                                </div>
                                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{a.description}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Type: {a.type.replace(/_/g, ' ')}</div>
                                                {a.details && (
                                                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                        {Object.entries(a.details).map(([k, v], j) => (
                                                            <span key={j} style={{ fontSize: 10, background: 'rgba(251,191,36,0.1)', color: 'var(--accent-yellow)', padding: '2px 6px', borderRadius: 6 }}>
                                                                {k.replace(/_/g, ' ')}: {typeof v === 'number' ? v.toFixed(1) : v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Weekly Engagement Breakdown */}
                            {anomaly.engagement_trend?.length > 0 && (
                                <>
                                    <h2 className="section-title"><Activity size={20} /> Weekly Engagement Breakdown</h2>
                                    <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Week</th><th>Logins</th><th>Hours</th><th>Resources</th><th>Forum</th><th>Engagement</th><th>Trend</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {anomaly.engagement_trend.map((w, i) => {
                                                        const prev = i > 0 ? anomaly.engagement_trend[i - 1].engagement_score : w.engagement_score;
                                                        const delta = w.engagement_score - prev;
                                                        return (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 600 }}>W{w.week}</td>
                                                                <td>{w.logins}</td>
                                                                <td>{w.time_spent?.toFixed(1) || '—'} h</td>
                                                                <td>{w.resources}</td>
                                                                <td>{w.forum_posts}</td>
                                                                <td style={{ fontWeight: 600, color: w.engagement_score > 15 ? 'var(--risk-low)' : w.engagement_score > 8 ? 'var(--risk-medium)' : 'var(--risk-high)' }}>
                                                                    {w.engagement_score?.toFixed(1) || '—'}
                                                                </td>
                                                                <td>
                                                                    {delta > 0 ? (
                                                                        <span style={{ color: 'var(--risk-low)', display: 'flex', alignItems: 'center', gap: 2 }}><TrendingUp size={12} /> +{delta.toFixed(1)}</span>
                                                                    ) : delta < 0 ? (
                                                                        <span style={{ color: 'var(--risk-high)', display: 'flex', alignItems: 'center', gap: 2 }}><TrendingDown size={12} /> {delta.toFixed(1)}</span>
                                                                    ) : (
                                                                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== LEARNING PATH TAB ========== */}
                    {activeTab === 'learning' && (
                        <div className="fade-in">
                            <h2 className="section-title"><BookOpen size={20} /> Personalized Learning Path</h2>
                            {(fullLearning || learning).learning_path?.length > 0 ? (
                                <div className="cards-grid" style={{ marginBottom: 24 }}>
                                    {(fullLearning || learning).learning_path.map((item, i) => (
                                        <div key={i} className="learning-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600 }}>{item.subject}</span>
                                                <span className={`risk-badge ${item.gap_severity === 'severe' ? 'high' : item.gap_severity === 'moderate' ? 'medium' : 'low'}`}>{item.gap_severity}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{item.current_level} → {item.target_level}</div>
                                            <div className="progress-bar" style={{ marginBottom: 8 }}>
                                                <div className="progress-fill" style={{ width: `${item.overall_score}%`, background: item.gap_severity === 'severe' ? 'var(--risk-high)' : item.gap_severity === 'moderate' ? 'var(--risk-medium)' : 'var(--risk-low)' }} />
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Score: {item.overall_score}%</div>
                                            {item.recommendations?.slice(0, 3).map((rec, j) => (
                                                <div key={j} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={10} style={{ color: 'var(--accent-teal)', flexShrink: 0 }} /> {rec.action}
                                                </div>
                                            ))}
                                            <button className="quick-action-btn" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => { setActiveTab('courses'); handleCourseClick(item.subject); }}>
                                                <ChevronRight size={14} /> View Course
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No concept gaps detected — great job!</p>}

                            {/* Concept Gap Summary */}
                            {fullLearning?.concept_gaps && (
                                <>
                                    <h2 className="section-title"><Target size={20} /> Subject Mastery Overview</h2>
                                    <div className="glass-card no-hover" style={{ marginBottom: 24 }}>
                                        {fullLearning.concept_gaps.map((g, i) => (
                                            <div key={i} className="factor-bar">
                                                <div className="factor-label">{g.subject}</div>
                                                <div className="factor-track">
                                                    <div className="factor-fill" style={{ width: `${g.overall_score}%`, background: g.mastery_level === 'Advanced' ? '#22c55e' : g.mastery_level === 'Proficient' ? '#3b82f6' : g.mastery_level === 'Developing' ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                                <div className="factor-value" style={{ color: g.mastery_level === 'Advanced' ? '#22c55e' : g.mastery_level === 'Proficient' ? '#3b82f6' : g.mastery_level === 'Developing' ? '#f59e0b' : '#ef4444', width: 80 }}>
                                                    {g.mastery_level}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ========== RESOURCES TAB ========== */}
                    {activeTab === 'resources' && (
                        <div className="fade-in">
                            <h2 className="section-title"><Play size={20} /> Recommended Learning Resources</h2>
                            {(fullLearning?.youtube_recommendations || learning.youtube)?.length > 0 ? (
                                <div className="cards-grid" style={{ marginBottom: 40 }}>
                                    {(fullLearning?.youtube_recommendations || learning.youtube).map((yt, i) => (
                                        <a key={i} href={yt.url} target="_blank" rel="noreferrer" className="youtube-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                            <div className="yt-icon"><Play size={18} /></div>
                                            <div className="yt-info">
                                                <h4>{yt.title}</h4>
                                                <p>{yt.channel} · {yt.subject}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : <p style={{ color: 'var(--text-muted)' }}>No specific recommendations — explore courses in the Courses tab.</p>}
                        </div>
                    )}

                    {/* ========== PEER MATCHING TAB ========== */}
                    {activeTab === 'peers' && (
                        <div className="fade-in">
                            <h2 className="section-title"><Users size={20} /> Peer Study Partners</h2>

                            {/* Accepted Partners */}
                            {peerRequests?.accepted_partners?.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--risk-low)' }}>
                                        <UserCheck size={16} /> Study Partners ({peerRequests.accepted_partners.length})
                                    </h3>
                                    <div className="cards-grid" style={{ marginBottom: 24 }}>
                                        {peerRequests.accepted_partners.map((p, i) => (
                                            <div key={i} className="peer-card fade-in" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                                                <div className="peer-header">
                                                    <div className="peer-avatar" style={{ background: p.avatar_color }}>{p.name.split(' ').map(n => n[0]).join('')}</div>
                                                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.department} · {p.id}</div></div>
                                                    <span className="risk-badge low" style={{ marginLeft: 'auto' }}><UserCheck size={10} /> Connected</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Pending Received — Accept / Reject */}
                            {peerRequests?.pending_received?.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-yellow)' }}>
                                        <Inbox size={16} /> Incoming Requests ({peerRequests.pending_received.length})
                                    </h3>
                                    <div className="cards-grid" style={{ marginBottom: 24 }}>
                                        {peerRequests.pending_received.map((req, i) => (
                                            <div key={i} className="peer-card fade-in" style={{ borderColor: 'rgba(251,191,36,0.3)' }}>
                                                <div className="peer-header">
                                                    <div className="peer-avatar" style={{ background: req.from_avatar }}>{req.from_name.split(' ').map(n => n[0]).join('')}</div>
                                                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{req.from_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.from_dept} · {req.from_id}</div></div>
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0', fontStyle: 'italic' }}>"{req.message}"</div>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <button className="peer-accept-btn" onClick={() => handleRespondRequest(req.id, 'accept')}>
                                                        <CheckCircle size={14} /> Accept
                                                    </button>
                                                    <button className="peer-reject-btn" onClick={() => handleRespondRequest(req.id, 'reject')}>
                                                        <X size={14} /> Decline
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Sent Requests */}
                            {peerRequests?.sent?.length > 0 && (
                                <>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-blue)' }}>
                                        <Send size={16} /> Sent Requests
                                    </h3>
                                    <div className="cards-grid" style={{ marginBottom: 24 }}>
                                        {peerRequests.sent.map((req, i) => (
                                            <div key={i} className="peer-card fade-in" style={{ opacity: req.status === 'rejected' ? 0.5 : 1 }}>
                                                <div className="peer-header">
                                                    <div className="peer-avatar" style={{ background: req.to_avatar }}>{req.to_name.split(' ').map(n => n[0]).join('')}</div>
                                                    <div><div style={{ fontSize: 14, fontWeight: 600 }}>{req.to_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{req.to_dept}</div></div>
                                                    <span className={`risk-badge ${req.status === 'accepted' ? 'low' : req.status === 'rejected' ? 'high' : 'medium'}`} style={{ marginLeft: 'auto' }}>
                                                        {req.status === 'pending' ? '⏳ Pending' : req.status === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* AI-Suggested Peers — Send Request */}
                            <h3 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <UserPlus size={16} /> Suggested Study Partners
                            </h3>
                            {peerData ? (
                                <>
                                    {peerData.strengths?.length > 0 && (
                                        <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your strengths:</span>
                                            {peerData.strengths.map((s, i) => (
                                                <span key={i} style={{ fontSize: 11, background: 'rgba(34,197,94,0.1)', color: '#22c55e', padding: '3px 8px', borderRadius: 8 }}>{s}</span>
                                            ))}
                                        </div>
                                    )}
                                    {peerData.weaknesses?.length > 0 && (
                                        <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Needs improvement:</span>
                                            {peerData.weaknesses.map((s, i) => (
                                                <span key={i} style={{ fontSize: 11, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 8px', borderRadius: 8 }}>{s}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div className="cards-grid" style={{ marginBottom: 40 }}>
                                        {(peerData.matches || []).map((p, i) => {
                                            const alreadySent = peerRequests?.sent?.some(r => r.to_id === p.student_id);
                                            const alreadyReceived = peerRequests?.pending_received?.some(r => r.from_id === p.student_id);
                                            const alreadyPartner = peerRequests?.accepted_partners?.some(r => r.id === p.student_id);

                                            return (
                                                <div key={i} className="peer-card fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                                                    <div className="peer-header">
                                                        <div className="peer-avatar" style={{ background: alreadyPartner ? p.avatar_color : '#6b7280' }}>
                                                            {alreadyPartner ? p.name.split(' ').map(n => n[0]).join('') : 'P'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 14, fontWeight: 600 }}>
                                                                {alreadyPartner ? p.name : `Peer ${i + 1}`}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {alreadyPartner ? p.department : 'Department Hidden'}
                                                            </div>
                                                        </div>
                                                        <span className={`match-type ${p.match_type}`} style={{ marginLeft: 'auto' }}>{p.match_type.replace('_', ' ')}</span>
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{p.reason}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                                                        <span>Match: {p.match_score}%</span><span>Similarity: {p.similarity}%</span>
                                                    </div>
                                                    {p.strengths?.length > 0 && (
                                                        <div style={{ marginBottom: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                            {p.strengths.slice(0, 3).map((s, j) => (
                                                                <span key={j} style={{ fontSize: 10, background: 'rgba(251,191,36,0.1)', color: 'var(--accent-yellow)', padding: '2px 6px', borderRadius: 6 }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {alreadyPartner ? (
                                                        <button className="peer-accept-btn" disabled style={{ opacity: 0.6 }}><UserCheck size={14} /> Connected</button>
                                                    ) : sessionStorage.getItem('role') === 'admin' ? (
                                                        <button className="quick-action-btn" disabled style={{ opacity: 0.6, width: '100%', justifyContet: 'center' }}><UserPlus size={14} /> Admin View (Read Only)</button>
                                                    ) : alreadySent ? (
                                                        <button className="quick-action-btn" disabled style={{ opacity: 0.6, width: '100%', justifyContent: 'center' }}><Clock size={14} /> Request Sent</button>
                                                    ) : alreadyReceived ? (
                                                        <button className="peer-accept-btn" onClick={() => {
                                                            const req = peerRequests.pending_received.find(r => r.from_id === p.student_id);
                                                            if (req) handleRespondRequest(req.id, 'accept');
                                                        }}><CheckCircle size={14} /> Accept Their Request</button>
                                                    ) : (
                                                        <button className="peer-send-btn" onClick={() => handleSendRequest(p.student_id)} disabled={sendingTo === p.student_id}>
                                                            {sendingTo === p.student_id ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <><UserPlus size={14} /> Send Request</>}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            ) : (
                                <div className="loading-container" style={{ height: '30vh' }}><div className="spinner" /></div>
                            )}
                        </div>
                    )}

                    {/* ========== COURSES & ASSESSMENTS TAB ========== */}
                    {activeTab === 'courses' && (
                        <div className="fade-in">
                            {!selectedCourse ? (
                                <>
                                    <h2 className="section-title"><BookMarked size={20} /> Courses & Weekly Assessments</h2>
                                    <div className="cards-grid">
                                        {Object.keys(subject_scores).map((subj, i) => (
                                            <div key={i} className="glass-card" style={{ cursor: 'pointer' }} onClick={() => handleCourseClick(subj)}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `hsl(${i * 45}, 60%, 25%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <GraduationCap size={20} style={{ color: `hsl(${i * 45}, 70%, 65%)` }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 14, fontWeight: 600 }}>{subj}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>12 Weeks · Score: {subject_scores[subj]}%</div>
                                                    </div>
                                                </div>
                                                <div className="progress-bar">
                                                    <div className="progress-fill" style={{ width: `${subject_scores[subj]}%`, background: subject_scores[subj] >= 70 ? '#22c55e' : subject_scores[subj] >= 50 ? '#f59e0b' : '#ef4444' }} />
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--accent-yellow)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    View weekly assessments <ChevronRight size={12} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <button className="quick-action-btn" style={{ marginBottom: 16 }} onClick={() => { setSelectedCourse(null); setCourseData(null); }}>
                                        ← Back to Courses
                                    </button>
                                    {courseLoading ? (
                                        <div className="loading-container" style={{ height: '30vh' }}><div className="spinner" /></div>
                                    ) : courseData ? (
                                        <div>
                                            <h2 className="section-title"><GraduationCap size={20} /> {courseData.name}</h2>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>{courseData.description}</p>

                                            {/* Progress Summary */}
                                            <div className="stats-grid" style={{ marginBottom: 20 }}>
                                                <div className="stat-card">
                                                    <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}><CheckCircle size={22} /></div>
                                                    <div className="stat-info"><h3>{courseData.progress.completed}/{courseData.progress.total}</h3><p>Completed</p></div>
                                                </div>
                                                <div className="stat-card">
                                                    <div className="stat-icon" style={{ background: 'rgba(251,191,36,0.15)', color: 'var(--accent-yellow)' }}><Award size={22} /></div>
                                                    <div className="stat-info"><h3>{courseData.progress.avg_score}%</h3><p>Avg Score</p></div>
                                                </div>
                                                <div className="stat-card">
                                                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' }}><Target size={22} /></div>
                                                    <div className="stat-info"><h3>{courseData.progress.percentage}%</h3><p>Progress</p></div>
                                                </div>
                                            </div>

                                            {/* Weekly Schedule */}
                                            <div className="glass-card no-hover">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Week</th>
                                                            <th>Topic</th>
                                                            <th>Assessment</th>
                                                            <th>Status</th>
                                                            <th>Score</th>
                                                            <th>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {courseData.weeks.map((w, i) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 600, color: 'var(--accent-yellow)' }}>W{w.week}</td>
                                                                <td>{w.topic}</td>
                                                                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{w.assessment}</td>
                                                                <td>
                                                                    {w.completed ? (
                                                                        <span className="risk-badge low"><CheckCircle size={10} /> Done</span>
                                                                    ) : (
                                                                        <span className="risk-badge high"><Clock size={10} /> Pending</span>
                                                                    )}
                                                                </td>
                                                                <td style={{ fontWeight: 600, color: w.completed ? (w.score >= 70 ? '#22c55e' : w.score >= 50 ? '#f59e0b' : '#ef4444') : 'var(--text-muted)' }}>
                                                                    {w.completed ? `${w.score}%` : '—'}
                                                                </td>
                                                                <td style={{ fontWeight: 600 }}>{w.grade}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* YouTube for this course */}
                                            {courseData.playlists?.length > 0 && (
                                                <>
                                                    <h3 style={{ fontSize: 15, fontWeight: 600, margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}><Play size={16} /> Related Resources</h3>
                                                    <div className="cards-grid">
                                                        {courseData.playlists.map((yt, i) => (
                                                            <a key={i} href={yt.url} target="_blank" rel="noreferrer" className="youtube-card">
                                                                <div className="yt-icon"><Play size={18} /></div>
                                                                <div className="yt-info"><h4>{yt.title}</h4><p>{yt.channel}</p></div>
                                                            </a>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : <p style={{ color: 'var(--text-muted)' }}>Failed to load course.</p>}
                                </>
                            )}
                        </div>
                    )}

                    {/* AI Assistant */}
                    <AIAssistant studentId={sid} />
                </main>

                {/* ========== RIGHT SIDEBAR ========== */}
                <aside className="right-sidebar">
                    {/* Profile */}
                    <div style={{ marginBottom: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Profile</h3>
                            {sessionStorage.getItem('role') !== 'admin' && (
                                <button onClick={openInfoModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={16} /></button>
                            )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#3b82f6', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 24, fontWeight: 700 }}>
                                {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{student.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>ID: {student.id}</div>
                        </div>
                    </div>

                    {/* 7x4 Calendar Matrix */}
                    <div style={{ background: '#f8fafc', borderRadius: 20, padding: 16, marginBottom: 32, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><ChevronLeft size={16} /></button>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><ChevronRight size={16} /></button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center', marginBottom: 8 }}>
                            {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(d => <div key={d} style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8' }}>{d}</div>)}
                        </div>
                        {attendance?.calendar && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                                {attendance.calendar.slice(-28).map((day, i) => (
                                    <div key={i} style={{
                                        aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                                        borderRadius: '50%',
                                        background: (i === 27) ? '#111827' : 'transparent',
                                        color: (i === 27) ? 'white' : '#475569',
                                        position: 'relative'
                                    }}>
                                        {day.day}
                                        {i !== 27 && day.present && <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />}
                                        {i !== 27 && !day.present && <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Schedule / Reminders */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Schedule</h3>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 12, fontWeight: 500 }}>See all</button>
                        </div>

                        <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Today</div>
                        <div style={{ display: 'flex', gap: 12, background: 'linear-gradient(to right, #fef3c7, #fef9c3)', borderRadius: 12, padding: 14, marginBottom: 20 }}>
                            <div style={{ borderRight: '2px solid #111827', paddingRight: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', color: '#111827' }}>12:00</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{student.department} Seminar</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Semester {student.semester}</div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>Tomorrow</div>
                        <div style={{ display: 'flex', gap: 12, background: 'linear-gradient(to right, #e0e7ff, #f3f4f6)', borderRadius: 12, padding: 14, marginBottom: 24 }}>
                            <div style={{ borderRight: '2px solid #3b82f6', paddingRight: 12, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', color: '#111827' }}>14:30</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Core Subject</div>
                                <div style={{ fontSize: 11, color: '#9ca3af' }}>Semester {student.semester}</div>
                            </div>
                        </div>

                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Reminders</h3>
                        <div style={{ display: 'flex', gap: 12, background: '#f8fafc', borderRadius: 12, padding: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0ea5e9', flexShrink: 0 }}>
                                <Bell size={18} />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Personal Info Modal */}
            {isInfoModalOpen && (
                <div className="modal-overlay" onClick={() => setIsInfoModalOpen(false)}>
                    <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, margin: 0 }}>Edit Personal Info</h2>
                            <button onClick={() => setIsInfoModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                        </div>
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
