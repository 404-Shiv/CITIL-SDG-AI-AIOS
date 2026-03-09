import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, AlertTriangle, Users, BookOpen, Brain, LogOut, UserPlus, Play, BookMarked, Zap, Shield
} from 'lucide-react';

export default function Sidebar({ role, onQuickAction }) {
    const teacherLinks = [
        { to: '/teacher', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
    ];

    const adminLinks = [
        { to: '/admin', icon: <Shield size={18} />, label: 'Admin Dashboard' },
    ];

    const studentQuickInfo = [
        { icon: <BookOpen size={16} />, label: 'Learning Path', action: 'learning' },
        { icon: <Play size={16} />, label: 'Resources', action: 'resources' },
        { icon: <Users size={16} />, label: 'Peer Matches', action: 'peers' },
        { icon: <BookMarked size={16} />, label: 'Courses', action: 'courses' },
        { icon: <Brain size={16} />, label: 'Behavior', action: 'behavior' },
    ];

    const teacherQuickInfo = [
        { icon: <AlertTriangle size={16} />, label: 'Anomaly Alerts', action: 'anomalies' },
        { icon: <UserPlus size={16} />, label: 'Peer Matching', action: 'peermatching' },
        { icon: <Brain size={16} />, label: 'Root Cause AI', action: 'rootcause' },
    ];

    const adminQuickInfo = [
        { icon: <Users size={16} />, label: 'System Access', action: 'access' },
    ];

    const quickInfo = role === 'teacher' ? teacherQuickInfo : role === 'admin' ? adminQuickInfo : studentQuickInfo;

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-logo">AI</div>
                <div><h2>AI-AIOS</h2><span>Intelligence Platform</span></div>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-group-label">NAVIGATION</div>
                {role === 'teacher' ? (
                    teacherLinks.map((link, i) => (
                        <NavLink key={i} to={link.to} className="nav-link">
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))
                ) : role === 'admin' ? (
                    adminLinks.map((link, i) => (
                        <NavLink key={i} to={link.to} className="nav-link">
                            {link.icon}
                            <span>{link.label}</span>
                        </NavLink>
                    ))
                ) : (
                    <div
                        className="nav-link active"
                        onClick={() => onQuickAction?.('overview')}
                        style={{ cursor: 'pointer' }}
                    >
                        <Zap size={18} />
                        <span>Overview</span>
                    </div>
                )}
            </nav>

            <div className="sidebar-info">
                <div className="nav-group-label">QUICK INFO</div>
                {quickInfo.map((item, i) => (
                    <div
                        key={i}
                        className="info-link clickable"
                        onClick={() => onQuickAction?.(item.action)}
                    >
                        {item.icon}<span>{item.label}</span>
                    </div>
                ))}
            </div>

            <NavLink to="/" className="nav-link" style={{ marginTop: 'auto' }}>
                <LogOut size={18} /><span>Sign Out</span>
            </NavLink>
        </aside>
    );
}
