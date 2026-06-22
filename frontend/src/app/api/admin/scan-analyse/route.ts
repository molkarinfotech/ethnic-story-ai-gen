import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';

async function isAdmin(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    return !!cookieStore.get('admin_session')?.value || !!cookieStore.get('admin_token')?.value;
  } catch {
    return false;
  }
}

// ── Category keywords ─────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sarees:   ['saree', 'sari', 'drape', 'silk', 'banarasi', 'chiffon', 'georgette'],
  lehengas: ['lehenga', 'lehnga', 'skirt', 'bridal', 'ghagra', 'chaniya'],
  kurtas:   ['kurta', 'kurti', 'tunic', 'top', 'shirt', 'kameez', 'cotton', 'block print'],
  kids:     ['kids', 'child', 'children', 'girl', 'boy', 'baby', 'toddler'],
};

// ── 35-type ethnic product type map ──────────────────────────────────────────
const PRODUCT_TYPE_MAP: Array<{ type: string; category: string; keywords: string[] }> = [
  // Sarees & drapes
  { type: 'Banarasi Silk Saree',   category: 'sarees',   keywords: ['banarasi', 'brocade', 'silk saree', 'kashi'] },
  { type: 'Kanjivaram Saree',      category: 'sarees',   keywords: ['kanjivaram', 'kanjeevaram', 'kanchipuram'] },
  { type: 'Chiffon Saree',         category: 'sarees',   keywords: ['chiffon saree', 'chiffon'] },
  { type: 'Georgette Saree',       category: 'sarees',   keywords: ['georgette saree', 'georgette'] },
  { type: 'Cotton Saree',          category: 'sarees',   keywords: ['cotton saree', 'handloom', 'khadi saree'] },
  { type: 'Net Saree',             category: 'sarees',   keywords: ['net saree', 'net fabric'] },
  { type: 'Bandhani Saree',        category: 'sarees',   keywords: ['bandhani', 'bandhej', 'tie dye'] },
  { type: 'Saree',                 category: 'sarees',   keywords: ['saree', 'sari', 'drape'] },
  // Lehengas
  { type: 'Bridal Lehenga',        category: 'lehengas', keywords: ['bridal lehenga', 'wedding lehenga', 'bridal skirt'] },
  { type: 'Chaniya Choli',         category: 'lehengas', keywords: ['chaniya', 'chaniya choli', 'ghagra choli', 'navratri'] },
  { type: 'Sharara',               category: 'lehengas', keywords: ['sharara'] },
  { type: 'Garara',                category: 'lehengas', keywords: ['garara'] },
  { type: 'Lehenga',               category: 'lehengas', keywords: ['lehenga', 'lehnga', 'skirt'] },
  // Kurtas & tops
  { type: 'Anarkali Suit',         category: 'kurtas',   keywords: ['anarkali', 'floor length kurta', 'anarkali suit'] },
  { type: 'Salwar Kameez',         category: 'kurtas',   keywords: ['salwar kameez', 'salwar suit', 'punjabi suit'] },
  { type: 'Palazzo Suit',          category: 'kurtas',   keywords: ['palazzo', 'palazzo suit', 'palazzo kurta'] },
  { type: 'Patiala Suit',          category: 'kurtas',   keywords: ['patiala', 'patiala salwar'] },
  { type: 'Straight Kurta',        category: 'kurtas',   keywords: ['straight kurta', 'straight cut kurta'] },
  { type: 'A-Line Kurta',          category: 'kurtas',   keywords: ['a-line kurta', 'a line kurta', 'flared kurta'] },
  { type: 'Block Print Kurta',     category: 'kurtas',   keywords: ['block print', 'block printed', 'hand block'] },
  { type: 'Embroidered Kurta',     category: 'kurtas',   keywords: ['embroidered kurta', 'embroidery kurta', 'mirror work kurta'] },
  { type: 'Lucknowi Kurta',        category: 'kurtas',   keywords: ['lucknowi', 'chikankari'] },
  { type: 'Kurti',                 category: 'kurtas',   keywords: ['kurti', 'top', 'tunic'] },
  { type: 'Kurta',                 category: 'kurtas',   keywords: ['kurta', 'kameez'] },
  // Dupattas & accessories
  { type: 'Dupatta',               category: 'kurtas',   keywords: ['dupatta', 'stole', 'chunni'] },
  { type: 'Shawl',                 category: 'kurtas',   keywords: ['shawl', 'kashmiri shawl', 'pashmina'] },
  // Ethnic Western fusion
  { type: 'Indo-Western Dress',    category: 'kurtas',   keywords: ['indo western', 'indo-western', 'fusion wear', 'cape kurta'] },
  { type: 'Co-ord Set',            category: 'kurtas',   keywords: ['co-ord', 'coord set', 'matching set'] },
  // Occasion-specific
  { type: 'Festive Wear',          category: 'kurtas',   keywords: ['festive', 'festival wear', 'diwali', 'eid'] },
  { type: 'Party Wear',            category: 'kurtas',   keywords: ['party wear', 'party'] },
  { type: 'Casual Ethnic',         category: 'kurtas',   keywords: ['casual', 'daily wear', 'everyday'] },
  // Kids
  { type: 'Kids Lehenga',          category: 'kids',     keywords: ['kids lehenga', 'girl lehenga', 'baby lehenga'] },
  { type: 'Kids Kurta Set',        category: 'kids',     keywords: ['kids kurta', 'boy kurta', 'baby kurta'] },
  { type: 'Kids Ethnic Wear',      category: 'kids',     keywords: ['kids', 'children', 'child', 'baby', 'toddler', 'boy', 'girl'] },
  // Generic fallback
  { type: 'Ethnic Garment',        category: 'kurtas',   keywords: ['ethnic', 'indian', 'traditional', 'garment', 'clothing', 'outfit', 'dress'] },
];

