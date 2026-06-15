'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD } from '../../lib/products';

// ─── Types ────────────────────────────────────────────────────────────────────
const LETTER_SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(variants: Variant[]) {
  const letter  = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size)).sort((a,b) => LETTER_SIZE_ORDER.indexOf(a.size)-LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size)).sort((a,b) => parseFloat(a.size)-parseFloat(b.size));
  const other   = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter,...numeric,...other];
}
type Variant = { id:string; size:string; colour:string; stock_count:number };
type ImgRow  = { id:string; colour:string; url:string; sort_order:number };
type Product = { id:string; slug:string; name:string; subtitle?:string; price:number; original_price?:number; category:string; badge?:string; image?:string; created_at:string; stock_count:number; low_stock_threshold:number; variants:Variant[] };
type Order   = { id:string; customer_name:string; customer_email:string; amount_aud:number; status:string; created_at:string; items:{name:string;quantity:number;price:number;size?:string;colour?:string}[]; shipping_address?:{line1?:string;suburb?:string;state?:string;postcode?:string} };

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StockBadge({ count, threshold }:{count:number;threshold:number}) {
  const c=Number(count); const out=c===0; const low=c>0&&c<=threshold;
  return <span style={{background:out?'#fef2f2':low?'#fefce8':'#dcfce7',color:out?'#dc2626':low?'#ca8a04':'#16a34a',borderRadius:'2rem',padding:'.2rem .65rem',fontSize:'.72rem',fontWeight:700,whiteSpace:'nowrap'}}>{out?'Out of stock':low?`Low (${c})`:`In stock (${c})`}</span>;
}

const CATEGORIES = ['sarees','lehengas','kurtas','kids'];
const SIZES = ['XS','S','M','L','XL','XXL','Free Size'];

