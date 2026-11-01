'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { register, login } from '@/app/lib/api';
import styles from './auth.module.css';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState(null);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (r) => {
    setRole(r);
    setStep(2);
    setError('');
  };

  const handleBack = () => {
    setStep(1);
    setRole(null);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError('Email and password are required.'); return; }
    if (mode === 'register' && !name) { setError('Name is required.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (mode === 'register' && !/\d/.test(password)) { setError('Password must contain at least one digit.'); return; }
    if (mode === 'register' && !/[a-zA-Z]/.test(password)) { setError('Password must contain at least one letter.'); return; }
    setLoading(true);
    setError('');
    try {
      let data;
      if (mode === 'register') {
        data = await register({ name, email, password, role });
      } else {
        data = await login({ email, password, role });
      }
      // Store for ProfileMenu to read
      sessionStorage.setItem('mm_role', data.user.role);
      sessionStorage.setItem('mm_name', data.user.name);
      sessionStorage.setItem('mm_id', data.user.id);
      // Store token in sessionStorage (tab-isolated) so each tab has its own session
      if (data.token) sessionStorage.setItem('mm_token', data.token);
      // Set a lightweight browser cookie so Next.js middleware can guard protected
      // routes before the page bundle loads (avoids dashboard flash for visitors).
      // This cookie carries NO secret — the actual JWT stays in sessionStorage.
      document.cookie = 'mm_auth_hint=1; path=/; SameSite=Lax; max-age=604800';
      router.push(data.user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setStep(1);
    setRole(null);
    setError('');
  };

  return (
    <div className={styles.root}>
      <div className={styles.bg}>
        <div className={styles.orb1} />
        <div className={styles.orb2} />
        <div className={styles.grid} />
      </div>

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.brand} onClick={() => router.push('/')}>
          <svg width="30" height="30" viewBox="0 0 44 44" fill="none">
            <rect width="44" height="44" rx="11" fill="url(#gA)" />
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="44" y2="44">
                <stop stopColor="#6d28d9" />
                <stop offset="1" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="22" fill="white" fontFamily="Georgia,serif" fontWeight="700">∑</text>
          </svg>
          <span className={styles.brandName}>MathMax</span>
        </div>

        {/* Mode tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`} onClick={() => { setMode('login'); setStep(1); setRole(null); }}>
            Sign in
          </button>
          <button className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`} onClick={() => { setMode('register'); setStep(1); setRole(null); }}>
            Register
          </button>
        </div>

        {/* Step 1 — Role selection */}
        {step === 1 && (
          <div className={styles.step} key="step1">
            <p className={styles.stepLabel}>Continue as</p>

            <div className={styles.roleList}>
              <button className={styles.roleBtn} onClick={() => handleRoleSelect('teacher')}>
                <div className={styles.roleBtnLeft}>
                  <div className={styles.roleIconWrap}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" />
                    </svg>
                  </div>
                  <div>
                    <div className={styles.roleTitle}>Teacher</div>
                    <div className={styles.roleDesc}>Upload papers, manage evaluations</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>

              <button className={styles.roleBtn} onClick={() => handleRoleSelect('student')}>
                <div className={styles.roleBtnLeft}>
                  <div className={styles.roleIconWrap}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <div>
                    <div className={styles.roleTitle}>Student</div>
                    <div className={styles.roleDesc}>Submit sheets, view corrections</div>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Credentials */}
        {step === 2 && (
          <div className={styles.step} key="step2">
            <div className={styles.stepHeader}>
              <button className={styles.backBtn} onClick={handleBack}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <span className={styles.roleBadge}>{role === 'teacher' ? 'Teacher' : 'Student'}</span>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="name">Name</label>
                  <input
                    id="name"
                    className={styles.input}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus={mode === 'login'}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="password">Password</label>
                <div className={styles.pwWrap}>
                  <input
                    id="password"
                    className={styles.input}
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPw((v) => !v)} tabIndex={-1}>
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && <p className={styles.error}>{error}</p>}

              {mode === 'login' && (
                <button type="button" className={styles.forgot}>Forgot password?</button>
              )}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <span className={styles.spinner} /> : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>

            <p className={styles.switchLine}>
              {mode === 'login' ? 'No account?' : 'Have an account?'}{' '}
              <button className={styles.switchBtn} onClick={switchMode}>
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
