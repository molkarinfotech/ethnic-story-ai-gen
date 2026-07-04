import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isAdminAuthed } from '../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? '' });

/**
 * POST /api/admin/generate-description
 * Generates a rich product description using GPT-4o-mini.
 * Consistent GPT usage — no Claude/model mixing.
 *
 * Body: { labels: string[], colour: string, productType: string, productName?: string }
 * Returns: { description: string }
 */
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 });
  }

  const body = await req.json();
  const labels:      string[] = body.labels      ?? [];
  const colour:      string   = body.colour      ?? '';
  const productType: string   = body.productType ?? '';
  const productName: string   = body.productName ?? '';

  const garmentDesc = [
    colour      && `colour: ${colour}`,
    productType && `type: ${productType}`,
    productName && `name: ${productName}`,
    labels.length && `detected features: ${labels.slice(0, 8).join(', ')}`,
  ].filter(Boolean).join('; ');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 220,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content:
            'You write product descriptions for an Australian Indian ethnic clothing store called Ethnic Story. '
            + 'Descriptions are 2-3 sentences, warm and culturally appreciative, highlighting fabric, craft and occasion. '
            + 'No emojis. No bullet points. Plain paragraph only. 60-120 words.',
        },
        {
          role: 'user',
          content: `Write a product description for this garment — ${garmentDesc}.`,
        },
      ],
    });

    const description = completion.choices[0]?.message?.content?.trim() ?? '';
    return NextResponse.json({ description });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OpenAI request failed';
    console.error('[generate-description] GPT error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
