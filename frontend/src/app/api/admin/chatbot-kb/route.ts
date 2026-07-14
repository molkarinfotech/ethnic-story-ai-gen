import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET — list all KB entries
export async function GET() {
  const { data, error } = await supabase
    .from('chatbot_kb')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST — create a new entry
export async function POST(req: NextRequest) {
  const { topic, content, tags } = await req.json();
  if (!topic?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'topic and content are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('chatbot_kb')
    .insert({ topic: topic.trim(), content: content.trim(), tags: tags?.trim() ?? '' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data }, { status: 201 });
}

// PUT — update an existing entry
export async function PUT(req: NextRequest) {
  const { id, topic, content, tags } = await req.json();
  if (!id || !topic?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'id, topic and content are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('chatbot_kb')
    .update({ topic: topic.trim(), content: content.trim(), tags: tags?.trim() ?? '', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entry: data });
}

// DELETE — remove an entry by id
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase.from('chatbot_kb').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
