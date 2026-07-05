import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '../../../../lib/supabase';

/**
 * Unified admin auth — checks req.cookies first (reliable in Next.js 15
 * route handlers), then falls back to the cookies() store.
 * Matches the pattern used by stock/route.ts and products/[id]/route.ts.
 */
async function isAdmin(req: NextRequest): Promise<boolean> {
  const reqCookie = req.cookies.get('admin_session')?.value
    ?? req.cookies.get('admin_token')?.value;
  if (reqCookie) return true;

  try {
    const cookieStore = await cookies();
    const val = cookieStore.get('admin_session')?.value
      ?? cookieStore.get('admin_token')?.value;
    return !!val;
  } catch {
    return false;
  }
}

// ── Category keywords ─────────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sarees:   ['saree', 'sari', 'drape', 'silk', 'banarasi', 'chiffon', 'georgette', 'dupatta',
             'drapery', 'pleated', 'pallu', 'blouse'],
  lehengas: ['lehenga', 'lehnga', 'skirt', 'bridal', 'ghagra', 'chaniya', 'flared skirt',
             'circular skirt', 'maxi skirt'],
  kurtas:   ['kurta', 'kurti', 'tunic', 'top', 'shirt', 'kameez', 'cotton', 'block print',
             'anarkali', 'salwar', 'palazzo', 'churidar', 'embroidered', 'ethnic top'],
  kids:     ['kids', 'child', 'children', 'girl', 'boy', 'baby', 'toddler', 'infant'],
};

// ── Generic Vision label → garment type mapping ───────────────────────────────
const GENERIC_LABEL_MAP: Array<{ type: string; category: string; keywords: string[] }> = [
  { type: 'Saree',          category: 'sarees',   keywords: ['sari', 'saree', 'drape', 'pallu', 'pleats', 'pleated garment'] },
  { type: 'Lehenga',        category: 'lehengas', keywords: ['lehenga', 'lehnga', 'flared skirt', 'ghagra', 'skirt'] },
  { type: 'Kurta',          category: 'kurtas',   keywords: ['kurta', 'kurti', 'kameez', 'tunic', 'salwar', 'churidar', 'palazzo'] },
  { type: 'Anarkali Suit',  category: 'kurtas',   keywords: ['anarkali'] },
  { type: 'Salwar Kameez',  category: 'kurtas',   keywords: ['salwar kameez', 'salwar suit', 'punjabi suit'] },
  // Generic fashion Vision labels — map to most likely ethnic equivalent
  { type: 'Ethnic Top',     category: 'kurtas',   keywords: ['top', 'blouse', 'sleeve', 'neckline', 'collar', 'button', 'sleeve'] },
  { type: 'Ethnic Dress',   category: 'kurtas',   keywords: ['dress', 'gown', 'frock', 'evening gown', 'prom dress', 'fashion', 'long dress'] },
  { type: 'Ethnic Garment', category: 'kurtas',   keywords: ['textile', 'fabric', 'clothing', 'garment', 'costume', 'outerwear', 'apparel', 'fashion accessory'] },
];

