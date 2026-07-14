'use client';
import { useState, useRef, useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type FaqMsg     = { from: 'bot';  type: 'faq';      text: string };
type ProductMsg = { from: 'bot';  type: 'products'; products: Product[] };
type UserMsg    = { from: 'user'; type: 'user';     text: string };
type Msg        = FaqMsg | ProductMsg | UserMsg;

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string | null;
  tags: string[] | null;
  category: string | null;
}

// ─── FAQ quick chips (for the bottom chip bar) ────────────────────────────────
const QUICK_FAQS = [
  'What sizes do you carry?',
  'How long does delivery take?',
  'Do you ship internationally?',
  'What is your return policy?',
  'Can I pay with Afterpay?',
];

// ─── Sourcing Panel ───────────────────────────────────────────────────────────
function SourcingPanel({ onClose }: { onClose: () => void }) {
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [desc,  setDesc]  = useState('');
  const [file,  setFile]  = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !desc) { setError('Email and description are required.'); return; }
    setSending(true); setError('');
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('email', email);
      fd.append('description', desc);
      if (file) fd.append('image', file);
      const res = await fetch('/api/sourcing', { method: 'POST', body: fd });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      setSent(true);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', bottom: '5.5rem', right: '1.25rem',
      width: 'min(360px, calc(100vw - 2.5rem))',
      background: 'white', borderRadius: '1.1rem',
      boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      border: '1.5px solid #fce7f3',
      zIndex: 10001, overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      maxHeight: '85dvh',
    }}>
      <div style={{ background: 'linear-gradient(135deg,#9d174d,#c2185b)', padding: '1rem 1.1rem .8rem', display: 'flex', alignItems: 'center', gap: '.6rem' }}>
        <span style={{ fontSize: '1.4rem' }}>🔍</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'white', fontWeight: 700, fontSize: '.95rem', lineHeight: 1.2 }}>Can&apos;t find what you need?</div>
          <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '.72rem', marginTop: '.15rem' }}>Send us a photo — we&apos;ll source it for you</div>
        </div>
        <button onClick={onClose} style={{ color: 'rgba(255,255,255,.8)', fontSize: '1.2rem', lineHeight: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '.2rem' }}>✕</button>
      </div>

      <div style={{ overflowY: 'auto', padding: '1rem 1.1rem', flex: 1 }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>🎉</div>
            <div style={{ fontWeight: 700, color: '#9d174d', fontSize: '1rem', marginBottom: '.4rem' }}>Request Received!</div>
            <div style={{ fontSize: '.82rem', color: '#6b7280', lineHeight: 1.55 }}>We&apos;ll review your request and get back to you at <strong>{email}</strong> within 2 business days.</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
            <p style={{ fontSize: '.78rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
              Can&apos;t find the exact style, colour, or size you&apos;re looking for? Describe it and optionally upload a reference photo — we&apos;ll source it directly from India for you.
            </p>
            <div>
              <label style={labelStyle}>Your name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} required />
            </div>
            <div>
              <label style={labelStyle}>Describe what you&apos;re looking for <span style={{ color: '#dc2626' }}>*</span></label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. A royal blue chanderi silk saree with gold zari border, size L" rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }} required />
            </div>
            <div>
              <label style={labelStyle}>Reference photo (optional)</label>
              <div onClick={() => fileRef.current?.click()} style={{ border: '1.5px dashed #fba4c0', borderRadius: '.6rem', padding: preview ? '.4rem' : '1rem', cursor: 'pointer', textAlign: 'center', background: '#fff5f7' }}>
                {preview ? (
                  <img src={preview} alt="preview" style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '.4rem', margin: '0 auto', display: 'block', objectFit: 'cover' }} />
                ) : (
                  <><div style={{ fontSize: '1.5rem', marginBottom: '.3rem' }}>📷</div><div style={{ fontSize: '.72rem', color: '#9d174d', fontWeight: 600 }}>Click to upload a photo</div><div style={{ fontSize: '.65rem', color: '#9ca3af', marginTop: '.2rem' }}>PNG, JPG up to 5MB</div></>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
              {preview && (
                <button type="button" onClick={() => { setFile(null); setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
                  style={{ fontSize: '.68rem', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', marginTop: '.3rem', display: 'block' }}>Remove photo</button>
              )}
            </div>
            {error && <p style={{ color: '#dc2626', fontSize: '.73rem', margin: 0 }}>{error}</p>}
            <button type="submit" disabled={sending} style={{ background: 'linear-gradient(135deg,#9d174d,#c2185b)', color: 'white', border: 'none', borderRadius: '.6rem', padding: '.65rem 1rem', fontWeight: 700, fontSize: '.85rem', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? .7 : 1 }}>
              {sending ? 'Sending…' : '✉️ Send Request'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Product card (shown inline in chat) ──────────────────────────────────────
function ProductCard({ p }: { p: Product }) {
  return (
    <a
      href={`/products/${p.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', gap: '.55rem', alignItems: 'center',
        background: 'white', border: '1px solid #fce7f3',
        borderRadius: '.65rem', padding: '.5rem .65rem',
        textDecoration: 'none', color: 'inherit',
        boxShadow: '0 1px 4px rgba(0,0,0,.06)',
        transition: 'box-shadow .15s',
      }}
    >
      {p.image ? (
        <img
          src={p.image} alt={p.name}
          width={48} height={48}
          loading="lazy"
          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '.4rem', flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: '48px', height: '48px', background: '#fdf2f8', borderRadius: '.4rem', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>🪷</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.78rem', fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
        {p.category && <div style={{ fontSize: '.68rem', color: '#9d174d', fontWeight: 600, marginTop: '1px' }}>{p.category}</div>}
        <div style={{ fontSize: '.75rem', color: '#374151', marginTop: '2px' }}>${p.price.toFixed(2)}</div>
      </div>
      <span style={{ fontSize: '.65rem', color: '#9d174d', fontWeight: 700, flexShrink: 0 }}>View →</span>
    </a>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '.45rem .65rem', fontSize: '.82rem',
  border: '1.5px solid #fce7f3', borderRadius: '.5rem',
  outline: 'none', fontFamily: 'inherit', color: '#1f2937',
  background: 'white', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '.73rem', fontWeight: 600,
  color: '#374151', marginBottom: '.3rem',
};

// ─── Main ChatWidget ──────────────────────────────────────────────────────────
export function ChatWidget() {
  const [chatOpen,     setChatOpen]     = useState(false);
  const [sourcingOpen, setSourcingOpen] = useState(false);
  const [msgs,         setMsgs]         = useState<Msg[]>([
    { from: 'bot', type: 'faq', text: 'Hi! 👋 I\'m the Ethnic Story assistant. Ask me anything about our products, sizing, delivery, or returns!' },
  ]);
  const [input,  setInput]  = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  async function sendUserMsg(text: string) {
    if (!text.trim()) return;
    setMsgs(m => [...m, { from: 'user', type: 'user', text }]);
    setInput('');
    setTyping(true);

    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (data.type === 'products' && data.products?.length > 0) {
        setMsgs(m => [...m, { from: 'bot', type: 'products', products: data.products }]);
      } else {
        setMsgs(m => [...m, { from: 'bot', type: 'faq', text: data.answer ?? 'Something went wrong — please try again.' }]);
      }
    } catch {
      setMsgs(m => [...m, { from: 'bot', type: 'faq', text: 'Sorry, I couldn\'t connect right now. Please try again in a moment.' }]);
    } finally {
      setTyping(false);
    }
  }

  function toggleChat() {
    setChatOpen(o => !o);
    if (sourcingOpen) setSourcingOpen(false);
  }
  function toggleSourcing() {
    setSourcingOpen(o => !o);
    if (chatOpen) setChatOpen(false);
  }

  return (
    <>
      {sourcingOpen && <SourcingPanel onClose={() => setSourcingOpen(false)} />}

      {chatOpen && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '1.25rem',
          width: 'min(360px, calc(100vw - 2.5rem))',
          height: 'min(540px, 80dvh)',
          background: 'white', borderRadius: '1.1rem',
          boxShadow: '0 8px 40px rgba(0,0,0,.18)',
          border: '1.5px solid #fce7f3',
          zIndex: 10001, overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#9d174d,#be185d)', padding: '1rem 1.1rem .85rem', display: 'flex', alignItems: 'center', gap: '.65rem', flexShrink: 0 }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>🪷</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '.92rem', lineHeight: 1.2 }}>Ethnic Story Assistant</div>
              <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '.68rem', marginTop: '.1rem' }}>● Online · Ask about products, delivery & more</div>
            </div>
            <button onClick={toggleChat} style={{ color: 'rgba(255,255,255,.8)', fontSize: '1.1rem', background: 'none', border: 'none', cursor: 'pointer', padding: '.2rem' }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
            {msgs.map((m, i) => {
              if (m.from === 'user') {
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ maxWidth: '82%', padding: '.5rem .75rem', borderRadius: '1rem 1rem .2rem 1rem', background: 'linear-gradient(135deg,#9d174d,#be185d)', color: 'white', fontSize: '.8rem', lineHeight: 1.55, boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
                      {m.text}
                    </div>
                  </div>
                );
              }
              if (m.type === 'products') {
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                    <div style={{ fontSize: '.75rem', color: '#9d174d', fontWeight: 700, paddingLeft: '.2rem' }}>Here&apos;s what I found for you 🛍️</div>
                    {m.products.map(p => <ProductCard key={p.id} p={p} />)}
                    <div style={{ fontSize: '.7rem', color: '#9ca3af', paddingLeft: '.2rem' }}>Tap any item to view it in the shop</div>
                  </div>
                );
              }
              // faq / text message
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '82%', padding: '.5rem .75rem', borderRadius: '1rem 1rem 1rem .2rem', background: '#f9f0f5', color: '#1f2937', fontSize: '.8rem', lineHeight: 1.55, boxShadow: '0 1px 4px rgba(0,0,0,.07)' }}>
                    {m.text}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f9f0f5', borderRadius: '1rem 1rem 1rem .2rem', padding: '.5rem .85rem', display: 'flex', gap: '.3rem', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#be185d', display: 'inline-block', animation: `bounce 1s ease-in-out ${i * .15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick FAQ chips */}
          <div style={{ padding: '.5rem .85rem', borderTop: '1px solid #fce7f3', display: 'flex', gap: '.4rem', flexWrap: 'nowrap', overflowX: 'auto', flexShrink: 0, scrollbarWidth: 'none' }}>
            {QUICK_FAQS.map((q, i) => (
              <button key={i} onClick={() => sendUserMsg(q)}
                style={{ flexShrink: 0, background: '#fff0f6', border: '1px solid #fba4c0', borderRadius: '.45rem', padding: '.3rem .6rem', fontSize: '.68rem', color: '#9d174d', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {q.split(' ').slice(0,4).join(' ')}{q.split(' ').length > 4 ? '…' : ''}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); sendUserMsg(input); }}
            style={{ display: 'flex', gap: '.5rem', padding: '.65rem .85rem', borderTop: '1px solid #fce7f3', flexShrink: 0, background: 'white' }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about products or anything else…"
              style={{ flex: 1, border: '1.5px solid #fce7f3', borderRadius: '.55rem', padding: '.45rem .7rem', fontSize: '.82rem', outline: 'none', fontFamily: 'inherit', color: '#1f2937' }}
            />
            <button type="submit" disabled={!input.trim() || typing} style={{ background: 'linear-gradient(135deg,#9d174d,#be185d)', color: 'white', border: 'none', borderRadius: '.55rem', padding: '.45rem .8rem', fontWeight: 700, fontSize: '.85rem', cursor: (input.trim() && !typing) ? 'pointer' : 'not-allowed', opacity: (input.trim() && !typing) ? 1 : .5 }}>→</button>
          </form>
        </div>
      )}

      {/* Floating action buttons */}
      <div style={{ position: 'fixed', bottom: '1.25rem', right: '1.25rem', zIndex: 10002, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.6rem' }}>
        <button onClick={toggleSourcing} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: sourcingOpen ? '#7b1041' : 'white', color: sourcingOpen ? 'white' : '#9d174d', border: '1.5px solid #fce7f3', borderRadius: '.75rem', padding: '.55rem .9rem', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.12)', transition: 'all .15s' }}>
          🔍 Can&apos;t Find It?
        </button>
        <button
          onClick={toggleChat}
          aria-label="Open chat"
          style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: chatOpen ? '#7b1041' : 'linear-gradient(135deg,#9d174d,#be185d)',
            color: 'white', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem',
            boxShadow: '0 4px 16px rgba(157,23,77,.4)',
            transition: 'all .15s',
          }}
        >
          {chatOpen ? '✕' : '🪷'}
        </button>
      </div>
    </>
  );
}
