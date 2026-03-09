import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, AlertCircle, Shield, GraduationCap, Users } from 'lucide-react';
import { login } from '../api';

export default function Login() {
    const navigate = useNavigate();
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [role, setRole] = useState('student'); // 'student', 'teacher', 'admin'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        const loginId = userId.trim();

        if (!loginId || !password.trim()) {
            setError('Please enter your credentials.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await login(loginId, password.trim(), role);
            const data = res.data;

            if (data.success) {
                sessionStorage.setItem('user', JSON.stringify(data.user));
                sessionStorage.setItem('role', data.role);

                if (data.role === 'teacher') {
                    navigate('/teacher');
                } else if (data.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate(`/student/${data.user.id}`);
                }
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed. Please try again.';
            setError(msg);
        }
        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-logo">AI</div>
                <h1>AI-AIOS</h1>
                <p>Advanced platform for academic risk prediction, personalized learning, and complete student success analytics.</p>

                <form className="login-form fade-in" onSubmit={handleLogin}>
                    <div className="role-tabs">
                        <button
                            type="button"
                            className={`role-tab ${role === 'student' ? 'active' : ''}`}
                            onClick={() => { setRole('student'); setError(''); }}
                        >
                            <GraduationCap size={16} /> Student
                        </button>
                        <button
                            type="button"
                            className={`role-tab ${role === 'teacher' ? 'active' : ''}`}
                            onClick={() => { setRole('teacher'); setError(''); }}
                        >
                            <Users size={16} /> Teacher
                        </button>
                        <button
                            type="button"
                            className={`role-tab ${role === 'admin' ? 'active' : ''}`}
                            onClick={() => { setRole('admin'); setError(''); }}
                        >
                            <Shield size={16} /> Admin
                        </button>
                    </div>

                    {error && (
                        <div className="login-error fade-in">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <div className="login-input-group fade-in">
                        <label>{role === 'student' ? 'Student ID' : role === 'teacher' ? 'Teacher ID' : 'Admin ID'}</label>
                        <div className="login-input-wrapper">
                            <Users className="login-input-icon" size={18} />
                            <input
                                type="text"
                                value={userId}
                                onChange={e => { setUserId(e.target.value); setError(''); }}
                                placeholder={role === 'student' ? "Enter Student ID (e.g. S001)" : role === 'teacher' ? "Enter Teacher ID (e.g. T001)" : "Enter Admin ID (e.g. A001)"}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="login-input-group fade-in">
                        <label>Password</label>
                        <div className="login-input-wrapper">
                            <Shield className="login-input-icon" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                placeholder={role === 'student' ? "Enter your password" : `Enter ${role} password`}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                        {loading ? <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <><LogIn size={18} /> Secure Sign In</>}
                    </button>

                    <div className="login-hint fade-in" style={{ animationDelay: '0.2s' }}>
                        {role === 'student' && <p>Default Student pass for hackathon: <code>123</code></p>}
                        {role === 'teacher' && <p>Default Teacher pass: <code>123</code></p>}
                        {role === 'admin' && <p>Default Admin pass: <code>123</code></p>}
                    </div>
                </form>
            </div>
        </div>
    );
}
