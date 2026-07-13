/**
 * POST /api/rewards/feedback
 * Submit site-wide feedback. Awards 20 pts once per user (idempotency enforced by DB).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceSupabase } from '../../../../lib/supabase';

function getSupabaseUser(req: NextRequest) {
  const token =
    req.cookies.get('sb-access-token')?.value ??
    req.headers.get('authorization')?.replace('Bearer ', '');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
  );
}

export async function POST(req: NextRequest) {
  const sbUser = getSupabaseUser(req);
  const { data: { user } } = await sbUser.auth.getUser();

  const { category, body, rating, email } = await req.json();
  if (!body || body.trim().length < 10) {
    return NextResponse.json(
      { error: 'Please write at least 10 characters of feedback' },
      { status: 400 },
    );
  }

  const svc = getServiceSupabase();

  const { data: feedback, error } = await svc
    .from('user_feedback')
    .insert({
      user_id:  user?.id ?? null,
      email:    email ?? user?.email ?? null,
      category: category ?? 'general',
      body:     body.trim(),
      rating:   rating ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Award 20 pts — idempotency_key prevents double-award across multiple submissions
  let points_earned = 0;
  if (user) {
    const { error: rpcErr } = await svc.rpc('award_points', {
      p_user_id:  user.id,
      p_action:   'feedback',
      p_points:   20,
      p_ref_id:   feedback.id,
      p_idem_key: `feedback:${user.id}`, // one reward per user lifetime, not per submission
    });

    if (!rpcErr) {
      points_earned = 20;
      await svc.from('user_feedback').update({ rewarded: true }).eq('id', feedback.id);
    }
  }

  return NextResponse.json({ ok: true, points_earned });
}