// ── Colour map ────────────────────────────────────────────────────────────────
const COLOUR_MAP: Record<string, [number, number, number]> = {
  'Red':           [220, 38,  38],
  'Crimson':       [185, 28,  28],
  'Pink':          [236, 72,  153],
  'Rose':          [251, 113, 133],
  'Orange':        [234, 88,  12],
  'Yellow':        [234, 179, 8],
  'Mustard':       [202, 138, 4],
  'Ivory':         [240, 230, 210],
  'White':         [255, 255, 255],
  'Emerald Green': [4,   120, 87],
  'Green':         [22,  163, 74],
  'Teal':          [13,  148, 136],
  'Royal Blue':    [29,  78,  216],
  'Blue':          [37,  99,  235],
  'Navy':          [30,  27,  75],
  'Indigo':        [67,  56,  202],
  'Purple':        [126, 34,  206],
  'Violet':        [109, 40,  217],
  'Maroon':        [127, 29,  29],
  'Burgundy':      [109, 20,  20],
  'Gold':          [202, 138, 4],
  'Silver':        [148, 163, 184],
  'Black':         [15,  23,  42],
  'Charcoal':      [51,  65,  85],
  'Grey':          [107, 114, 128],
  'Brown':         [120, 53,  15],
  'Beige':         [214, 197, 171],
  'Peach':         [253, 186, 116],
  'Coral':         [249, 115, 22],
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

/**
 * Detects the specific ethnic garment type from Vision labels + object names.
 * Returns the best-matching entry from PRODUCT_TYPE_MAP, or null.
 */
function detectProductType(labels: string[], objectNames: string[]): { type: string; category: string } | null {
  const haystack = [...labels, ...objectNames].join(' ').toLowerCase();
  for (const entry of PRODUCT_TYPE_MAP) {
    if (entry.keywords.some(k => haystack.includes(k))) {
      return { type: entry.type, category: entry.category };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mime   = file.type || 'image/jpeg';

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    // Vision not configured — fall back gracefully
    const supabase = getServiceSupabase();
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, category')
      .order('created_at', { ascending: false });
    return NextResponse.json({
      visionSkipped:     true,
      visionError:       'GOOGLE_VISION_API_KEY not set',
      labels:            [],
      detectedCategory:  null,
      detectedProductType: null,
      detectedColours:   [],
      primaryColour:     null,
      detectedSize:      null,
      fullText:          '',
      suggestedProducts: [],
      allProducts:       products ?? [],
    });
  }

  // ── Call Google Vision ────────────────────────────────────────────────────
  let visionError: string | null = null;
  let labels: string[]           = [];
  let objectNames: string[]      = [];
  let colours: { name: string; score: number }[] = [];
  let primaryColour: string | null = null;
  let detectedSize: string | null  = null;
  let fullText = '';

  try {
    const visionRes = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64 },
            features: [
              { type: 'LABEL_DETECTION',       maxResults: 20 },
              { type: 'IMAGE_PROPERTIES',      maxResults: 10 },
              { type: 'TEXT_DETECTION',        maxResults: 5  },
              { type: 'OBJECT_LOCALIZATION',   maxResults: 10 },
            ],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();
    const r = visionData.responses?.[0];

    if (r?.error) {
      visionError = r.error.message ?? 'Vision API error';
    } else {
      // Labels
      labels = (r?.labelAnnotations ?? []).map((l: { description: string }) => l.description);

      // Object localisation — extract unique names
      objectNames = [
        ...new Set<string>(
          (r?.localizedObjectAnnotations ?? []).map(
            (o: { name: string }) => o.name
          )
        ),
      ];

      // Colour properties
      const dominantColours: Array<{
        color: { red: number; green: number; blue: number };
        score: number;
        pixelFraction: number;
      }> = r?.imagePropertiesAnnotation?.dominantColors?.colors ?? [];

      // Score = blended weight of API score + pixel fraction, boosted for non-white/grey tones
      const scored = dominantColours
        .filter(c => {
          const { red: R = 0, green: G = 0, blue: B = 0 } = c.color;
          const brightness = (R + G + B) / 3;
          // Skip very dark near-black swatches (likely shadows)
          return brightness > 20;
        })
        .map(c => {
          const { red: R = 0, green: G = 0, blue: B = 0 } = c.color;
          const name = nearestColourName(R, G, B);
          // Penalise near-neutral colours (white/grey/beige backgrounds)
          const saturation = Math.max(R, G, B) - Math.min(R, G, B);
          const saturationBoost = saturation > 40 ? 1.4 : saturation > 15 ? 1.1 : 0.6;
          const combinedScore = (c.score * 0.6 + c.pixelFraction * 0.4) * saturationBoost;
          return { name, score: Math.round(combinedScore * 1000) / 1000 };
        })
        .sort((a, b) => b.score - a.score);

      // Deduplicate by name, keeping highest score
      const seen = new Set<string>();
      colours = scored.filter(c => {
        if (seen.has(c.name)) return false;
        seen.add(c.name);
        return true;
      }).slice(0, 5);

      primaryColour = colours[0]?.name ?? null;

      // Full text
      fullText = r?.textAnnotations?.[0]?.description ?? '';
      detectedSize = extractSize(fullText) ?? extractSize(labels.join(' '));
    }
  } catch (e: unknown) {
    visionError = e instanceof Error ? e.message : 'Vision fetch failed';
  }

  // ── Detect category + product type ───────────────────────────────────────
  const allLabelText = [...labels, ...objectNames];
  const detectedCategory    = detectCategory(allLabelText);
  const detectedProductType = detectProductType(allLabelText, objectNames);

  // ── Load products & score suggestions ────────────────────────────────────
  const supabase = getServiceSupabase();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, category')
    .order('created_at', { ascending: false });

  const allProducts: Array<{ id: string; name: string; slug: string; category: string }> =
    products ?? [];

  // Score each product against labels + object names + detected type
  const scoredProducts = allProducts.map(p => {
    const haystack = (p.name + ' ' + p.category).toLowerCase();
    let score = 0;

    // Category match — strong signal
    if (detectedCategory && p.category === detectedCategory) score += 40;
    // Product type category match
    if (detectedProductType && p.category === detectedProductType.category) score += 20;

    // Label & object name keyword match
    for (const label of [...labels, ...objectNames]) {
      if (haystack.includes(label.toLowerCase())) score += 10;
    }

    // Product type name words in product name
    if (detectedProductType) {
      const typeWords = detectedProductType.type.toLowerCase().split(' ');
      for (const word of typeWords) {
        if (word.length > 3 && haystack.includes(word)) score += 8;
      }
    }

    // Colour match in product name
    if (primaryColour && haystack.includes(primaryColour.toLowerCase())) score += 6;

    return { ...p, score };
  });

  const suggestedProducts = scoredProducts
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _score, ...p }) => p);

  return NextResponse.json({
    visionSkipped:    !!visionError && labels.length === 0,
    visionError,
    labels,
    objectNames,
    detectedCategory,
    detectedProductType: detectedProductType
      ? { type: detectedProductType.type, category: detectedProductType.category }
      : null,
    detectedColours:  colours,
    primaryColour,
    detectedSize,
    fullText,
    suggestedProducts,
    allProducts,
  });
}