// ─── Unified Product Card ────────────────────────────────────────────────────
function ProductCard({
  product, onDeleted, onRefresh,
}:{
  product:Product;
  onDeleted:(id:string)=>void;
  onRefresh:()=>void;
}) {
  const [open, setOpen]         = useState(false);
  const [activePanel, setActivePanel] = useState<'stock'|'images'|'edit'>('stock');

  // Images
  const [imgs,        setImgs]        = useState<ImgRow[]|null>(null);
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [newImgColour,setNewImgColour]= useState('');
  const [savingImg,   setSavingImg]   = useState(false);
  const [deletingImg, setDeletingImg] = useState<Record<string,boolean>>({});
  const fileRef = useRef<HTMLInputElement|null>(null);
  const extraFileRef = useRef<HTMLInputElement|null>(null);

  // Stock
  const [stockEdits,  setStockEdits]  = useState<Record<string,number>>({});
  const [stockSaving, setStockSaving] = useState<Record<string,boolean>>({});
  const [deletingVar, setDeletingVar] = useState<Record<string,boolean>>({});
  const [newSize,     setNewSize]     = useState('');
  const [newColour,   setNewColour]   = useState('');
  const [addingVar,   setAddingVar]   = useState(false);

  // Edit details
  const [editForm, setEditForm] = useState({
    name: product.name, subtitle: product.subtitle||'',
    price: String(product.price), original_price: String(product.original_price||''),
    category: product.category, badge: product.badge||'', description: '',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg,    setEditMsg]    = useState('');

  // Load images when panel opens
  async function loadImgs() {
    setLoadingImgs(true);
    const res  = await fetch(`/api/product-images/${product.id}`);
    const data = await res.json();
    setImgs(Array.isArray(data) ? data : []);
    setLoadingImgs(false);
  }

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && imgs === null) loadImgs();
  }

  function handlePanel(p:'stock'|'images'|'edit') {
    setActivePanel(p);
    if (p==='images' && imgs===null) loadImgs();
  }

  // ── Images helpers ──
  function groupByColour(rows:ImgRow[]):{colour:string;imgs:ImgRow[]}[] {
    const map = new Map<string,ImgRow[]>();
    for (const r of [...rows].sort((a,b)=>a.sort_order-b.sort_order)) {
      const k=r.colour||''; if (!map.has(k)) map.set(k,[]); map.get(k)!.push(r);
    }
    return Array.from(map.entries()).map(([colour,imgs])=>({colour,imgs}));
  }

  async function uploadImageFile(file:File) {
    setSavingImg(true);
    const colour = newImgColour.trim() || 'Unassigned';
    const existing = imgs ?? [];
    const maxOrder = existing.filter(r=>r.colour===colour).reduce((m,r)=>Math.max(m,r.sort_order),-1);
    const fd = new FormData();
    fd.append('image',file); fd.append('product_id',product.id);
    fd.append('colour',colour); fd.append('sort_order',String(maxOrder+1));
    await fetch('/api/admin/scan-upload',{method:'POST',body:fd,credentials:'include'});
    setNewImgColour(''); if(fileRef.current) fileRef.current.value='';
    await loadImgs(); setSavingImg(false);
  }

  async function uploadMultipleFiles(files:File[]) {
    setSavingImg(true);
    const colour = newImgColour.trim() || 'Unassigned';
    const existing = imgs ?? [];
    let maxOrder = existing.filter(r=>r.colour===colour).reduce((m,r)=>Math.max(m,r.sort_order),-1);
    for (const file of files) {
      const fd = new FormData();
      fd.append('image',file); fd.append('product_id',product.id);
      fd.append('colour',colour); fd.append('sort_order',String(maxOrder+1));
      await fetch('/api/admin/scan-upload',{method:'POST',body:fd,credentials:'include'});
      maxOrder++;
    }
    setNewImgColour(''); if(extraFileRef.current) extraFileRef.current.value='';
    await loadImgs(); setSavingImg(false);
  }

  async function deleteImg(imgId:string) {
    if (!confirm('Remove this image?')) return;
    setDeletingImg(d=>({...d,[imgId]:true}));
    await fetch(`/api/product-images/${product.id}?id=${imgId}`,{method:'DELETE'});
    await loadImgs();
    setDeletingImg(d=>({...d,[imgId]:false}));
  }

  async function moveImg(imgId:string, dir:-1|1) {
    const rows = [...(imgs??[])];
    const colour = rows.find(r=>r.id===imgId)?.colour||'';
    const group  = rows.filter(r=>r.colour===colour).sort((a,b)=>a.sort_order-b.sort_order);
    const gIdx   = group.findIndex(r=>r.id===imgId);
    const swapIdx = gIdx+dir;
    if (swapIdx<0||swapIdx>=group.length) return;
    const a=group[gIdx]; const b=group[swapIdx];
    await Promise.all([
      fetch(`/api/product-images/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id,sort_order:b.sort_order})}),
      fetch(`/api/product-images/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,sort_order:a.sort_order})}),
    ]);
    await loadImgs();
  }

  // ── Stock helpers ──
  async function saveStock(variantId:string|null,size:string,count:number,colour='') {
    const key = variantId ?? `${product.id}-${size}-${colour}`;
    setStockSaving(s=>({...s,[key]:true}));
    await fetch('/api/admin/stock',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(variantId?{variant_id:variantId,stock_count:count}:{product_id:product.id,size,colour,stock_count:count})});
    setStockEdits(e=>{const n={...e};delete n[key];return n;});
    setStockSaving(s=>({...s,[key]:false}));
    onRefresh();
  }

  async function deleteVar(variantId:string,size:string,colour:string) {
    if (!confirm(`Remove "${size}${colour?` / ${colour}`:''}"?`)) return;
    setDeletingVar(d=>({...d,[variantId]:true}));
    await fetch('/api/admin/stock',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant_id:variantId})});
    setDeletingVar(d=>({...d,[variantId]:false}));
    onRefresh();
  }

  async function addVariant() {
    if (!newSize.trim()) return;
    setAddingVar(true);
    await fetch('/api/admin/stock',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({product_id:product.id,size:newSize.trim(),colour:newColour.trim(),stock_count:0})});
    setNewSize(''); setNewColour(''); setAddingVar(false); onRefresh();
  }

  // ── Edit helpers ──
  async function saveEdit() {
    setEditSaving(true); setEditMsg('');
    const body: Record<string,unknown> = {
      name: editForm.name.trim(),
      category: editForm.category,
      price: parseFloat(editForm.price),
    };
    if (editForm.subtitle)       body.subtitle       = editForm.subtitle.trim();
    if (editForm.original_price) body.original_price = parseFloat(editForm.original_price);
    if (editForm.badge)          body.badge          = editForm.badge.trim();
    if (editForm.description)    body.description    = editForm.description.trim();
    const res = await fetch(`/api/admin/products/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data = await res.json();
    setEditMsg(res.ok ? '✅ Saved!' : `❌ ${data.error}`);
    setEditSaving(false);
    if (res.ok) onRefresh();
  }

  // ── Derived ──
  const variants       = sortVariants(product.variants ?? []);
  const totalStock     = variants.reduce((s,v)=>s+Number(v.stock_count),0);
  const outOfStock     = variants.filter(v=>Number(v.stock_count)===0).length;
  const lowStock       = variants.filter(v=>Number(v.stock_count)>0&&Number(v.stock_count)<=5).length;
  const coverImg       = product.image;
  const groups         = imgs ? groupByColour(imgs) : [];
  const totalImgs      = imgs?.length ?? 0;

  const panelBtn = (p:'stock'|'images'|'edit',label:string) => (
    <button onClick={()=>handlePanel(p)} style={{
      padding:'.35rem .85rem', borderRadius:'2rem', border:'none', cursor:'pointer',
      fontWeight:700, fontSize:'.78rem',
      background: activePanel===p ? '#9d174d' : '#f3f4f6',
      color: activePanel===p ? 'white' : '#6b7280',
      transition:'all .15s',
    }}>{label}</button>
  );

  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'.55rem .75rem', border:'1.5px solid #e5e7eb',
    borderRadius:'.6rem', fontSize:'.88rem', boxSizing:'border-box', background:'white',
  };
  const fieldLabel: React.CSSProperties = {
    fontSize:'.75rem', fontWeight:700, color:'#6b7280',
    textTransform:'uppercase', letterSpacing:'.05em', display:'block', marginBottom:'.3rem',
  };

  return (
    <div style={{ background:'white', borderRadius:'1rem', boxShadow:'0 2px 12px rgba(0,0,0,.07)', overflow:'hidden', border: open ? '1.5px solid #fbcfe8' : '1.5px solid transparent' }}>

      {/* ── Card header (storefront-style) ── */}
      <button onClick={handleOpen} style={{ width:'100%', padding:0, border:'none', background:'none', cursor:'pointer', textAlign:'left', display:'block' }}>
        <div style={{ display:'flex', alignItems:'stretch', gap:0 }}>
          {/* Thumbnail */}
          <div style={{ width:'90px', flexShrink:0, background:'#fdf2f8', position:'relative' }}>
            {coverImg ? (
              <img src={coverImg} alt={product.name} style={{ width:'90px', height:'90px', objectFit:'cover', display:'block' }}
                onError={e=>{(e.target as HTMLImageElement).src='https://via.placeholder.com/90?text=?';}} />
            ) : (
              <div style={{ width:'90px', height:'90px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem', color:'#e9a8c8' }}>👗</div>
            )}
            {outOfStock > 0 && (
              <div style={{ position:'absolute', top:'4px', left:'4px', background:'#dc2626', color:'white', borderRadius:'2rem', fontSize:'.55rem', fontWeight:700, padding:'1px 5px' }}>OOS</div>
            )}
          </div>

          {/* Info */}
          <div style={{ flex:1, padding:'.75rem .9rem', minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'.9rem', color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.name}</div>
            {product.subtitle && <div style={{ fontSize:'.75rem', color:'#9ca3af', marginBottom:'.2rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{product.subtitle}</div>}
            <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap', marginTop:'.2rem' }}>
              <span style={{ fontWeight:700, color:'#9d174d', fontSize:'.88rem' }}>{formatAUD(product.price)}</span>
              {product.original_price && <span style={{ fontSize:'.75rem', color:'#9ca3af', textDecoration:'line-through' }}>{formatAUD(product.original_price)}</span>}
              {product.badge && <span style={{ background:'#9d174d', color:'white', borderRadius:'2rem', padding:'.1rem .5rem', fontSize:'.65rem', fontWeight:700 }}>{product.badge}</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'.4rem', marginTop:'.35rem', flexWrap:'wrap' }}>
              <span style={{ background:'#ede9fe', color:'#6d28d9', borderRadius:'.35rem', padding:'.1rem .45rem', fontSize:'.68rem', fontWeight:600, textTransform:'capitalize' }}>{product.category}</span>
              <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>{variants.length} variant{variants.length!==1?'s':''}</span>
              {totalImgs>0 && <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>·  {totalImgs} photo{totalImgs!==1?'s':''}</span>}
              {outOfStock>0 && <span style={{ background:'#fef2f2', color:'#dc2626', borderRadius:'.35rem', padding:'.1rem .45rem', fontSize:'.68rem', fontWeight:700 }}>{outOfStock} OOS</span>}
              {lowStock>0  && <span style={{ background:'#fefce8', color:'#ca8a04', borderRadius:'.35rem', padding:'.1rem .45rem', fontSize:'.68rem', fontWeight:700 }}>{lowStock} low</span>}
            </div>
          </div>

          {/* Chevron */}
          <div style={{ display:'flex', alignItems:'center', paddingRight:'.9rem', color:'#9ca3af', fontSize:'.85rem', flexShrink:0 }}>
            {open ? '▲' : '▼'}
          </div>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div style={{ borderTop:'1.5px solid #fce7f3', padding:'1rem' }}>

          {/* Panel switcher */}
          <div style={{ display:'flex', gap:'.4rem', marginBottom:'1rem', flexWrap:'wrap' }}>
            {panelBtn('stock','📦 Stock')}
            {panelBtn('images','🖼️ Images')}
            {panelBtn('edit','✏️ Details')}
            <a href={`/admin/scan`} style={{ marginLeft:'auto', padding:'.35rem .85rem', borderRadius:'2rem', background:'#fdf2f8', color:'#9d174d', fontSize:'.78rem', fontWeight:700, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:'.3rem' }}>📷 Scan</a>
          </div>

          {/* ── Stock panel ── */}
          {activePanel==='stock' && (
            <div>
              {variants.length===0 && <p style={{ color:'#9ca3af', fontSize:'.83rem', margin:'0 0 .75rem' }}>No variants yet. Add one below.</p>}
              <div style={{ display:'flex', flexDirection:'column', gap:'.35rem', marginBottom:'.85rem' }}>
                {variants.map(v => {
                  const key  = v.id;
                  const val  = stockEdits[key] ?? Number(v.stock_count);
                  const dirty = key in stockEdits;
                  return (
                    <div key={v.id} style={{ display:'flex', alignItems:'center', gap:'.5rem', padding:'.5rem .65rem', background:'#f9fafb', borderRadius:'.6rem', flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:'.82rem', minWidth:'2rem' }}>{v.size}</span>
                      {v.colour && <span style={{ fontSize:'.75rem', color:'#7c3aed', background:'#ede9fe', borderRadius:'.3rem', padding:'.1rem .4rem' }}>{v.colour}</span>}
                      <StockBadge count={val} threshold={product.low_stock_threshold||5} />
                      <div style={{ display:'flex', alignItems:'center', gap:'.3rem', marginLeft:'auto' }}>
                        <button onClick={()=>setStockEdits(e=>({...e,[key]:Math.max(0,val-1)}))}
                          style={{ width:'28px', height:'28px', borderRadius:'50%', border:'1.5px solid #e5e7eb', background:'white', fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>−</button>
                        <input type="number" min={0} value={val}
                          onChange={e=>setStockEdits(ed=>({...ed,[key]:parseInt(e.target.value)||0}))}
                          style={{ width:'52px', padding:'.3rem .4rem', border:'1.5px solid #e5e7eb', borderRadius:'.5rem', fontSize:'.88rem', textAlign:'center' }} />
                        <button onClick={()=>setStockEdits(e=>({...e,[key]:val+1}))}
                          style={{ width:'28px', height:'28px', borderRadius:'50%', border:'1.5px solid #e5e7eb', background:'white', fontSize:'1rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>+</button>
                        <button onClick={()=>saveStock(v.id,v.size,val,v.colour)} disabled={!dirty||stockSaving[key]}
                          style={{ padding:'.3rem .65rem', borderRadius:'.5rem', border:'none', background:dirty?'#9d174d':'#e5e7eb', color:dirty?'white':'#9ca3af', fontSize:'.75rem', fontWeight:700, cursor:dirty?'pointer':'default' }}>
                          {stockSaving[key]?'…':'Save'}
                        </button>
                        <button onClick={()=>deleteVar(v.id,v.size,v.colour)} disabled={!!deletingVar[v.id]}
                          style={{ padding:'.3rem .55rem', borderRadius:'.5rem', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontSize:'.72rem', cursor:'pointer' }}>
                          {deletingVar[v.id]?'…':'🗑️'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add variant */}
              <div style={{ background:'#f5f3ff', borderRadius:'.75rem', padding:'.75rem', border:'1.5px dashed #c4b5fd' }}>
                <div style={{ fontSize:'.75rem', fontWeight:700, color:'#6d28d9', marginBottom:'.5rem' }}>+ Add Variant</div>
                <div style={{ display:'flex', gap:'.4rem', flexWrap:'wrap', marginBottom:'.5rem' }}>
                  {SIZES.map(s=><button key={s} onClick={()=>setNewSize(s)}
                    style={{ padding:'.25rem .55rem', borderRadius:'.4rem', border:`1.5px solid ${newSize===s?'#7e22ce':'#e5e7eb'}`, background:newSize===s?'#7e22ce':'white', color:newSize===s?'white':'#374151', fontSize:'.75rem', cursor:'pointer', fontWeight:600 }}>{s}</button>)}
                </div>
                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', alignItems:'center' }}>
                  <input value={newSize} onChange={e=>setNewSize(e.target.value)} placeholder="Size…"
                    style={{ ...inputStyle, width:'100px', flex:'0 0 auto', fontSize:'.83rem', padding:'.4rem .6rem' }} />
                  <input value={newColour} onChange={e=>setNewColour(e.target.value)} placeholder="Colour (opt)…"
                    style={{ ...inputStyle, width:'130px', flex:'0 0 auto', fontSize:'.83rem', padding:'.4rem .6rem' }} />
                  <button onClick={addVariant} disabled={!newSize.trim()||addingVar}
                    style={{ padding:'.4rem .9rem', borderRadius:'.6rem', border:'none', background:'#7e22ce', color:'white', fontSize:'.8rem', fontWeight:700, cursor:'pointer', opacity:newSize.trim()?1:.5 }}>
                    {addingVar?'Adding…':'Add'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Images panel ── */}
          {activePanel==='images' && (
            <div>
              {loadingImgs && <div style={{ color:'#9ca3af', fontSize:'.83rem', padding:'.5rem 0' }}>Loading images…</div>}

              {!loadingImgs && groups.length===0 && (
                <p style={{ color:'#9ca3af', fontSize:'.83rem', marginBottom:'1rem' }}>No images yet. Upload below.</p>
              )}

              {groups.map(({colour,imgs:gImgs})=>(
                <div key={colour} style={{ marginBottom:'1rem' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.5rem' }}>
                    <span style={{ background:'#fce7f3', color:'#9d174d', borderRadius:'2rem', padding:'.15rem .6rem', fontSize:'.72rem', fontWeight:700 }}>{colour||'Unassigned'}</span>
                    <span style={{ fontSize:'.72rem', color:'#9ca3af' }}>{gImgs.length} image{gImgs.length!==1?'s':''}</span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'.45rem' }}>
                    {gImgs.map((img,gIdx)=>(
                      <div key={img.id} style={{ position:'relative', borderRadius:'.6rem', overflow:'hidden', border:'1.5px solid #e5e7eb' }}>
                        <img src={img.url} alt={`${colour} ${gIdx+1}`} style={{ width:'100%', aspectRatio:'1', objectFit:'cover', display:'block' }}
                          onError={e=>{(e.target as HTMLImageElement).src='https://via.placeholder.com/80?text=?';}} />
                        <div style={{ position:'absolute', top:'3px', left:'3px', background:'rgba(0,0,0,.55)', color:'white', borderRadius:'2rem', fontSize:'.58rem', fontWeight:700, padding:'1px 5px' }}>#{gIdx+1}</div>
                        <div style={{ display:'flex', background:'rgba(255,255,255,.9)', backdropFilter:'blur(4px)' }}>
                          <button onClick={()=>moveImg(img.id,-1)} disabled={gIdx===0}
                            style={{ flex:1, padding:'.2rem', border:'none', background:'transparent', cursor:gIdx===0?'not-allowed':'pointer', opacity:gIdx===0?.3:1, fontSize:'.7rem' }}>◀</button>
                          <button onClick={()=>moveImg(img.id,1)} disabled={gIdx===gImgs.length-1}
                            style={{ flex:1, padding:'.2rem', border:'none', background:'transparent', cursor:gIdx===gImgs.length-1?'not-allowed':'pointer', opacity:gIdx===gImgs.length-1?.3:1, fontSize:'.7rem' }}>▶</button>
                          <button onClick={()=>deleteImg(img.id)} disabled={deletingImg[img.id]}
                            style={{ flex:1, padding:'.2rem', border:'none', background:'transparent', color:'#dc2626', cursor:'pointer', fontSize:'.7rem' }}>
                            {deletingImg[img.id]?'…':'🗑️'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Upload */}
              <div style={{ background:'#fff7ed', borderRadius:'.75rem', padding:'.75rem', border:'1.5px dashed #fed7aa', marginTop:'.5rem' }}>
                <div style={{ fontSize:'.75rem', fontWeight:700, color:'#c2410c', marginBottom:'.5rem' }}>+ Upload Images</div>
                <input value={newImgColour} onChange={e=>setNewImgColour(e.target.value)} placeholder="Colour label (e.g. Red)"
                  style={{ ...inputStyle, marginBottom:'.5rem', fontSize:'.83rem', padding:'.4rem .65rem' }} />
                <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:'.4rem', padding:'.4rem .85rem', borderRadius:'.6rem', background:'#9d174d', color:'white', fontSize:'.8rem', fontWeight:700, cursor:'pointer' }}>
                    📷 Single
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }}
                      onChange={e=>{const f=e.target.files?.[0];if(f)uploadImageFile(f);}} />
                  </label>
                  <label style={{ display:'flex', alignItems:'center', gap:'.4rem', padding:'.4rem .85rem', borderRadius:'.6rem', background:'#7e22ce', color:'white', fontSize:'.8rem', fontWeight:700, cursor:'pointer' }}>
                    🖼️ Multiple
                    <input ref={extraFileRef} type="file" accept="image/*" multiple style={{ display:'none' }}
                      onChange={e=>{const fs=Array.from(e.target.files??[]);if(fs.length)uploadMultipleFiles(fs);}} />
                  </label>
                  {savingImg && <span style={{ fontSize:'.8rem', color:'#9ca3af', alignSelf:'center' }}>⏳ Uploading…</span>}
                </div>
              </div>
            </div>
          )}

          {/* ── Edit details panel ── */}
          {activePanel==='edit' && (
            <div style={{ display:'flex', flexDirection:'column', gap:'.65rem' }}>
              {editMsg && <div style={{ padding:'.5rem .75rem', borderRadius:'.5rem', background:editMsg.startsWith('✅')?'#f0fdf4':'#fef2f2', color:editMsg.startsWith('✅')?'#15803d':'#dc2626', fontSize:'.82rem', fontWeight:600 }}>{editMsg}</div>}
              <div><label style={fieldLabel}>Name</label><input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={inputStyle} /></div>
              <div><label style={fieldLabel}>Subtitle</label><input value={editForm.subtitle} onChange={e=>setEditForm(f=>({...f,subtitle:e.target.value}))} placeholder="Optional tagline" style={inputStyle} /></div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.5rem' }}>
                <div><label style={fieldLabel}>Price (₹)</label><input type="number" value={editForm.price} onChange={e=>setEditForm(f=>({...f,price:e.target.value}))} style={inputStyle} /></div>
                <div><label style={fieldLabel}>Original (₹)</label><input type="number" value={editForm.original_price} onChange={e=>setEditForm(f=>({...f,original_price:e.target.value}))} style={inputStyle} /></div>
              </div>
              <div><label style={fieldLabel}>Category</label>
                <select value={editForm.category} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}
                  style={{ ...inputStyle, cursor:'pointer' }}>
                  {CATEGORIES.map(c=><option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                </select>
              </div>
              <div><label style={fieldLabel}>Badge</label><input value={editForm.badge} onChange={e=>setEditForm(f=>({...f,badge:e.target.value}))} placeholder="e.g. New, Sale" style={inputStyle} /></div>
              <div><label style={fieldLabel}>Description</label>
                <textarea value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={3}
                  placeholder="Fabric, occasion, notes…" style={{ ...inputStyle, resize:'vertical' } as React.CSSProperties} />
              </div>
              <div style={{ display:'flex', gap:'.5rem' }}>
                <button onClick={saveEdit} disabled={editSaving}
                  style={{ flex:1, padding:'.7rem', borderRadius:'.65rem', border:'none', background:'#9d174d', color:'white', fontWeight:700, fontSize:'.88rem', cursor:'pointer', opacity:editSaving?.7:1 }}>
                  {editSaving?'Saving…':'💾 Save Details'}
                </button>
                <button onClick={()=>onDeleted(product.id)}
                  style={{ padding:'.7rem 1rem', borderRadius:'.65rem', background:'#fef2f2', border:'1px solid #fecaca', color:'#dc2626', fontWeight:700, fontSize:'.82rem', cursor:'pointer' }}>
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Orders Panel ─────────────────────────────────────────────────────────────
function OrdersPanel({ orders }:{orders:Order[]}) {
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
      {orders.length===0 && <div style={{ textAlign:'center', padding:'3rem', color:'#9ca3af', fontSize:'.9rem' }}>No orders yet.</div>}
      {orders.map(o=>(
        <div key={o.id} style={{ background:'white', borderRadius:'.85rem', boxShadow:'0 1px 6px rgba(0,0,0,.06)', overflow:'hidden' }}>
          <button onClick={()=>setExpanded(e=>({...e,[o.id]:!e[o.id]}))} style={{ width:'100%', padding:'.85rem 1rem', border:'none', background:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:'.75rem' }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap' }}>
                <span style={{ fontWeight:700, fontSize:'.88rem' }}>{o.customer_name||'Guest'}</span>
                <span style={{ background:'#dcfce7', color:'#16a34a', borderRadius:'2rem', padding:'.1rem .55rem', fontSize:'.68rem', fontWeight:700, textTransform:'capitalize' }}>{o.status}</span>
              </div>
              <div style={{ fontSize:'.75rem', color:'#9ca3af', marginTop:'.15rem' }}>
                {new Date(o.created_at).toLocaleDateString('en-AU')} · {formatAUD(Number(o.amount_aud))}
              </div>
            </div>
            <span style={{ color:'#9ca3af', fontSize:'.8rem', flexShrink:0 }}>{expanded[o.id]?'▲':'▼'}</span>
          </button>
          {expanded[o.id] && (
            <div style={{ borderTop:'1px solid #f3f4f6', padding:'.85rem 1rem', fontSize:'.82rem' }}>
              <div style={{ color:'#6b7280', marginBottom:'.5rem' }}>{o.customer_email}</div>
              {o.shipping_address && (
                <div style={{ color:'#6b7280', marginBottom:'.65rem' }}>
                  📍 {[o.shipping_address.line1,o.shipping_address.suburb,o.shipping_address.state,o.shipping_address.postcode].filter(Boolean).join(', ')}
                </div>
              )}
              <div style={{ display:'flex', flexDirection:'column', gap:'.3rem' }}>
                {(o.items??[]).map((it,i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'.4rem .6rem', background:'#f9fafb', borderRadius:'.45rem' }}>
                    <span>{it.name}{it.size?` (${it.size}${it.colour?` / ${it.colour}`:''})`:''}  ×{it.quantity}</span>
                    <span style={{ fontWeight:600 }}>{formatAUD(it.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab]           = useState<'products'|'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders,   setOrders]   = useState<Order[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [apiError, setApiError] = useState('');
  const [search,   setSearch]   = useState('');
  const [seeding,  setSeeding]  = useState(false);
  const [seedMsg,  setSeedMsg]  = useState('');

  async function fetchProducts() {
    const res = await fetch('/api/admin/stock');
    if (res.status===401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setApiError(`Stock: ${data.error??res.statusText}`); return; }
    setProducts(Array.isArray(data)?data:[]);
  }
  async function fetchOrders() {
    const res = await fetch('/api/admin/orders');
    if (res.status===401) { router.push('/admin/login'); return; }
    const data = await res.json();
    if (!res.ok) { setApiError(p=>`${p} | Orders: ${data.error}`); return; }
    setOrders(Array.isArray(data)?data:[]);
  }

  useEffect(()=>{Promise.all([fetchProducts(),fetchOrders()]).finally(()=>setLoading(false));},[]);

  async function handleSeed() {
    setSeeding(true); setSeedMsg('');
    const res = await fetch('/api/admin/seed',{method:'POST'});
    const data = await res.json();
    setSeedMsg(data.error?`❌ ${data.error}`:`✅ Seeded ${data.seeded} products!`);
    setSeeding(false); fetchProducts();
  }

  async function handleDelete(id:string) {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/admin/products/${id}`,{method:'DELETE'});
    setProducts(p=>p.filter(x=>x.id!==id));
  }

  async function handleLogout() {
    await fetch('/api/admin/login',{method:'DELETE'});
    router.push('/admin/login');
  }

  // Derived stats
  const allVariants     = products.flatMap(p=>p.variants??[]);
  const outOfStockCount = allVariants.filter(v=>Number(v.stock_count)===0).length;
  const lowStockCount   = allVariants.filter(v=>Number(v.stock_count)>0&&Number(v.stock_count)<=5).length;
  const totalRevenue    = orders.reduce((s,o)=>s+Number(o.amount_aud),0);

  const filteredProducts = search.trim()
    ? products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  if (loading) return <div style={{ padding:'4rem', textAlign:'center', color:'#9ca3af' }}>Loading dashboard…</div>;

  return (
    <main style={{ minHeight:'100dvh', background:'#fdf2f8', fontFamily:'system-ui, sans-serif', paddingBottom:'5rem' }}>

      {/* ── Top bar ── */}
      <div style={{ background:'#9d174d', color:'white', padding:'.85rem 1rem', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.6rem' }}>
          <a href="/" style={{ color:'white', textDecoration:'none', fontWeight:800, fontSize:'1rem' }}>Ethnic Story</a>
          <span style={{ opacity:.5 }}>|</span>
          <span style={{ fontSize:'.82rem', opacity:.8 }}>Admin</span>
        </div>
        <button onClick={handleLogout} style={{ background:'rgba(255,255,255,.2)', border:'none', color:'white', borderRadius:'.5rem', padding:'.3rem .75rem', fontSize:'.8rem', cursor:'pointer', fontWeight:600 }}>Sign out</button>
      </div>

      <div style={{ maxWidth:'560px', margin:'0 auto', padding:'1rem' }}>

        {apiError && (
          <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'.75rem', padding:'.85rem', marginBottom:'1rem', color:'#dc2626', fontSize:'.82rem' }}>⚠️ {apiError}</div>
        )}

        {/* ── Stats row ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'.5rem', marginBottom:'1rem' }}>
          {[
            { label:'Products', value:products.length,       icon:'👗', alert:false },
            { label:'Revenue',  value:formatAUD(totalRevenue),icon:'💰', alert:false },
            { label:'Low',      value:lowStockCount,          icon:'⚠️', alert:lowStockCount>0 },
            { label:'OOS',      value:outOfStockCount,        icon:'🚫', alert:outOfStockCount>0 },
          ].map(s=>(
            <div key={s.label} style={{ background:'white', borderRadius:'.75rem', padding:'.75rem .6rem', textAlign:'center', boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:s.alert&&(s.value as number)>0?'1px solid #fecaca':'1px solid transparent' }}>
              <div style={{ fontSize:'1.3rem' }}>{s.icon}</div>
              <div style={{ fontWeight:700, fontSize:'.95rem', color:s.alert&&(s.value as number)>0?'#dc2626':'#111827', marginTop:'.1rem' }}>{s.value}</div>
              <div style={{ fontSize:'.65rem', color:'#9ca3af', textTransform:'uppercase', letterSpacing:'.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tab content ── */}
        {tab==='products' && (
          <div>
            {/* Search + actions */}
            <div style={{ display:'flex', gap:'.5rem', marginBottom:'.85rem', alignItems:'center' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…"
                style={{ flex:1, padding:'.6rem .85rem', border:'1.5px solid #e5e7eb', borderRadius:'.75rem', fontSize:'.88rem', background:'white' }} />
              <a href="/admin/products/new"
                style={{ padding:'.6rem .9rem', borderRadius:'.75rem', background:'#9d174d', color:'white', fontWeight:700, fontSize:'.82rem', textDecoration:'none', whiteSpace:'nowrap' }}>
                + New
              </a>
            </div>

            {/* Seed */}
            <div style={{ display:'flex', alignItems:'center', gap:'.6rem', marginBottom:'.85rem', flexWrap:'wrap' }}>
              <button onClick={handleSeed} disabled={seeding}
                style={{ padding:'.4rem .85rem', borderRadius:'.65rem', border:'1.5px solid #e5e7eb', background:'white', color:'#6b7280', fontSize:'.78rem', fontWeight:600, cursor:'pointer' }}>
                {seeding?'Seeding…':'🌱 Seed demo products'}
              </button>
              {seedMsg && <span style={{ fontSize:'.78rem', color:seedMsg.startsWith('✅')?'#16a34a':'#dc2626' }}>{seedMsg}</span>}
            </div>

            {/* Product cards */}
            <div style={{ display:'flex', flexDirection:'column', gap:'.6rem' }}>
              {filteredProducts.length===0 && (
                <div style={{ textAlign:'center', padding:'3rem', color:'#9ca3af', fontSize:'.9rem' }}>
                  {search ? `No products matching "${search}"` : 'No products yet. Add one above or seed demo products.'}
                </div>
              )}
              {filteredProducts.map(p=>(
                <ProductCard key={p.id} product={p} onDeleted={handleDelete} onRefresh={fetchProducts} />
              ))}
            </div>
          </div>
        )}

        {tab==='orders' && <OrdersPanel orders={orders} />}
      </div>

      {/* ── Bottom nav ── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'1.5px solid #fce7f3', display:'flex', zIndex:20, boxShadow:'0 -2px 12px rgba(0,0,0,.07)' }}>
        {([
          { id:'products', icon:'👗', label:'Products' },
          { id:'orders',   icon:'📦', label:'Orders', badge: orders.length },
        ] as {id:'products'|'orders';icon:string;label:string;badge?:number}[]).map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)}
            style={{ flex:1, padding:'.75rem .5rem .5rem', border:'none', background:'none', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'.15rem', position:'relative' }}>
            <span style={{ fontSize:'1.3rem' }}>{n.icon}</span>
            <span style={{ fontSize:'.68rem', fontWeight:700, color:tab===n.id?'#9d174d':'#9ca3af' }}>{n.label}</span>
            {tab===n.id && <div style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'2rem', height:'2.5px', background:'#9d174d', borderRadius:'2px' }} />}
          </button>
        ))}
        <a href="/admin/scan"
          style={{ flex:1, padding:'.75rem .5rem .5rem', textDecoration:'none', display:'flex', flexDirection:'column', alignItems:'center', gap:'.15rem' }}>
          <span style={{ fontSize:'1.3rem' }}>📷</span>
          <span style={{ fontSize:'.68rem', fontWeight:700, color:'#9d174d' }}>Scan</span>
        </a>
      </nav>

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </main>
  );
}