// ── 35-type ethnic product type map ──────────────────────────────────────────
const PRODUCT_TYPE_MAP: Array<{ type: string; category: string; keywords: string[] }> = [
  { type: 'Banarasi Silk Saree',   category: 'sarees',   keywords: ['banarasi', 'brocade', 'silk saree', 'kashi'] },
  { type: 'Kanjivaram Saree',      category: 'sarees',   keywords: ['kanjivaram', 'kanjeevaram', 'kanchipuram'] },
  { type: 'Chiffon Saree',         category: 'sarees',   keywords: ['chiffon saree'] },
  { type: 'Georgette Saree',       category: 'sarees',   keywords: ['georgette saree', 'georgette'] },
  { type: 'Cotton Saree',          category: 'sarees',   keywords: ['cotton saree', 'handloom', 'khadi saree'] },
  { type: 'Net Saree',             category: 'sarees',   keywords: ['net saree', 'net fabric'] },
  { type: 'Bandhani Saree',        category: 'sarees',   keywords: ['bandhani', 'bandhej', 'tie dye'] },
  { type: 'Saree',                 category: 'sarees',   keywords: ['saree', 'sari', 'drape', 'pallu'] },
  { type: 'Bridal Lehenga',        category: 'lehengas', keywords: ['bridal lehenga', 'wedding lehenga', 'bridal skirt'] },
  { type: 'Chaniya Choli',         category: 'lehengas', keywords: ['chaniya', 'chaniya choli', 'ghagra choli', 'navratri'] },
  { type: 'Sharara',               category: 'lehengas', keywords: ['sharara'] },
  { type: 'Garara',                category: 'lehengas', keywords: ['garara'] },
  { type: 'Lehenga',               category: 'lehengas', keywords: ['lehenga', 'lehnga', 'flared skirt', 'ghagra'] },
  { type: 'Anarkali Suit',         category: 'kurtas',   keywords: ['anarkali', 'floor length kurta'] },
  { type: 'Salwar Kameez',         category: 'kurtas',   keywords: ['salwar kameez', 'salwar suit', 'punjabi suit'] },
  { type: 'Palazzo Suit',          category: 'kurtas',   keywords: ['palazzo', 'palazzo suit'] },
  { type: 'Patiala Suit',          category: 'kurtas',   keywords: ['patiala', 'patiala salwar'] },
  { type: 'Straight Kurta',        category: 'kurtas',   keywords: ['straight kurta', 'straight cut kurta'] },
  { type: 'A-Line Kurta',          category: 'kurtas',   keywords: ['a-line kurta', 'a line kurta', 'flared kurta'] },
  { type: 'Block Print Kurta',     category: 'kurtas',   keywords: ['block print', 'block printed', 'hand block'] },
  { type: 'Embroidered Kurta',     category: 'kurtas',   keywords: ['embroidered kurta', 'embroidery', 'mirror work', 'zari', 'zardozi', 'sequin'] },
  { type: 'Lucknowi Kurta',        category: 'kurtas',   keywords: ['lucknowi', 'chikankari'] },
  { type: 'Kurti',                 category: 'kurtas',   keywords: ['kurti'] },
  { type: 'Kurta',                 category: 'kurtas',   keywords: ['kurta', 'kameez'] },
  { type: 'Dupatta',               category: 'kurtas',   keywords: ['dupatta', 'stole', 'chunni'] },
  { type: 'Shawl',                 category: 'kurtas',   keywords: ['shawl', 'kashmiri shawl', 'pashmina'] },
  { type: 'Indo-Western Dress',    category: 'kurtas',   keywords: ['indo western', 'indo-western', 'fusion wear', 'cape kurta'] },
  { type: 'Co-ord Set',            category: 'kurtas',   keywords: ['co-ord', 'coord set', 'matching set'] },
  { type: 'Festive Wear',          category: 'kurtas',   keywords: ['festive', 'festival wear', 'diwali', 'eid'] },
  { type: 'Party Wear',            category: 'kurtas',   keywords: ['party wear'] },
  { type: 'Casual Ethnic',         category: 'kurtas',   keywords: ['casual', 'daily wear', 'everyday'] },
  { type: 'Kids Lehenga',          category: 'kids',     keywords: ['kids lehenga', 'girl lehenga', 'baby lehenga'] },
  { type: 'Kids Kurta Set',        category: 'kids',     keywords: ['kids kurta', 'boy kurta', 'baby kurta'] },
  { type: 'Kids Ethnic Wear',      category: 'kids',     keywords: ['kids', 'children', 'child', 'baby', 'toddler'] },
];

