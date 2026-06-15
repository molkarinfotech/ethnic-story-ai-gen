'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type ParsedRow = {
  name: string;
  subtitle: string;
  category: string;
  gender: string;
  price: string;
  original_price: string;
  badge: string;
  slug: string;
  description: string;
  size: string;
  colour: string;
  stock: string;
  _errors: string[];
};

const REQUIRED = ['name','category','price','size','stock'] as const;
const VALID_CATEGORIES = ['sarees','lehengas','kurtas','sherwanis','kids'];
const VALID_GENDERS    = ['women','men','kids','unisex'];

function validateRow(row: ParsedRow): string[] {
  const errs: string[] = [];
  for (const f of REQUIRED) if (!row[f]?.trim()) errs.push(`${f} required`);
  if (row.price && isNaN(Number(row.price))) errs.push('price must be a number');
  if (row.original_price && isNaN(Number(row.original_price))) errs.push('original_price must be a number');
  if (row.stock && isNaN(Number(row.stock))) errs.push('stock must be a number');
  if (row.category && !VALID_CATEGORIES.includes(row.category.trim().toLowerCase()))
    errs.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  if (row.gender && !VALID_GENDERS.includes(row.gender.trim().toLowerCase()))
    errs.push(`gender must be one of: ${VALID_GENDERS.join(', ')}`);
  return errs;
}

function downloadTemplate() {
  const headers = ['name','subtitle','category','gender','price','original_price','badge','slug','description','size','colour','stock'];
  const rows = [
    ['Banarasi Silk Saree','Handwoven zari border','sarees','women','129','159','New','banarasi-silk','Luxurious silk saree','Free Size','Red','10'],
    ['Banarasi Silk Saree','','sarees','women','129','','','','','Free Size','Blue','6'],
    ['Ivory Sherwani Set','Groom collection','sherwanis','men','349','','Premium','','','M','Ivory','8'],
    ['Boys Kurta Pyjama','Soft cotton ages 1-8','kurtas','kids','19','25','Sale','','','S','White','15'],
  ];
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ethnic-story-import-template.csv';
  a.click();
}

