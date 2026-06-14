'use client';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Spinner } from '../../components/ui/Spinner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    window.location.href = '/account';
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/account` },
    });
  }

  return (
    <main style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', color: 'var(--color-gold)', marginBottom: '.5rem' }}>✷</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem,1.2rem+1vw,2rem)', color: 'var(--color-text)', margin: 0 }}>Welcome back</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '.5rem', fontSize: 'var(--text-sm)' }}>Sign in to your Ethnic Story account</p>
        </div>

        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-xl)', padding: '2rem', boxShadow: 'var(--shadow-sm)' }}>
          <button onClick={handleGoogle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.75rem', padding: '.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '1.5rem' }}>
            <GoogleIcon />
            Continue with Google
          </button>

          <Divider />

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <ErrorBanner message={error} />}

            <Field label="Email">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                style={inputStyle} placeholder="you@example.com" />
            </Field>

            <Field label="Password">
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ ...inputStyle, paddingRight: '2.75rem' }}
                  placeholder="••••••••" />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: '.85rem', padding: 0 }}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </Field>

            <div style={{ textAlign: 'right', marginTop: '-.5rem' }}>
              <a href="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}>Forgot password?</a>
            </div>

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '.85rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: 'var(--text-sm)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.5rem' }}>
              {loading ? <><Spinner size={18} color="white" /> Signing in…</> : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Don't have an account?{' '}
          <a href="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign up</a>
        </p>
      </div>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '.75rem 1rem',
  border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)', background: 'var(--color-bg)',
  color: 'var(--color-text)', boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '.4rem', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>or</span>
      <div style={{ flex: 1, height: '1px', background: 'var(--color-divider)' }} />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', padding: '.75rem 1rem', color: '#dc2626', fontSize: 'var(--text-sm)' }}>{message}</div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