// ── Colour map ────────────────────────────────────────────────────────────────
const COLOUR_MAP: Record<string, [number, number, number]> = {
  'Red':           [220, 38,  38],  'Crimson':   [185, 28,  28],
  'Pink':          [236, 72,  153], 'Rose':       [251, 113, 133],
  'Orange':        [234, 88,  12],  'Yellow':     [234, 179, 8],
  'Mustard':       [202, 138, 4],   'Ivory':      [240, 230, 210],
  'White':         [255, 255, 255], 'Cream':      [253, 245, 230],
  'Emerald Green': [4,   120, 87],  'Green':      [22,  163, 74],
  'Teal':          [13,  148, 136], 'Royal Blue': [29,  78,  216],
  'Blue':          [37,  99,  235], 'Navy':       [30,  27,  75],
  'Indigo':        [67,  56,  202], 'Purple':     [126, 34,  206],
  'Violet':        [109, 40,  217], 'Maroon':     [127, 29,  29],
  'Burgundy':      [109, 20,  20],  'Gold':       [202, 138, 4],
  'Silver':        [148, 163, 184], 'Black':      [15,  23,  42],
  'Charcoal':      [51,  65,  85],  'Grey':       [107, 114, 128],
  'Brown':         [120, 53,  15],  'Beige':      [214, 197, 171],
  'Peach':         [253, 186, 116], 'Coral':      [249, 115, 22],
  'Magenta':       [219, 39,  119], 'Lavender':   [196, 181, 253],
  'Olive':         [101, 117, 40],  'Rust':       [194, 65,  12],
  'Turquoise':     [20,  184, 166],
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

/** Infer gender from Vision labels / web labels */
function detectGender(labels: string[]): 'women' | 'men' | 'kids' | 'unisex' {
  const hay = labels.join(' ').toLowerCase();
  if (/\b(kids?|child(ren)?|baby|toddler|infant|girl|boy)\b/.test(hay)) return 'kids';
  if (/\b(men'?s?|man|male|groom|sherwani|kurta pyjama|dhoti)\b/.test(hay)) return 'men';
  return 'women';
}

function detectProductType(
  labels: string[],
  objectNames: string[],
  webLabels: string[],
): { type: string; category: string } | null {
  const haystack = [...labels, ...objectNames, ...webLabels].join(' ').toLowerCase();
  for (const entry of PRODUCT_TYPE_MAP) {
    if (entry.keywords.some(k => haystack.includes(k))) {
      return { type: entry.type, category: entry.category };
    }
  }
  for (const entry of GENERIC_LABEL_MAP) {
    if (entry.keywords.some(k => haystack.includes(k))) {
      return { type: entry.type, category: entry.category };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('image') as File | null;
  if (!file) return NextResponse.json({ error: 'No image' }, { status: 400 });

  const bytes  = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  const mime   = file.type?.includes('png') ? 'image/png' : 'image/jpeg';
  void mime; // used for future MIME-type hints if needed

  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    const supabase = getServiceSupabase();
    const { data: products } = await supabase
      .from('products')
      .select('id, name, slug, category')
      .order('created_at', { ascending: false });
    return NextResponse.json({
      visionSkipped: true, visionError: 'GOOGLE_VISION_API_KEY not set',
      labels: [], objectNames: [], webLabels: [],
      detectedCategory: null, detectedProductType: null,
      detectedColours: [], primaryColour: null,
      detectedSize: null, detectedGender: 'women', fullText: '',
      suggestedProducts: [], allProducts: products ?? [],
    });
  }

  let visionError: string | null = null;
  let labels: string[]      = [];
  let objectNames: string[] = [];
  let webLabels: string[]   = [];
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
            imageContext: { languageHints: ['en'] },
            features: [
              { type: 'LABEL_DETECTION',     maxResults: 40 },
              { type: 'IMAGE_PROPERTIES',    maxResults: 10 },
              { type: 'TEXT_DETECTION',      maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 15 },
              { type: 'WEB_DETECTION',       maxResults: 15 },
              { type: 'PRODUCT_SEARCH',      maxResults: 5  },
            ],
          }],
        }),
      }
    );

    const visionData = await visionRes.json();

    if (visionData.error) {
      visionError = `Vision API error ${visionData.error.code}: ${visionData.error.message}`;
    } else {
      const r = visionData.responses?.[0];

      if (r?.error) {
        visionError = r.error.message ?? 'Vision API error';
      } else {
        labels = (r?.labelAnnotations ?? []).map((l: { description: string }) => l.description);

        objectNames = Array.from(
          new Set<string>(
            (r?.localizedObjectAnnotations ?? []).map((o: { name: string }) => o.name)
          )
        );

        const webEntities: string[] = (r?.webDetection?.webEntities ?? [])
          .filter((e: { score: number }) => e.score > 0.3)
          .map((e: { description: string }) => e.description ?? '')
          .filter(Boolean);
        const bestGuess: string[] = (r?.webDetection?.bestGuessLabels ?? [])
          .map((l: { label: string }) => l.label ?? '')
          .filter(Boolean);
        webLabels = [...bestGuess, ...webEntities];

        const dominantColours: Array<{
          color: { red: number; green: number; blue: number };
          score: number;
          pixelFraction: number;
        }> = r?.imagePropertiesAnnotation?.dominantColors?.colors ?? [];

        const scored = dominantColours
          .filter(c => {
            const { red: R = 0, green: G = 0, blue: B = 0 } = c.color;
            const avg = (R + G + B) / 3;
            return avg > 25 && avg < 245;
          })
          .map(c => {
            const { red: R = 0, green: G = 0, blue: B = 0 } = c.color;
            const name       = nearestColourName(R, G, B);
            const saturation = Math.max(R, G, B) - Math.min(R, G, B);
            const satBoost   = saturation > 60 ? 1.6 : saturation > 30 ? 1.2 : saturation > 10 ? 0.9 : 0.5;
            const score      = (c.score * 0.6 + c.pixelFraction * 0.4) * satBoost;
            return { name, score: Math.round(score * 1000) / 1000, r: R, g: G, b: B };
          })
          .sort((a, b) => b.score - a.score);

        const seen = new Set<string>();
        colours = scored
          .filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; })
          .slice(0, 5)
          .map(({ name, score }) => ({ name, score }));
        primaryColour = colours[0]?.name ?? null;

        fullText     = r?.textAnnotations?.[0]?.description ?? '';
        detectedSize = extractSize(fullText) ?? extractSize(labels.join(' '));
      }
    }
  } catch (e: unknown) {
    visionError = e instanceof Error ? e.message : 'Vision fetch failed';
  }

  const allLabelText = [...labels, ...objectNames, ...webLabels];
  const detectedCategory    = detectCategory(allLabelText);
  const detectedProductType = detectProductType(labels, objectNames, webLabels);
  const detectedGender      = detectGender(allLabelText);

  const supabase = getServiceSupabase();
  const { data: products } = await supabase
    .from('products')
    .select('id, name, slug, category')
    .order('created_at', { ascending: false });

  const allProducts = (products ?? []) as Array<{ id: string; name: string; slug: string; category: string }>;

  const scoredProducts = allProducts.map(p => {
    const haystack = (p.name + ' ' + p.category).toLowerCase();
    let score = 0;
    if (detectedCategory && p.category === detectedCategory)                score += 40;
    if (detectedProductType && p.category === detectedProductType.category) score += 20;
    for (const label of allLabelText) {
      if (haystack.includes(label.toLowerCase())) score += 10;
    }
    if (detectedProductType) {
      for (const word of detectedProductType.type.toLowerCase().split(' ')) {
        if (word.length > 3 && haystack.includes(word)) score += 8;
      }
    }
    if (primaryColour && haystack.includes(primaryColour.toLowerCase())) score += 6;
    return { ...p, score };
  });

  const suggestedProducts = scoredProducts
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ score: _s, ...p }) => p);

  return NextResponse.json({
    visionSkipped:    !!(visionError && labels.length === 0),
    visionError,
    labels,
    objectNames,
    webLabels,
    detectedCategory,
    detectedProductType: detectedProductType
      ? { type: detectedProductType.type, category: detectedProductType.category }
      : null,
    detectedColours:  colours,
    primaryColour,
    detectedSize,
    detectedGender,
    fullText,
    suggestedProducts,
    allProducts,
  });
}
