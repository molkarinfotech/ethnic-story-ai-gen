'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';

const CARD: React.CSSProperties = {
  background: 'white',
  borderRadius: '1rem',
  border: '1px solid #fce7f3',
  padding: '2rem',
  boxShadow: '0 1px 6px rgba(0,0,0,.05)',
};

export default function AppointmentsPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    type: 'in-person',
    notes: '',
  });

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('sending');
    try {
      const body = [
        `Name: ${form.name}`,
        `Email: ${form.email}`,
        `Phone: ${form.phone || 'Not provided'}`,
        `Preferred date: ${form.date}`,
        `Preferred time: ${form.time}`,
        `Appointment type: ${form.type === 'in-person' ? 'In-person (Sydney)' : 'Virtual (video call)'}`,
        `Notes: ${form.notes || 'None'}`,
      ].join('\n');

      const mailtoLink = `mailto:hello@ethnicstory.com.au?subject=${encodeURIComponent('Appointment Request — ' + form.name)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoLink;
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '.7rem 1rem',
    border: '1.5px solid #fce7f3',
    borderRadius: '.6rem',
    fontSize: '.9rem',
    color: '#111827',
    outline: 'none',
    background: '#fffbfd',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '.78rem',
    fontWeight: 700,
    color: '#9d174d',
    letterSpacing: '.05em',
    textTransform: 'uppercase',
    marginBottom: '.35rem',
  };

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-surface-offset, #fdf8f5)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1a0a10, #3d1020)',
        color: '#fff',
        textAlign: 'center',
        padding: 'clamp(3rem, 8vw, 5rem) 1.5rem',
      }}>
        <span style={{ fontSize: '.75rem', fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#e2a96c' }}>PERSONAL SERVICE</span>
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', fontWeight: 800, margin: '.6rem 0 .75rem', color: '#fff' }}>Book an Appointment</h1>
        <p style={{ color: 'rgba(255,255,255,.7)', maxWidth: '520px', margin: '0 auto', fontSize: '.95rem' }}>
          Visit us in Sydney for a personalised styling session, or choose a virtual appointment from wherever you are.
        </p>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2.5rem 1rem 5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={CARD}>
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827', marginBottom: '.25rem' }}>In-person</div>
            <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0 }}>Sydney, NSW — visit our showroom Mon–Sat, 10am–6pm AEST.</p>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>💻</div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827', marginBottom: '.25rem' }}>Virtual</div>
            <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0 }}>Video call styling session — available for customers across Australia.</p>
          </div>
          <div style={CARD}>
            <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⏱️</div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#111827', marginBottom: '.25rem' }}>Duration</div>
            <p style={{ fontSize: '.82rem', color: '#6b7280', margin: 0 }}>Sessions run 45–60 minutes. No obligation to purchase.</p>
          </div>
        </div>

        {/* Form */}
        {status === 'sent' ? (
          <div style={{ ...CARD, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ color: '#9d174d', marginBottom: '.75rem' }}>Request sent!</h2>
            <p style={{ color: '#6b7280', fontSize: '.9rem', maxWidth: '380px', margin: '0 auto 1.5rem' }}>
              Your email app should have opened with the appointment request pre-filled. We&apos;ll confirm your booking within 24 hours.
            </p>
            <a href="/" style={{ display: 'inline-block', background: '#9d174d', color: '#fff', padding: '.65rem 1.5rem', borderRadius: '.6rem', fontWeight: 700, fontSize: '.875rem', textDecoration: 'none' }}>Back to home</a>
          </div>
        ) : (
          <div style={CARD}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: '1.5rem' }}>📅 Request an Appointment</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Your name *</label>
                  <input required style={inputStyle} value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Priya Sharma" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input required type="email" style={inputStyle} value={form.email} onChange={e => update('email', e.target.value)} placeholder="you@example.com" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Phone (optional)</label>
                  <input type="tel" style={inputStyle} value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="04xx xxx xxx" />
                </div>
                <div>
                  <label style={labelStyle}>Appointment type *</label>
                  <select required style={{ ...inputStyle, cursor: 'pointer' }} value={form.type} onChange={e => update('type', e.target.value)}>
                    <option value="in-person">In-person (Sydney)</option>
                    <option value="virtual">Virtual (video call)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Preferred date *</label>
                  <input required type="date" style={inputStyle} value={form.date} onChange={e => update('date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={labelStyle}>Preferred time *</label>
                  <select required style={{ ...inputStyle, cursor: 'pointer' }} value={form.time} onChange={e => update('time', e.target.value)}>
                    <option value="">Select a time</option>
                    {['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>What are you shopping for? (optional)</label>
                <textarea rows={3} style={{ ...inputStyle, resize: 'vertical' }} value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  placeholder="e.g. Bridal lehenga for a November wedding, size 12, budget ~$800" />
              </div>

              {status === 'error' && (
                <p style={{ color: '#dc2626', fontSize: '.82rem', margin: 0 }}>Something went wrong. Please email us directly at hello@ethnicstory.com.au</p>
              )}

              <button type="submit" disabled={status === 'sending'} style={{
                background: '#9d174d',
                color: '#fff',
                padding: '.75rem 1.5rem',
                borderRadius: '.6rem',
                fontWeight: 700,
                fontSize: '.9rem',
                border: 'none',
                cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                opacity: status === 'sending' ? 0.7 : 1,
                transition: 'opacity 0.2s',
              }}>
                {status === 'sending' ? 'Opening email…' : '📧 Send Appointment Request'}
              </button>

              <p style={{ fontSize: '.75rem', color: '#9ca3af', margin: 0, textAlign: 'center' }}>
                This will open your email app with all details pre-filled and send to hello@ethnicstory.com.au
              </p>
            </form>
          </div>
        )}

        {/* Direct contact fallback */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: '.5rem' }}>Prefer to reach out directly?</p>
          <a href="mailto:hello@ethnicstory.com.au?subject=Appointment%20Request" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#9d174d', color: '#fff', padding: '.65rem 1.5rem', borderRadius: '.6rem', fontWeight: 700, fontSize: '.875rem', textDecoration: 'none' }}>✉️ Email us directly</a>
        </div>
      </div>
    </main>
  );
}
