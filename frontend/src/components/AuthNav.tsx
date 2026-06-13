'use client';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './ui/Spinner';

export function AuthNav() {
  const { user, loading, signOut } = useAuth();

  if (loading) return <Spinner size={20} />;

  if (user) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
      <a href="/account" style={{
        display: 'flex', alignItems: 'center', gap: '.5rem',
        fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
        textDecoration: 'none', fontWeight: 500,
      }}>
        <span style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--color-primary)',
          color: 'white', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: '.75rem', fontWeight: 700, flexShrink: 0,
        }}>
          {(user.name ?? user.email).charAt(0).toUpperCase()}
        </span>
        <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user.name ?? 'Account'}
        </span>
      </a>
    </div>
  );

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
      <a href="/login" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textDecoration: 'none', fontWeight: 500 }}>Sign in</a>
      <a href="/signup" style={{
        fontSize: 'var(--text-xs)', background: 'var(--color-primary)',
        color: 'white', padding: '.35rem .8rem',
        borderRadius: 'var(--radius-full)', fontWeight: 600, textDecoration: 'none',
      }}>Sign up</a>
    </div>
  );
}