export default function ImportPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows,       setRows]       = useState<ParsedRow[]>([]);
  const [fileName,   setFileName]   = useState('');
  const [parsing,    setParsing]    = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState<{created:number;updated:number;variantsUpserted:number;total:number;errors:string[]} | null>(null);
  const [parseError, setParseError] = useState('');

  const errorRows  = rows.filter(r => r._errors.length > 0);
  const validRows  = rows.filter(r => r._errors.length === 0);
  const canImport  = validRows.length > 0 && !importing;

  async function handleFile(file: File) {
    setParsing(true); setParseError(''); setRows([]); setResult(null);
    setFileName(file.name);
    try {
      let parsed: ParsedRow[] = [];

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) throw new Error('File has no data rows');
        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g,'').trim().toLowerCase());
        parsed = lines.slice(1).map(line => {
          const vals = line.match(/(?:"([^"]*)"|([^,]*))/g)?.map(v => v.replace(/^"|"$/g,'')) ?? [];
          const obj: Record<string,string> = {};
          headers.forEach((h,i) => { obj[h] = (vals[i]??'').trim(); });
          const row = obj as unknown as ParsedRow;
          row._errors = validateRow(row);
          return row;
        });
      } else {
        const XLSX = await import('xlsx');
        const buf  = await file.arrayBuffer();
        const wb   = XLSX.read(buf, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const raw  = XLSX.utils.sheet_to_json<Record<string,unknown>>(ws, { defval: '' });
        parsed = raw.map(r => {
          const row: Record<string,string> = {};
          for (const k of Object.keys(r)) row[k.toLowerCase().trim()] = String(r[k] ?? '').trim();
          const pr = row as unknown as ParsedRow;
          pr._errors = validateRow(pr);
          return pr;
        });
      }

      if (parsed.length === 0) throw new Error('No rows found in file');
      setRows(parsed);
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Could not parse file');
    } finally {
      setParsing(false);
    }
  }

  async function runImport() {
    if (!canImport) return;
    setImporting(true); setResult(null);
    const payload = validRows.map(r => ({
      name:           r.name.trim(),
      subtitle:       r.subtitle?.trim() || undefined,
      category:       r.category.trim().toLowerCase(),
      gender:         r.gender?.trim().toLowerCase() || 'women',
      price:          Number(r.price),
      original_price: r.original_price ? Number(r.original_price) : undefined,
      badge:          r.badge?.trim() || undefined,
      slug:           r.slug?.trim()  || undefined,
      description:    r.description?.trim() || undefined,
      size:           r.size.trim(),
      colour:         r.colour?.trim() || undefined,
      stock:          parseInt(r.stock) || 0,
    }));
    const res  = await fetch('/api/admin/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: payload }),
      credentials: 'include',
    });
    const data = await res.json();
    setResult(data);
    setImporting(false);
  }

  const card: React.CSSProperties = { background:'white', borderRadius:'1rem', padding:'1.1rem', boxShadow:'0 2px 10px rgba(0,0,0,.07)', marginBottom:'1rem' };
  const btn = (bg='#9d174d',color='white'): React.CSSProperties => ({ padding:'.6rem 1.1rem', borderRadius:'.65rem', border:'none', background:bg, color, fontWeight:700, fontSize:'.88rem', cursor:'pointer' });

  return (
    <main style={{ minHeight:'100dvh', background:'#fdf2f8', fontFamily:'system-ui, sans-serif', paddingBottom:'4rem' }}>
      <div style={{ background:'#9d174d', color:'white', padding:'.85rem 1rem', display:'flex', alignItems:'center', gap:'.75rem', position:'sticky', top:0, zIndex:20 }}>
        <button onClick={()=>router.push('/admin')} style={{ background:'rgba(255,255,255,.2)', border:'none', color:'white', borderRadius:'.5rem', padding:'.3rem .7rem', fontSize:'.85rem', cursor:'pointer' }}>← Back</button>
        <span style={{ fontWeight:800 }}>📥 Bulk Import</span>
      </div>

      <div style={{ maxWidth:'680px', margin:'0 auto', padding:'1rem' }}>

        <div style={card}>
          <div style={{ fontWeight:700, fontSize:'.95rem', marginBottom:'.5rem' }}>How it works</div>
          <ol style={{ margin:0, paddingLeft:'1.2rem', fontSize:'.84rem', color:'#6b7280', lineHeight:1.7 }}>
            <li>Download the template and fill in your products</li>
            <li>Each row = one size/colour variant; rows with the same <strong>name</strong> become one product</li>
            <li>Set <strong>gender</strong> to: women, men, kids, or unisex</li>
            <li>Upload the completed file (CSV or Excel .xlsx/.xls)</li>
            <li>Review the preview, fix any errors, then tap <strong>Import</strong></li>
          </ol>
          <div style={{ display:'flex', gap:'.6rem', marginTop:'.85rem', flexWrap:'wrap' }}>
            <button onClick={downloadTemplate} style={btn('#7e22ce')}>📄 Download Template (.csv)</button>
            <a href="/admin" style={{ ...btn('#f3f4f6','#374151'), textDecoration:'none', display:'inline-flex', alignItems:'center' }}>← Admin</a>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight:700, fontSize:'.92rem', marginBottom:'.75rem' }}>1. Choose file</div>
          <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'.5rem', border:'2px dashed #fbcfe8', borderRadius:'.85rem', padding:'2rem 1rem', cursor:'pointer', background:'#fdf2f8', textAlign:'center' }}>
            <span style={{ fontSize:'2rem' }}>📂</span>
            <span style={{ fontWeight:700, color:'#9d174d', fontSize:'.9rem' }}>{fileName || 'Tap to choose CSV or Excel file'}</span>
            <span style={{ fontSize:'.75rem', color:'#9ca3af' }}>.csv, .xlsx, .xls supported</span>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }}
              onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }} />
          </label>
          {parsing && <div style={{ marginTop:'.75rem', color:'#9ca3af', fontSize:'.84rem' }}>⏳ Parsing file…</div>}
          {parseError && <div style={{ marginTop:'.75rem', color:'#dc2626', fontSize:'.84rem', fontWeight:600 }}>❌ {parseError}</div>}
        </div>

        {rows.length > 0 && (
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'.75rem', flexWrap:'wrap', gap:'.5rem' }}>
              <div style={{ fontWeight:700, fontSize:'.92rem' }}>2. Preview</div>
              <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                <span style={{ background:'#dcfce7', color:'#16a34a', borderRadius:'2rem', padding:'.2rem .7rem', fontSize:'.75rem', fontWeight:700 }}>{validRows.length} valid</span>
                {errorRows.length > 0 && <span style={{ background:'#fef2f2', color:'#dc2626', borderRadius:'2rem', padding:'.2rem .7rem', fontSize:'.75rem', fontWeight:700 }}>{errorRows.length} errors</span>}
              </div>
            </div>
            {(() => {
              const names = Array.from(new Set(validRows.map(r=>r.name.trim())));
              return (
                <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'.85rem' }}>
                  {names.map(n => (
                    <span key={n} style={{ background:'#ede9fe', color:'#6d28d9', borderRadius:'.4rem', padding:'.15rem .55rem', fontSize:'.73rem', fontWeight:600 }}>{n}</span>
                  ))}
                </div>
              );
            })()}
            <div style={{ overflowX:'auto', borderRadius:'.6rem', border:'1.5px solid #f3f4f6' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'.75rem' }}>
                <thead>
                  <tr style={{ background:'#fdf2f8' }}>
                    {['#','Name','Gender','Cat','Price','Size','Colour','Stock','Errors'].map(h=>(
                      <th key={h} style={{ padding:'.4rem .6rem', textAlign:'left', fontWeight:700, color:'#6b7280', whiteSpace:'nowrap', borderBottom:'1.5px solid #f3f4f6' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r,i) => (
                    <tr key={i} style={{ background:r._errors.length?'#fef2f2':'white', borderBottom:'1px solid #f9fafb' }}>
                      <td style={{ padding:'.35rem .6rem', color:'#9ca3af' }}>{i+1}</td>
                      <td style={{ padding:'.35rem .6rem', fontWeight:600, maxWidth:'110px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.name}</td>
                      <td style={{ padding:'.35rem .6rem', color:'#7c3aed', textTransform:'capitalize' }}>{r.gender||'—'}</td>
                      <td style={{ padding:'.35rem .6rem' }}>{r.category}</td>
                      <td style={{ padding:'.35rem .6rem' }}>{r.price}</td>
                      <td style={{ padding:'.35rem .6rem' }}>{r.size}</td>
                      <td style={{ padding:'.35rem .6rem', color:'#7c3aed' }}>{r.colour}</td>
                      <td style={{ padding:'.35rem .6rem' }}>{r.stock}</td>
                      <td style={{ padding:'.35rem .6rem', color:'#dc2626', fontSize:'.7rem' }}>{r._errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errorRows.length > 0 && (
              <div style={{ marginTop:'.65rem', background:'#fef2f2', borderRadius:'.6rem', padding:'.65rem .85rem', fontSize:'.78rem', color:'#dc2626' }}>
                ⚠️ Rows with errors will be skipped. Fix them in your file and re-upload, or proceed to import only the valid rows.
              </div>
            )}
          </div>
        )}

        {validRows.length > 0 && !result && (
          <div style={card}>
            <div style={{ fontWeight:700, fontSize:'.92rem', marginBottom:'.6rem' }}>3. Import</div>
            <p style={{ fontSize:'.84rem', color:'#6b7280', margin:'0 0 .85rem' }}>
              {validRows.length} variant row{validRows.length>1?'s':''} → {new Set(validRows.map(r=>r.name.trim())).size} product{new Set(validRows.map(r=>r.name.trim())).size>1?'s':''}.
              Existing products will be <strong>updated</strong>; new ones will be <strong>created</strong>.
            </p>
            <button onClick={runImport} disabled={!canImport} style={{ ...btn(), width:'100%', padding:'.8rem', fontSize:'.95rem', opacity:canImport?1:.5 }}>
              {importing ? '⏳ Importing…' : `📥 Import ${new Set(validRows.map(r=>r.name.trim())).size} product${new Set(validRows.map(r=>r.name.trim())).size>1?'s':''}`}
            </button>
          </div>
        )}

        {result && (
          <div style={{ ...card, border:'2px solid #bbf7d0', background:'#f0fdf4' }}>
            <div style={{ fontWeight:800, fontSize:'1rem', color:'#15803d', marginBottom:'.6rem' }}>✅ Import complete!</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.5rem', marginBottom:result.errors.length?'.75rem':'0' }}>
              {[
                { label:'Created',  value:result.created },
                { label:'Updated',  value:result.updated },
                { label:'Variants', value:result.variantsUpserted },
              ].map(s=>(
                <div key={s.label} style={{ background:'white', borderRadius:'.65rem', padding:'.65rem', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
                  <div style={{ fontWeight:800, fontSize:'1.25rem', color:'#15803d' }}>{s.value}</div>
                  <div style={{ fontSize:'.7rem', color:'#6b7280', textTransform:'uppercase' }}>{s.label}</div>
                </div>
              ))}
            </div>
            {result.errors.length > 0 && (
              <div style={{ background:'#fef2f2', borderRadius:'.6rem', padding:'.65rem .85rem', fontSize:'.78rem', color:'#dc2626' }}>
                <strong>Errors:</strong> {result.errors.join(' | ')}
              </div>
            )}
            <div style={{ display:'flex', gap:'.6rem', marginTop:'.85rem', flexWrap:'wrap' }}>
              <button onClick={()=>router.push('/admin')} style={btn()}>← Back to Dashboard</button>
              <button onClick={()=>{ setRows([]); setResult(null); setFileName(''); if(fileRef.current) fileRef.current.value=''; }} style={btn('#f3f4f6','#374151')}>Import Another File</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
