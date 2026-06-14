import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '../../../../lib/admin-auth';
import { getServiceSupabase } from '../../../../lib/supabase';

// Keyword maps for normalising Google Vision labels → our categories/colours
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sarees:   ['saree', 'sari', 'drape', 'silk', 'banarasi', 'chiffon', 'georgette'],
  lehengas: ['lehenga', 'lehnga', 'skirt', 'bridal', 'ghagra', 'chaniya'],
  kurtas:   ['kurta', 'kurti', 'tunic', 'top', 'shirt', 'kameez', 'cotton', 'block print'],
  kids:     ['kids', 'child', 'children', 'girl', 'boy', 'baby', 'toddler'],
};

const COLOUR_MAP: Record<string, [number, number, number]> = {
  'Red':          [220, 38,  38],
  'Crimson':      [185, 28,  28],
  'Pink':         [236, 72,  153],
  'Rose':         [251, 113, 133],
  'Orange':       [234, 88,  12],
  'Yellow':       [234, 179, 8],
  'Mustard':      [202, 138, 4],
  'Ivory':        [240, 230, 210],
  'White':        [255, 255, 255],
  'Emerald Green':[4,   120, 87],
  'Green':        [22,  163, 74],
  'Teal':         [13,  148, 136],
  'Royal Blue':   [29,  78,  216],
  'Blue':         [37,  99,  235],
  'Navy':         [30,  27,  75],
  'Indigo':       [67,  56,  202],
  'Purple':       [126, 34,  206],
  'Violet':       [109, 40,  217],
  'Maroon':       [127, 29,  29],
  'Burgundy':     [109, 20,  20],
  'Gold':         [202, 138, 4],
  'Silver':       [148, 163, 184],
  'Black':        [15,  23,  42],
  'Charcoal':     [51,  65,  85],
  'Grey':         [107, 114, 128],
  'Brown':        [120, 53,  15],
  'Beige':        [214, 197, 171],
  'Peach':        [253, 186, 116],
  'Coral':        [249, 115, 22],
};

const SIZE_PATTERN = /\b(XXS|XS|S|M|L|XL|XXL|2XL|3XL|Free\s*Size|\d{2,3}(?:\.\d)?(?:\s*cm|\s*in)?)\b/i;

function rgbDistance(a: [number,number,number], b: [number,number,number]) {
  return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}

function nearestColourName(r: number, g: number, b: number): string {
  let best = 'Unknown', bestDist = Infinity;
  for (const [name, rgb] of Object.entries(COLOUR_MAP)) {
    const d = rgbDistance([r, g, b], rgb);
    if (d < bestDist) { bestDist = d; best = name; }
  }
  return best;
}

function detectCategory(labels: string[]): string | null {
  const joined = labels.join(' ').toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => joined.includes(k))) return cat;
  }
  return null;
}

function extractSize(text: string): string | null {
  const match = text.match(SIZE_PATTERN);
  if (!match) return null;
  return match[0].replace(/\s+/g, ' ').trim();
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'image required' }, { status: 400 });

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'GOOGLE_VISION_API_KEY not set' }, { status: 500 });

  // Convert file to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const mimeType = file.type || 'image/jpeg';

  // Call Google Vision API
  const visionRes = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64 },
          features: [
            { type: 'LABEL_DETECTION',    maxResults: 15 },
            { type: 'IMAGE_PROPERTIES',   maxResults: 5  },
            { type: 'TEXT_DETECTION',     maxResults: 1  },
          ],
        }],
      }),
    }
  );

  if (!visionRes.ok) {
    const err = await visionRes.text();
    return NextResponse.json({ error: `Vision API error: ${err}` }, { status: 502 });
  }

  const visionData = await visionRes.json();
  const result = visionData.responses?.[0];

  // --- Extract labels ---
  const labelAnnotations: { description: string; score: number }[] =
    result?.labelAnnotations ?? [];
  const labels = labelAnnotations.map(l => l.description);

  // --- Extract dominant colours ---
  const dominantColors: { color: { red: number; green: number; blue: number }; score: number; pixelFraction: number }[] =
    result?.imagePropertiesAnnotation?.dominantColors?.colors ?? [];

  // Top 3 colours by score, converted to nearest name
  const detectedColours = dominantColors
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(c => ({
      name: nearestColourName(
        Math.round(c.color.red   ?? 0),
        Math.round(c.color.green ?? 0),
        Math.round(c.color.blue  ?? 0),
      ),
      score: c.score,
      pixelFraction: c.pixelFraction,
    }))
    // Deduplicate names (keep highest score)
    .filter((c, i, arr) => arr.findIndex(x => x.name === c.name) === i);

  const primaryColour = detectedColours[0]?.name ?? null;

  // --- Extract text for size detection ---
  const fullText: string = result?.textAnnotations?.[0]?.description ?? '';
  const detectedSize = extractSize(fullText);

  // --- Detect category ---
  const detectedCategory = detectCategory(labels);

  // --- Fuzzy match against existing products ---
  const sb = getServiceSupabase();
  const { data: products } = await sb
    .from('products')
    .select('id, name, slug, category, image')
    .order('name');

  // Score products: category match + label keyword match in product name
  const labelLower = labels.map(l => l.toLowerCase());
  const scoredProducts = (products ?? []).map(p => {
    let score = 0;
    if (detectedCategory && p.category === detectedCategory) score += 10;
    const nameLower = p.name.toLowerCase();
    for (const label of labelLower) {
      if (nameLower.includes(label) || label.includes(nameLower.split(' ')[0])) score += 2;
    }
    // colour name match in product name
    if (primaryColour && nameLower.includes(primaryColour.toLowerCase())) score += 3;
    return { ...p, _score: score };
  }).sort((a, b) => b._score - a._score);

  const suggestedProducts = scoredProducts.slice(0, 5);

  return NextResponse.json({
    labels,
    detectedCategory,
    detectedColours,
    primaryColour,
    detectedSize,
    fullText,
    suggestedProducts,
  });
}
