'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { formatAUD } from '../../lib/products';

// ─── Types ────────────────────────────────────────────────────────────────────
const LETTER_SIZE_ORDER = ['XS','S','M','L','XL','XXL','Free Size'];
function sortVariants(variants: Variant[]) {
  const letter  = variants.filter(v => LETTER_SIZE_ORDER.includes(v.size)).sort((a,b)=>LETTER_SIZE_ORDER.indexOf(a.size)-LETTER_SIZE_ORDER.indexOf(b.size));
  const numeric = variants.filter(v => /^\d/.test(v.size)).sort((a,b)=>parseFloat(a.size)-parseFloat(b.size));
  const other   = variants.filter(v => !LETTER_SIZE_ORDER.includes(v.size) && !/^\d/.test(v.size));
  return [...letter,...numeric,...other];
}
type Variant  = { id:string; size:string; colour:string; stock_count:number };
type ImgRow   = { id:string; colour:string; url:string; sort_order:number };
type Product  = { id:string; slug:string; name:string; subtitle?:string; price:number; original_price?:number; category:string; badge?:string; image?:string; created_at:string; stock_count:number; low_stock_threshold:number; variants:Variant[] };
type Order    = {
  id:string; customer_name:string; customer_email:string; customer_phone?:string;
  amount_aud:number; status:string; payment_method?:string;
  shipping_cost?:number; tracking_number?:string; shipping_carrier?:string; notes?:string;
  created_at:string;
  items:{name:string;quantity:number;price:number;size?:string;colour?:string}[];
  shipping_address?:{line1?:string;line2?:string;suburb?:string;state?:string;postcode?:string};
};
type Category = { id:string; slug:string; label:string; description?:string; genders:string[]; sort_order:number };

function StockBadge({ count, threshold }:{count:number;threshold:number}) {
  const c=Number(count); const out=c===0; const low=c>0&&c<=threshold;
  return <span style={{background:out?'#fef2f2':low?'#fefce8':'#dcfce7',color:out?'#dc2626':low?'#ca8a04':'#16a34a',borderRadius:'2rem',padding:'.2rem .65rem',fontSize:'.72rem',fontWeight:700,whiteSpace:'nowrap'}}>{out?'Out of stock':low?`Low (${c})`:`In stock (${c})`}</span>;
}

const SIZES = ['XS','S','M','L','XL','XXL','Free Size'];

const ORDER_STATUSES = ['pending','processing','shipped','delivered','cancelled'] as const;
type OrderStatus = typeof ORDER_STATUSES[number];
const STATUS_COLORS: Record<OrderStatus, { bg:string; color:string }> = {
  pending:    { bg:'#fefce8', color:'#ca8a04' },
  processing: { bg:'#eff6ff', color:'#1d4ed8' },
  shipped:    { bg:'#f0f9ff', color:'#0369a1' },
  delivered:  { bg:'#dcfce7', color:'#16a34a' },
  cancelled:  { bg:'#fef2f2', color:'#dc2626' },
};
const PAYMENT_LABELS: Record<string,string> = {
  card:'💳 Card', cash:'💵 Cash on Delivery', eftpos:'🏧 EFTPOS', payid:'📲 PayID',
};
const CARRIERS = ['Australia Post','Aramex','DHL','FedEx','TNT','Toll','CouriersPlease','StarTrack','Sendle','Other'];

// ─── Upgraded Orders Panel ────────────────────────────────────────────────────
function OrdersPanel({ orders: initialOrders }: { orders: Order[] }) {
  const [orders,   setOrders]   = useState<Order[]>(initialOrders);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<OrderStatus|'all'>('all');
  const [expanded, setExpanded] = useState<Record<string,boolean>>({});
  const [saving,   setSaving]   = useState<Record<string,boolean>>({});
  const [drafts,   setDrafts]   = useState<Record<string,Partial<Order>>>({});
  const [msgs,     setMsgs]     = useState<Record<string,string>>({});

  useEffect(() => { setOrders(initialOrders); }, [initialOrders]);

  function draft(id:string) { return drafts[id] ?? {}; }
  function setDraft(id:string, patch: Partial<Order>) {
    setDrafts(d => ({ ...d, [id]: { ...(d[id]??{}), ...patch } }));
  }
  function fieldVal<K extends keyof Order>(id:string, key:K, fallback: Order[K]): Order[K] {
    const d = drafts[id];
    return (d && key in d ? d[key] : fallback) as Order[K];
  }
  function isDirty(id:string) { return Object.keys(drafts[id]??{}).length > 0; }

  async function saveOrder(order: Order) {
    const d = drafts[order.id];
    if (!d || Object.keys(d).length===0) return;
    setSaving(s => ({...s,[order.id]:true}));
    setMsgs(m => ({...m,[order.id]:''}) );
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify(d),
    });
    const data = await res.json();
    if (res.ok) {
      setOrders(os => os.map(o => o.id===order.id ? {...o,...data} : o));
      setDrafts(d => { const n={...d}; delete n[order.id]; return n; });
      setMsgs(m => ({...m,[order.id]:'✅ Saved'}) );
    } else {
      setMsgs(m => ({...m,[order.id]:`❌ ${data.error}`}) );
    }
    setSaving(s => ({...s,[order.id]:false}));
    setTimeout(() => setMsgs(m => ({...m,[order.id]:''})), 3500);
  }

  const filtered = orders
    .filter(o => filter==='all' || o.status===filter)
    .filter(o => !search.trim() || [
      o.customer_name, o.customer_email, o.id,
      o.tracking_number, o.customer_phone,
    ].some(v => v?.toLowerCase().includes(search.toLowerCase())));

  const inputStyle: React.CSSProperties = {
    padding:'.45rem .65rem',border:'1.5px solid #e5e7eb',borderRadius:'.5rem',
    fontSize:'.82rem',background:'white',width:'100%',boxSizing:'border-box',
  };

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'.85rem' }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search name, email, tracking…"
          style={{ ...inputStyle, fontSize:'.85rem', padding:'.6rem .85rem' }} />
        <div style={{ display:'flex',gap:'.35rem',flexWrap:'wrap' }}>
          {(['all',...ORDER_STATUSES] as const).map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{ padding:'.28rem .7rem',borderRadius:'2rem',border:'none',cursor:'pointer',fontSize:'.72rem',fontWeight:700,
                background:filter===s?'#9d174d':'#f3f4f6',color:filter===s?'white':'#6b7280',
                textTransform:'capitalize' }}>
              {s==='all'?`All (${orders.length})`:s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div style={{ display:'flex',flexDirection:'column',gap:'.6rem' }}>
        {filtered.length===0 && (
          <div style={{ textAlign:'center',padding:'3rem',color:'#9ca3af',fontSize:'.9rem' }}>No orders found.</div>
        )}
        {filtered.map(o => {
          const sc = STATUS_COLORS[o.status as OrderStatus] ?? STATUS_COLORS.pending;
          const isOpen = expanded[o.id];
          const items = o.items ?? [];
          const subtotal = items.reduce((s,i)=>s+i.price*i.quantity,0);
          const shippingCost = o.shipping_cost ?? Math.max(0, Number(o.amount_aud)-subtotal);
          return (
            <div key={o.id} style={{ background:'white',borderRadius:'.85rem',boxShadow:'0 1px 6px rgba(0,0,0,.06)',overflow:'hidden',border:isDirty(o.id)?'1.5px solid #fbbf24':'1.5px solid transparent',transition:'border .15s' }}>

              {/* Header row */}
              <button onClick={()=>setExpanded(e=>({...e,[o.id]:!e[o.id]}))} style={{ width:'100%',padding:'.85rem 1rem',border:'none',background:'none',cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:'.75rem' }}>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap' }}>
                    <span style={{ fontWeight:700,fontSize:'.88rem' }}>{o.customer_name||'Guest'}</span>
                    <span style={{ ...sc,borderRadius:'2rem',padding:'.1rem .55rem',fontSize:'.68rem',fontWeight:700,textTransform:'capitalize' }}>{o.status}</span>
                    {o.payment_method && o.payment_method!=='card' && (
                      <span style={{ background:'#fef9c3',color:'#92400e',borderRadius:'2rem',padding:'.1rem .5rem',fontSize:'.66rem',fontWeight:700 }}>{PAYMENT_LABELS[o.payment_method]??o.payment_method}</span>
                    )}
                  </div>
                  <div style={{ fontSize:'.74rem',color:'#9ca3af',marginTop:'.15rem' }}>
                    {new Date(o.created_at).toLocaleDateString('en-AU')} · {formatAUD(Number(o.amount_aud))}
                    {o.tracking_number && <span style={{ marginLeft:'.5rem',color:'#0369a1' }}>📦 {o.tracking_number}</span>}
                  </div>
                </div>
                <span style={{ color:'#9ca3af',fontSize:'.8rem',flexShrink:0 }}>{isOpen?'▲':'▼'}</span>
              </button>

              {isOpen && (
                <div style={{ borderTop:'1px solid #f3f4f6',padding:'.9rem 1rem',display:'flex',flexDirection:'column',gap:'.75rem' }}>

                  {/* Contact */}
                  <div style={{ fontSize:'.8rem',color:'#6b7280',lineHeight:1.6 }}>
                    {o.customer_email && <div>✉️ {o.customer_email}</div>}
                    {o.customer_phone && <div>📞 {o.customer_phone}</div>}
                    {o.shipping_address && (
                      <div>📍 {[o.shipping_address.line1,o.shipping_address.line2,o.shipping_address.suburb,o.shipping_address.state,o.shipping_address.postcode].filter(Boolean).join(', ')}</div>
                    )}
                  </div>

                  {/* Items */}
                  <div style={{ display:'flex',flexDirection:'column',gap:'.3rem' }}>
                    {items.map((it,i)=>(
                      <div key={i} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.4rem .65rem',background:'#f9fafb',borderRadius:'.45rem',fontSize:'.82rem' }}>
                        <span>{it.name}{it.size?` (${it.size}${it.colour?` / ${it.colour}`:''})`:''}  ×{it.quantity}</span>
                        <span style={{ fontWeight:600,color:'#9d174d' }}>{formatAUD(it.price*it.quantity)}</span>
                      </div>
                    ))}
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.78rem',color:'#9ca3af',padding:'0 .65rem',marginTop:'.2rem' }}>
                      <span>Subtotal</span><span>{formatAUD(subtotal)}</span>
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.78rem',color:shippingCost===0?'#16a34a':'#9ca3af',padding:'0 .65rem' }}>
                      <span>Shipping</span><span>{shippingCost===0?'FREE':formatAUD(shippingCost)}</span>
                    </div>
                    <div style={{ display:'flex',justifyContent:'space-between',fontSize:'.88rem',fontWeight:700,padding:'.4rem .65rem',borderTop:'1.5px solid #e5e7eb',marginTop:'.2rem' }}>
                      <span>Total</span><span style={{ color:'#9d174d' }}>{formatAUD(Number(o.amount_aud))}</span>
                    </div>
                  </div>

                  {/* Editable fields */}
                  <div style={{ background:'#fdf8f4',borderRadius:'.75rem',padding:'.75rem',display:'flex',flexDirection:'column',gap:'.55rem' }}>
                    <div style={{ fontSize:'.72rem',fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.05em' }}>Fulfillment</div>

                    {/* Status */}
                    <div>
                      <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',display:'block',marginBottom:'.25rem' }}>Status</label>
                      <select value={fieldVal(o.id,'status',o.status) as string}
                        onChange={e=>setDraft(o.id,{status:e.target.value})}
                        style={{ ...inputStyle,cursor:'pointer',background:STATUS_COLORS[fieldVal(o.id,'status',o.status) as OrderStatus]?.bg??'white',fontWeight:700 }}>
                        {ORDER_STATUSES.map(s=><option key={s} value={s} style={{ textTransform:'capitalize' }}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                      </select>
                    </div>

                    {/* Carrier */}
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.45rem' }}>
                      <div>
                        <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',display:'block',marginBottom:'.25rem' }}>Carrier</label>
                        <select value={fieldVal(o.id,'shipping_carrier',o.shipping_carrier??'') as string}
                          onChange={e=>setDraft(o.id,{shipping_carrier:e.target.value})}
                          style={{ ...inputStyle,cursor:'pointer' }}>
                          <option value="">— select —</option>
                          {CARRIERS.map(c=><option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',display:'block',marginBottom:'.25rem' }}>Tracking #</label>
                        <input value={fieldVal(o.id,'tracking_number',o.tracking_number??'') as string}
                          onChange={e=>setDraft(o.id,{tracking_number:e.target.value})}
                          placeholder="e.g. 7XE1234567890" style={inputStyle} />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',display:'block',marginBottom:'.25rem' }}>Internal notes</label>
                      <textarea value={fieldVal(o.id,'notes',o.notes??'') as string}
                        onChange={e=>setDraft(o.id,{notes:e.target.value})}
                        rows={2} placeholder="e.g. Customer called re: address change"
                        style={{ ...inputStyle,resize:'vertical' } as React.CSSProperties} />
                    </div>

                    {/* Save + msg */}
                    <div style={{ display:'flex',alignItems:'center',gap:'.65rem' }}>
                      <button onClick={()=>saveOrder(o)} disabled={!isDirty(o.id)||saving[o.id]}
                        style={{ flex:1,padding:'.55rem',borderRadius:'.6rem',border:'none',background:'#9d174d',color:'white',fontWeight:700,fontSize:'.82rem',cursor:'pointer',opacity:isDirty(o.id)&&!saving[o.id]?1:.45 }}>
                        {saving[o.id]?'Saving…':'💾 Save changes'}
                      </button>
                      {isDirty(o.id) && (
                        <button onClick={()=>{setDrafts(d=>{const n={...d};delete n[o.id];return n;});}}
                          style={{ padding:'.55rem .75rem',borderRadius:'.6rem',border:'1.5px solid #e5e7eb',background:'white',fontSize:'.78rem',cursor:'pointer',color:'#6b7280',fontWeight:600 }}>Discard</button>
                      )}
                    </div>
                    {msgs[o.id] && (
                      <div style={{ fontSize:'.78rem',padding:'.35rem .6rem',borderRadius:'.4rem',background:msgs[o.id].startsWith('✅')?'#f0fdf4':'#fef2f2',color:msgs[o.id].startsWith('✅')?'#15803d':'#dc2626',fontWeight:600 }}>{msgs[o.id]}</div>
                    )}
                  </div>

                  {/* Footer links */}
                  <div style={{ display:'flex',gap:'.6rem',flexWrap:'wrap',paddingTop:'.15rem' }}>
                    <a href={`/orders/${o.id}`} target="_blank" rel="noopener" style={{ fontSize:'.76rem',color:'#9d174d',textDecoration:'none',fontWeight:700 }}>🔗 View tracking page ↗</a>
                    <span style={{ fontSize:'.76rem',color:'#d1d5db' }}>ID: {o.id.slice(0,16).toUpperCase()}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product, selected, onSelect, onDeleted, onRefresh, categories,
}:{
  product:Product; selected:boolean;
  onSelect:(id:string,val:boolean)=>void;
  onDeleted:(id:string)=>void;
  onRefresh:()=>void;
  categories:Category[];
}) {
  const [open, setOpen]               = useState(false);
  const [activePanel, setActivePanel] = useState<'stock'|'images'|'edit'>('stock');

  const [imgs,         setImgs]        = useState<ImgRow[]|null>(null);
  const [loadingImgs,  setLoadingImgs] = useState(false);
  const [newImgColour, setNewImgColour]= useState('');
  const [savingImg,    setSavingImg]   = useState(false);
  const [deletingImg,  setDeletingImg] = useState<Record<string,boolean>>({});
  const fileRef      = useRef<HTMLInputElement|null>(null);
  const extraFileRef = useRef<HTMLInputElement|null>(null);

  const [stockEdits,  setStockEdits]  = useState<Record<string,number>>({});
  const [stockSaving, setStockSaving] = useState<Record<string,boolean>>({});
  const [deletingVar, setDeletingVar] = useState<Record<string,boolean>>({});
  const [newSize,     setNewSize]     = useState('');
  const [newColour,   setNewColour]   = useState('');
  const [addingVar,   setAddingVar]   = useState(false);

  const [editForm, setEditForm] = useState({
    name:product.name, subtitle:product.subtitle||'',
    price:String(product.price), original_price:String(product.original_price||''),
    category:product.category, badge:product.badge||'', description:'',
  });
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg,    setEditMsg]    = useState('');

  async function loadImgs() {
    setLoadingImgs(true);
    const res=await fetch(`/api/product-images/${product.id}`);
    const data=await res.json();
    setImgs(Array.isArray(data)?data:[]);
    setLoadingImgs(false);
  }
  function handleOpen() { const n=!open; setOpen(n); if(n&&imgs===null) loadImgs(); }
  function handlePanel(p:'stock'|'images'|'edit') { setActivePanel(p); if(p==='images'&&imgs===null) loadImgs(); }

  function groupByColour(rows:ImgRow[]) {
    const map=new Map<string,ImgRow[]>();
    for (const r of [...rows].sort((a,b)=>a.sort_order-b.sort_order)) {
      const k=r.colour||''; if(!map.has(k))map.set(k,[]); map.get(k)!.push(r);
    }
    return Array.from(map.entries()).map(([colour,imgs])=>({colour,imgs}));
  }

  async function uploadImageFile(file:File) {
    setSavingImg(true);
    const colour=newImgColour.trim()||'Unassigned';
    const existing=imgs??[];
    const maxOrder=existing.filter(r=>r.colour===colour).reduce((m,r)=>Math.max(m,r.sort_order),-1);
    const fd=new FormData();
    fd.append('image',file); fd.append('product_id',product.id);
    fd.append('colour',colour); fd.append('sort_order',String(maxOrder+1));
    await fetch('/api/admin/scan-upload',{method:'POST',body:fd,credentials:'include'});
    setNewImgColour(''); if(fileRef.current) fileRef.current.value='';
    await loadImgs(); setSavingImg(false);
  }
  async function uploadMultipleFiles(files:File[]) {
    setSavingImg(true);
    const colour=newImgColour.trim()||'Unassigned';
    const existing=imgs??[];
    let maxOrder=existing.filter(r=>r.colour===colour).reduce((m,r)=>Math.max(m,r.sort_order),-1);
    for (const file of files) {
      const fd=new FormData();
      fd.append('image',file); fd.append('product_id',product.id);
      fd.append('colour',colour); fd.append('sort_order',String(maxOrder+1));
      await fetch('/api/admin/scan-upload',{method:'POST',body:fd,credentials:'include'});
      maxOrder++;
    }
    setNewImgColour(''); if(extraFileRef.current) extraFileRef.current.value='';
    await loadImgs(); setSavingImg(false);
  }
  async function deleteImg(imgId:string) {
    if(!confirm('Remove this image?')) return;
    setDeletingImg(d=>({...d,[imgId]:true}));
    await fetch(`/api/product-images/${product.id}?id=${imgId}`,{method:'DELETE'});
    await loadImgs(); setDeletingImg(d=>({...d,[imgId]:false}));
  }
  async function moveImg(imgId:string,dir:-1|1) {
    const rows=[...(imgs??[])];
    const colour=rows.find(r=>r.id===imgId)?.colour||'';
    const group=rows.filter(r=>r.colour===colour).sort((a,b)=>a.sort_order-b.sort_order);
    const gIdx=group.findIndex(r=>r.id===imgId);
    const swapIdx=gIdx+dir;
    if(swapIdx<0||swapIdx>=group.length) return;
    const a=group[gIdx]; const b=group[swapIdx];
    await Promise.all([
      fetch(`/api/product-images/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:a.id,sort_order:b.sort_order})}),
      fetch(`/api/product-images/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:b.id,sort_order:a.sort_order})}),
    ]);
    await loadImgs();
  }

  async function saveStock(variantId:string|null,size:string,count:number,colour='') {
    const key=variantId??`${product.id}-${size}-${colour}`;
    setStockSaving(s=>({...s,[key]:true}));
    await fetch('/api/admin/stock',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(variantId?{variant_id:variantId,stock_count:count}:{product_id:product.id,size,colour,stock_count:count})});
    setStockEdits(e=>{const n={...e};delete n[key];return n;});
    setStockSaving(s=>({...s,[key]:false})); onRefresh();
  }
  async function deleteVar(variantId:string,size:string,colour:string) {
    if(!confirm(`Remove "${size}${colour?` / ${colour}`:''}"`)) return;
    setDeletingVar(d=>({...d,[variantId]:true}));
    await fetch('/api/admin/stock',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant_id:variantId})});
    setDeletingVar(d=>({...d,[variantId]:false})); onRefresh();
  }
  async function addVariant() {
    if(!newSize.trim()) return; setAddingVar(true);
    await fetch('/api/admin/stock',{method:'PATCH',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({product_id:product.id,size:newSize.trim(),colour:newColour.trim(),stock_count:0})});
    setNewSize(''); setNewColour(''); setAddingVar(false); onRefresh();
  }

  async function saveEdit() {
    setEditSaving(true); setEditMsg('');
    const body:Record<string,unknown>={name:editForm.name.trim(),category:editForm.category,price:parseFloat(editForm.price)};
    if(editForm.subtitle)       body.subtitle=editForm.subtitle.trim();
    if(editForm.original_price) body.original_price=parseFloat(editForm.original_price);
    if(editForm.badge)          body.badge=editForm.badge.trim();
    if(editForm.description)    body.description=editForm.description.trim();
    const res=await fetch(`/api/admin/products/${product.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await res.json();
    setEditMsg(res.ok?'✅ Saved!':`❌ ${data.error}`);
    setEditSaving(false); if(res.ok) onRefresh();
  }

  const variants   = sortVariants(product.variants??[]);
  const outOfStock = variants.filter(v=>Number(v.stock_count)===0).length;
  const lowStock   = variants.filter(v=>Number(v.stock_count)>0&&Number(v.stock_count)<=5).length;
  const groups     = imgs?groupByColour(imgs):[];
  const totalImgs  = imgs?.length??0;

  const panelBtn=(p:'stock'|'images'|'edit',label:string)=>(
    <button onClick={()=>handlePanel(p)} style={{ padding:'.35rem .85rem',borderRadius:'2rem',border:'none',cursor:'pointer',fontWeight:700,fontSize:'.78rem',background:activePanel===p?'#9d174d':'#f3f4f6',color:activePanel===p?'white':'#6b7280' }}>{label}</button>
  );
  const inputStyle:React.CSSProperties={width:'100%',padding:'.55rem .75rem',border:'1.5px solid #e5e7eb',borderRadius:'.6rem',fontSize:'.88rem',boxSizing:'border-box',background:'white'};
  const fieldLabel:React.CSSProperties={fontSize:'.75rem',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.3rem'};

  return (
    <div style={{ background:'white', borderRadius:'1rem', boxShadow:'0 2px 12px rgba(0,0,0,.07)', overflow:'hidden', border:selected?'2px solid #9d174d':open?'1.5px solid #fbcfe8':'1.5px solid transparent', transition:'border .1s' }}>
      <div style={{ display:'flex', alignItems:'stretch' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 .6rem 0 .85rem', flexShrink:0 }}
          onClick={e=>{e.stopPropagation();onSelect(product.id,!selected);}}>
          <div style={{ width:'20px',height:'20px',borderRadius:'.35rem',border:`2px solid ${selected?'#9d174d':'#d1d5db'}`,background:selected?'#9d174d':'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>
            {selected && <span style={{ color:'white',fontSize:'.75rem',lineHeight:1 }}>✓</span>}
          </div>
        </div>
        <button onClick={handleOpen} style={{ flex:1, padding:0, border:'none', background:'none', cursor:'pointer', textAlign:'left', display:'flex', alignItems:'stretch', minWidth:0 }}>
          <div style={{ width:'82px',flexShrink:0,background:'#fdf2f8',position:'relative' }}>
            {product.image
              ? <img src={product.image} alt={product.name} style={{ width:'82px',height:'82px',objectFit:'cover',display:'block' }} onError={e=>{(e.target as HTMLImageElement).src='https://via.placeholder.com/82?text=?';}} />
              : <div style={{ width:'82px',height:'82px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.6rem',color:'#e9a8c8' }}>👗</div>}
            {outOfStock>0 && <div style={{ position:'absolute',top:'4px',left:'4px',background:'#dc2626',color:'white',borderRadius:'2rem',fontSize:'.52rem',fontWeight:700,padding:'1px 5px' }}>OOS</div>}
          </div>
          <div style={{ flex:1,padding:'.7rem .85rem',minWidth:0 }}>
            <div style={{ fontWeight:700,fontSize:'.88rem',color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{product.name}</div>
            {product.subtitle && <div style={{ fontSize:'.73rem',color:'#9ca3af',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{product.subtitle}</div>}
            <div style={{ display:'flex',alignItems:'center',gap:'.45rem',flexWrap:'wrap',marginTop:'.25rem' }}>
              <span style={{ fontWeight:700,color:'#9d174d',fontSize:'.85rem' }}>{formatAUD(product.price)}</span>
              {product.original_price && <span style={{ fontSize:'.73rem',color:'#9ca3af',textDecoration:'line-through' }}>{formatAUD(product.original_price)}</span>}
              {product.badge && <span style={{ background:'#9d174d',color:'white',borderRadius:'2rem',padding:'.1rem .45rem',fontSize:'.62rem',fontWeight:700 }}>{product.badge}</span>}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:'.35rem',marginTop:'.3rem',flexWrap:'wrap' }}>
              <span style={{ background:'#ede9fe',color:'#6d28d9',borderRadius:'.3rem',padding:'.1rem .4rem',fontSize:'.65rem',fontWeight:600,textTransform:'capitalize' }}>{product.category}</span>
              <span style={{ fontSize:'.7rem',color:'#9ca3af' }}>{variants.length}v</span>
              {totalImgs>0 && <span style={{ fontSize:'.7rem',color:'#9ca3af' }}>· {totalImgs}📷</span>}
              {outOfStock>0 && <span style={{ background:'#fef2f2',color:'#dc2626',borderRadius:'.3rem',padding:'.1rem .4rem',fontSize:'.65rem',fontWeight:700 }}>{outOfStock} OOS</span>}
              {lowStock>0  && <span style={{ background:'#fefce8',color:'#ca8a04',borderRadius:'.3rem',padding:'.1rem .4rem',fontSize:'.65rem',fontWeight:700 }}>{lowStock} low</span>}
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',paddingRight:'.85rem',color:'#9ca3af',fontSize:'.82rem',flexShrink:0 }}>{open?'▲':'▼'}</div>
        </button>
      </div>

      {open && (
        <div style={{ borderTop:'1.5px solid #fce7f3',padding:'1rem' }}>
          <div style={{ display:'flex',gap:'.4rem',marginBottom:'1rem',flexWrap:'wrap' }}>
            {panelBtn('stock','📦 Stock')}
            {panelBtn('images','🖼️ Images')}
            {panelBtn('edit','✏️ Details')}
            <a href="/admin/scan" style={{ marginLeft:'auto',padding:'.35rem .85rem',borderRadius:'2rem',background:'#fdf2f8',color:'#9d174d',fontSize:'.78rem',fontWeight:700,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'.3rem' }}>📷 Scan</a>
          </div>

          {activePanel==='stock' && (
            <div>
              {variants.length===0 && <p style={{ color:'#9ca3af',fontSize:'.83rem',margin:'0 0 .75rem' }}>No variants yet.</p>}
              <div style={{ display:'flex',flexDirection:'column',gap:'.35rem',marginBottom:'.85rem' }}>
                {variants.map(v=>{
                  const key=v.id; const val=stockEdits[key]??Number(v.stock_count); const dirty=key in stockEdits;
                  return (
                    <div key={v.id} style={{ display:'flex',alignItems:'center',gap:'.5rem',padding:'.5rem .65rem',background:'#f9fafb',borderRadius:'.6rem',flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700,fontSize:'.82rem',minWidth:'2rem' }}>{v.size}</span>
                      {v.colour && <span style={{ fontSize:'.73rem',color:'#7c3aed',background:'#ede9fe',borderRadius:'.3rem',padding:'.1rem .4rem' }}>{v.colour}</span>}
                      <StockBadge count={val} threshold={product.low_stock_threshold||5} />
                      <div style={{ display:'flex',alignItems:'center',gap:'.3rem',marginLeft:'auto' }}>
                        <button onClick={()=>setStockEdits(e=>({...e,[key]:Math.max(0,val-1)}))} style={{ width:'28px',height:'28px',borderRadius:'50%',border:'1.5px solid #e5e7eb',background:'white',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>−</button>
                        <input type="number" min={0} value={val} onChange={e=>setStockEdits(ed=>({...ed,[key]:parseInt(e.target.value)||0}))} style={{ width:'52px',padding:'.3rem .4rem',border:'1.5px solid #e5e7eb',borderRadius:'.5rem',fontSize:'.88rem',textAlign:'center' }} />
                        <button onClick={()=>setStockEdits(e=>({...e,[key]:val+1}))} style={{ width:'28px',height:'28px',borderRadius:'50%',border:'1.5px solid #e5e7eb',background:'white',fontSize:'1rem',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>+</button>
                        <button onClick={()=>saveStock(v.id,v.size,val,v.colour)} disabled={!dirty||stockSaving[key]} style={{ padding:'.3rem .65rem',borderRadius:'.5rem',border:'none',background:dirty?'#9d174d':'#e5e7eb',color:dirty?'white':'#9ca3af',fontSize:'.75rem',fontWeight:700,cursor:dirty?'pointer':'default' }}>{stockSaving[key]?'…':'Save'}</button>
                        <button onClick={()=>deleteVar(v.id,v.size,v.colour)} disabled={!!deletingVar[v.id]} style={{ padding:'.3rem .55rem',borderRadius:'.5rem',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',fontSize:'.72rem',cursor:'pointer' }}>{deletingVar[v.id]?'…':'🗑️'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background:'#f5f3ff',borderRadius:'.75rem',padding:'.75rem',border:'1.5px dashed #c4b5fd' }}>
                <div style={{ fontSize:'.75rem',fontWeight:700,color:'#6d28d9',marginBottom:'.5rem' }}>+ Add Variant</div>
                <div style={{ display:'flex',gap:'.4rem',flexWrap:'wrap',marginBottom:'.5rem' }}>
                  {SIZES.map(s=><button key={s} onClick={()=>setNewSize(s)} style={{ padding:'.25rem .55rem',borderRadius:'.4rem',border:`1.5px solid ${newSize===s?'#7e22ce':'#e5e7eb'}`,background:newSize===s?'#7e22ce':'white',color:newSize===s?'white':'#374151',fontSize:'.75rem',cursor:'pointer',fontWeight:600 }}>{s}</button>)}
                </div>
                <div style={{ display:'flex',gap:'.5rem',flexWrap:'wrap',alignItems:'center' }}>
                  <input value={newSize} onChange={e=>setNewSize(e.target.value)} placeholder="Size…" style={{ ...inputStyle,width:'100px',flex:'0 0 auto',fontSize:'.83rem',padding:'.4rem .6rem' }} />
                  <input value={newColour} onChange={e=>setNewColour(e.target.value)} placeholder="Colour (opt)…" style={{ ...inputStyle,width:'130px',flex:'0 0 auto',fontSize:'.83rem',padding:'.4rem .6rem' }} />
                  <button onClick={addVariant} disabled={!newSize.trim()||addingVar} style={{ padding:'.4rem .9rem',borderRadius:'.6rem',border:'none',background:'#7e22ce',color:'white',fontSize:'.8rem',fontWeight:700,cursor:'pointer',opacity:newSize.trim()?1:.5 }}>{addingVar?'Adding…':'Add'}</button>
                </div>
              </div>
            </div>
          )}

          {activePanel==='images' && (
            <div>
              {loadingImgs && <div style={{ color:'#9ca3af',fontSize:'.83rem',padding:'.5rem 0' }}>Loading…</div>}
              {!loadingImgs && groups.length===0 && <p style={{ color:'#9ca3af',fontSize:'.83rem',marginBottom:'1rem' }}>No images yet.</p>}
              {groups.map(({colour,imgs:gImgs})=>(
                <div key={colour} style={{ marginBottom:'1rem' }}>
                  <div style={{ display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.5rem' }}>
                    <span style={{ background:'#fce7f3',color:'#9d174d',borderRadius:'2rem',padding:'.15rem .6rem',fontSize:'.72rem',fontWeight:700 }}>{colour||'Unassigned'}</span>
                    <span style={{ fontSize:'.72rem',color:'#9ca3af' }}>{gImgs.length} img{gImgs.length!==1?'s':''}</span>
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.45rem' }}>
                    {gImgs.map((img,gIdx)=>(
                      <div key={img.id} style={{ position:'relative',borderRadius:'.6rem',overflow:'hidden',border:'1.5px solid #e5e7eb' }}>
                        <img src={img.url} alt={`${colour} ${gIdx+1}`} style={{ width:'100%',aspectRatio:'1',objectFit:'cover',display:'block' }} onError={e=>{(e.target as HTMLImageElement).src='https://via.placeholder.com/80?text=?';}} />
                        <div style={{ position:'absolute',top:'3px',left:'3px',background:'rgba(0,0,0,.55)',color:'white',borderRadius:'2rem',fontSize:'.58rem',fontWeight:700,padding:'1px 5px' }}>#{gIdx+1}</div>
                        <div style={{ display:'flex',background:'rgba(255,255,255,.9)' }}>
                          <button onClick={()=>moveImg(img.id,-1)} disabled={gIdx===0} style={{ flex:1,padding:'.2rem',border:'none',background:'transparent',cursor:gIdx===0?'not-allowed':'pointer',opacity:gIdx===0?.3:1,fontSize:'.7rem' }}>◀</button>
                          <button onClick={()=>moveImg(img.id,1)} disabled={gIdx===gImgs.length-1} style={{ flex:1,padding:'.2rem',border:'none',background:'transparent',cursor:gIdx===gImgs.length-1?'not-allowed':'pointer',opacity:gIdx===gImgs.length-1?.3:1,fontSize:'.7rem' }}>▶</button>
                          <button onClick={()=>deleteImg(img.id)} disabled={deletingImg[img.id]} style={{ flex:1,padding:'.2rem',border:'none',background:'transparent',color:'#dc2626',cursor:'pointer',fontSize:'.7rem' }}>{deletingImg[img.id]?'…':'🗑️'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ background:'#fff7ed',borderRadius:'.75rem',padding:'.75rem',border:'1.5px dashed #fed7aa',marginTop:'.5rem' }}>
                <div style={{ fontSize:'.75rem',fontWeight:700,color:'#c2410c',marginBottom:'.5rem' }}>+ Upload Images</div>
                <input value={newImgColour} onChange={e=>setNewImgColour(e.target.value)} placeholder="Colour label (e.g. Red)" style={{ ...inputStyle,marginBottom:'.5rem',fontSize:'.83rem',padding:'.4rem .65rem' }} />
                <div style={{ display:'flex',gap:'.5rem',flexWrap:'wrap' }}>
                  <label style={{ display:'flex',alignItems:'center',gap:'.4rem',padding:'.4rem .85rem',borderRadius:'.6rem',background:'#9d174d',color:'white',fontSize:'.8rem',fontWeight:700,cursor:'pointer' }}>📷 Single<input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImageFile(f);}}/></label>
                  <label style={{ display:'flex',alignItems:'center',gap:'.4rem',padding:'.4rem .85rem',borderRadius:'.6rem',background:'#7e22ce',color:'white',fontSize:'.8rem',fontWeight:700,cursor:'pointer' }}>🖼️ Multiple<input ref={extraFileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={e=>{const fs=Array.from(e.target.files??[]);if(fs.length)uploadMultipleFiles(fs);}}/></label>
                  {savingImg && <span style={{ fontSize:'.8rem',color:'#9ca3af',alignSelf:'center' }}>⏳ Uploading…</span>}
                </div>
              </div>
            </div>
          )}

          {activePanel==='edit' && (
            <div style={{ display:'flex',flexDirection:'column',gap:'.65rem' }}>
              {editMsg && <div style={{ padding:'.5rem .75rem',borderRadius:'.5rem',background:editMsg.startsWith('✅')?'#f0fdf4':'#fef2f2',color:editMsg.startsWith('✅')?'#15803d':'#dc2626',fontSize:'.82rem',fontWeight:600 }}>{editMsg}</div>}
              <div><label style={fieldLabel}>Name</label><input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} style={inputStyle} /></div>
              <div><label style={fieldLabel}>Subtitle</label><input value={editForm.subtitle} onChange={e=>setEditForm(f=>({...f,subtitle:e.target.value}))} placeholder="Optional tagline" style={inputStyle} /></div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem' }}>
                <div><label style={fieldLabel}>Price (AUD)</label><input type="number" value={editForm.price} onChange={e=>setEditForm(f=>({...f,price:e.target.value}))} style={inputStyle} /></div>
                <div><label style={fieldLabel}>Original (AUD)</label><input type="number" value={editForm.original_price} onChange={e=>setEditForm(f=>({...f,original_price:e.target.value}))} style={inputStyle} /></div>
              </div>
              <div><label style={fieldLabel}>Category</label>
                <select value={editForm.category} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))} style={{ ...inputStyle,cursor:'pointer' }}>
                  {categories.map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
              </div>
              <div><label style={fieldLabel}>Badge</label><input value={editForm.badge} onChange={e=>setEditForm(f=>({...f,badge:e.target.value}))} placeholder="e.g. New, Sale" style={inputStyle} /></div>
              <div><label style={fieldLabel}>Description</label><textarea value={editForm.description} onChange={e=>setEditForm(f=>({...f,description:e.target.value}))} rows={3} placeholder="Fabric, occasion, notes…" style={{ ...inputStyle,resize:'vertical' } as React.CSSProperties} /></div>
              <div style={{ display:'flex',gap:'.5rem' }}>
                <button onClick={saveEdit} disabled={editSaving} style={{ flex:1,padding:'.7rem',borderRadius:'.65rem',border:'none',background:'#9d174d',color:'white',fontWeight:700,fontSize:'.88rem',cursor:'pointer',opacity:editSaving?.7:1 }}>{editSaving?'Saving…':'💾 Save Details'}</button>
                <button onClick={()=>onDeleted(product.id)} style={{ padding:'.7rem 1rem',borderRadius:'.65rem',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',fontWeight:700,fontSize:'.82rem',cursor:'pointer' }}>🗑️ Delete</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Categories Panel ─────────────────────────────────────────────────────────
function CategoriesPanel({ categories, onRefresh }:{ categories:Category[]; onRefresh:()=>void }) {
  const [newSlug,  setNewSlug]  = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDesc,  setNewDesc]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [deleting, setDeleting] = useState<Record<string,boolean>>({});

  const inputStyle:React.CSSProperties = { width:'100%',padding:'.55rem .75rem',border:'1.5px solid #e5e7eb',borderRadius:'.6rem',fontSize:'.88rem',boxSizing:'border-box',background:'white' };

  async function addCategory(e:React.FormEvent) {
    e.preventDefault();
    if(!newSlug.trim()||!newLabel.trim()) return;
    setSaving(true); setMsg('');
    const res = await fetch('/api/admin/categories',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ slug:newSlug.trim().toLowerCase().replace(/\s+/g,'-'), label:newLabel.trim(), description:newDesc.trim()||undefined }),
    });
    const data = await res.json();
    if(res.ok) { setMsg('✅ Category added!'); setNewSlug(''); setNewLabel(''); setNewDesc(''); onRefresh(); }
    else setMsg(`❌ ${data.error}`);
    setSaving(false);
    setTimeout(()=>setMsg(''),4000);
  }

  async function deleteCategory(id:string, slug:string) {
    if(!confirm(`Delete "${slug}"? Products with this category will keep the value but it won't appear in dropdowns.`)) return;
    setDeleting(d=>({...d,[id]:true}));
    await fetch('/api/admin/categories',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
    setDeleting(d=>({...d,[id]:false}));
    onRefresh();
  }

  return (
    <div>
      <div style={{ display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'1.25rem' }}>
        {categories.length===0 && <p style={{ color:'#9ca3af',fontSize:'.85rem',textAlign:'center',padding:'1.5rem' }}>No categories yet.</p>}
        {categories.map(c=>(
          <div key={c.id} style={{ background:'white',borderRadius:'.85rem',padding:'.75rem 1rem',boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:'.75rem' }}>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap' }}>
                <span style={{ fontWeight:700,fontSize:'.88rem' }}>{c.label}</span>
                <span style={{ background:'#ede9fe',color:'#6d28d9',borderRadius:'.3rem',padding:'.1rem .4rem',fontSize:'.7rem',fontWeight:600 }}>{c.slug}</span>
              </div>
              {c.description && <div style={{ fontSize:'.75rem',color:'#9ca3af',marginTop:'.2rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.description}</div>}
              <div style={{ display:'flex',gap:'.3rem',marginTop:'.3rem',flexWrap:'wrap' }}>
                {c.genders.map(g=><span key={g} style={{ background:'#fce7f3',color:'#9d174d',borderRadius:'2rem',padding:'.1rem .45rem',fontSize:'.65rem',fontWeight:600 }}>{g}</span>)}
              </div>
            </div>
            <button onClick={()=>deleteCategory(c.id,c.slug)} disabled={!!deleting[c.id]}
              style={{ padding:'.35rem .6rem',borderRadius:'.5rem',background:'#fef2f2',border:'1px solid #fecaca',color:'#dc2626',fontSize:'.75rem',cursor:'pointer',flexShrink:0 }}>
              {deleting[c.id]?'…':'🗑️'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ background:'white',borderRadius:'1rem',padding:'1rem',boxShadow:'0 1px 6px rgba(0,0,0,.07)',border:'1.5px dashed #c4b5fd' }}>
        <div style={{ fontSize:'.8rem',fontWeight:700,color:'#6d28d9',marginBottom:'.75rem' }}>+ Add New Category</div>
        <form onSubmit={addCategory} style={{ display:'flex',flexDirection:'column',gap:'.6rem' }}>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem' }}>
            <div>
              <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.25rem' }}>Label *</label>
              <input value={newLabel} onChange={e=>{ setNewLabel(e.target.value); if(!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')); }} placeholder="e.g. Dupattas" required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.25rem' }}>Slug *</label>
              <input value={newSlug} onChange={e=>setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))} placeholder="e.g. dupattas" required style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ fontSize:'.72rem',fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:'.25rem' }}>Description</label>
            <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Short description shown on collection page" style={inputStyle} />
          </div>
          {msg && <div style={{ padding:'.4rem .65rem',borderRadius:'.45rem',background:msg.startsWith('✅')?'#f0fdf4':'#fef2f2',color:msg.startsWith('✅')?'#15803d':'#dc2626',fontSize:'.8rem',fontWeight:600 }}>{msg}</div>}
          <button type="submit" disabled={saving||!newSlug.trim()||!newLabel.trim()}
            style={{ padding:'.65rem',borderRadius:'.65rem',border:'none',background:'#9d174d',color:'white',fontWeight:700,fontSize:'.88rem',cursor:'pointer',opacity:(saving||!newSlug.trim()||!newLabel.trim())?.5:1 }}>
            {saving?'Saving…':'Save Category'}
          </button>
        </form>
      </div>
      <p style={{ fontSize:'.75rem',color:'#9ca3af',marginTop:'1rem',padding:'.6rem .8rem',background:'white',borderRadius:'.6rem',lineHeight:1.5 }}>
        💡 New categories appear automatically in the <strong>Category</strong> dropdowns when adding/editing products, and will show up in <strong>/collections</strong> once you assign products to them.
      </p>
    </div>
  );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
type BulkAction = 'delete'|'category'|'badge'|'zero-stock'|'price-adjust';
function BulkBar({
  count, onClearAll, onAction, categories,
}:{
  count:number;
  onClearAll:()=>void;
  onAction:(action:BulkAction,payload?:string)=>Promise<void>;
  categories:Category[];
}) {
  const [active,   setActive]   = useState<BulkAction|null>(null);
  const [payload,  setPayload]  = useState('');
  const [running,  setRunning]  = useState(false);
  const [resultMsg,setResultMsg]= useState('');

  async function run() {
    if (!active) return;
    if (active==='delete' && !confirm(`Delete ${count} product${count>1?'s':''}? This cannot be undone.`)) return;
    setRunning(true); setResultMsg('');
    await onAction(active, payload.trim()||undefined);
    setRunning(false); setActive(null); setPayload('');
    setResultMsg('✅ Done');
    setTimeout(()=>setResultMsg(''),3000);
  }

  const actionDefs:{ id:BulkAction; label:string; icon:string; needsInput?:string; inputType?:string; inputPlaceholder?:string; danger?:boolean }[] = [
    { id:'category',     label:'Set Category',   icon:'🏷️',  needsInput:'select' },
    { id:'badge',        label:'Set Badge',       icon:'✨',   needsInput:'text',   inputPlaceholder:'e.g. Sale, New' },
    { id:'price-adjust', label:'Adjust Price %',  icon:'💸',   needsInput:'number', inputPlaceholder:'+10 or -20 (%)' },
    { id:'zero-stock',   label:'Zero Stock',      icon:'📦',   danger:true },
    { id:'delete',       label:'Delete All',      icon:'🗑️',  danger:true },
  ];

  return (
    <div style={{ position:'sticky',top:'52px',zIndex:15,background:'#1f1135',borderRadius:'1rem',padding:'.85rem 1rem',marginBottom:'1rem',boxShadow:'0 4px 20px rgba(0,0,0,.25)' }}>
      <div style={{ display:'flex',alignItems:'center',gap:'.6rem',marginBottom:active?'.75rem':'0' }}>
        <div style={{ background:'#9d174d',color:'white',borderRadius:'2rem',padding:'.2rem .7rem',fontSize:'.78rem',fontWeight:700,flexShrink:0 }}>{count} selected</div>
        <div style={{ display:'flex',gap:'.35rem',flexWrap:'wrap',flex:1 }}>
          {actionDefs.map(a=>(
            <button key={a.id} onClick={()=>{ setActive(active===a.id?null:a.id); setPayload(''); }}
              style={{ padding:'.3rem .65rem',borderRadius:'.5rem',border:'none',cursor:'pointer',fontSize:'.75rem',fontWeight:700,
                background:active===a.id?(a.danger?'#dc2626':'#9d174d'):(a.danger?'#450a0a':'#2d1b4e'),
                color:active===a.id?'white':(a.danger?'#fca5a5':'#c4b5fd') }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <button onClick={onClearAll} style={{ background:'none',border:'none',color:'#9ca3af',fontSize:'1.1rem',cursor:'pointer',flexShrink:0,padding:'.2rem .4rem' }}>✕</button>
      </div>
      {active && (
        <div style={{ display:'flex',gap:'.5rem',alignItems:'center',flexWrap:'wrap' }}>
          {active==='category' ? (
            <select value={payload} onChange={e=>setPayload(e.target.value)}
              style={{ flex:1,padding:'.45rem .75rem',borderRadius:'.6rem',border:'none',background:'#2d1b4e',color:'white',fontSize:'.85rem' }}>
              <option value="">— pick category —</option>
              {categories.map(c=><option key={c.slug} value={c.slug}>{c.label}</option>)}
            </select>
          ) : active==='zero-stock'||active==='delete' ? null : (
            <input value={payload} onChange={e=>setPayload(e.target.value)} type={actionDefs.find(a=>a.id===active)?.inputType||'text'}
              placeholder={actionDefs.find(a=>a.id===active)?.inputPlaceholder}
              style={{ flex:1,padding:'.45rem .75rem',borderRadius:'.6rem',border:'none',background:'#2d1b4e',color:'white',fontSize:'.85rem' }}
              onKeyDown={e=>e.key==='Enter'&&run()} />
          )}
          <button onClick={run} disabled={running||(active!=='zero-stock'&&active!=='delete'&&!payload.trim())}
            style={{ padding:'.45rem 1.1rem',borderRadius:'.6rem',border:'none',
              background:(active==='delete'||active==='zero-stock')?'#dc2626':'#9d174d',
              color:'white',fontWeight:700,fontSize:'.85rem',cursor:'pointer',
              opacity:(active==='zero-stock'||active==='delete'||payload.trim())?1:.4 }}>
            {running?'Working…':'Apply'}
          </button>
          {resultMsg && <span style={{ fontSize:'.8rem',color:'#86efac' }}>{resultMsg}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [tab,        setTab]       = useState<'products'|'orders'|'categories'>('products');
  const [products,   setProducts]  = useState<Product[]>([]);
  const [orders,     setOrders]    = useState<Order[]>([]);
  const [categories, setCategories]= useState<Category[]>([]);
  const [loading,    setLoading]   = useState(true);
  const [apiError,   setApiError]  = useState('');
  const [search,     setSearch]    = useState('');
  const [seeding,    setSeeding]   = useState(false);
  const [seedMsg,    setSeedMsg]   = useState('');
  const [selected,   setSelected]  = useState<Set<string>>(new Set());

  async function fetchProducts() {
    const res=await fetch('/api/admin/stock');
    if(res.status===401){router.push('/admin/login');return;}
    const data=await res.json();
    if(!res.ok){setApiError(`Stock: ${data.error??res.statusText}`);return;}
    setProducts(Array.isArray(data)?data:[]);
  }
  async function fetchOrders() {
    const res=await fetch('/api/admin/orders');
    if(res.status===401){router.push('/admin/login');return;}
    const data=await res.json();
    if(!res.ok){setApiError(p=>`${p} | Orders: ${data.error}`);return;}
    setOrders(Array.isArray(data)?data:[]);
  }
  async function fetchCategories() {
    const data = await fetch('/api/admin/categories').then(r=>r.json());
    setCategories(Array.isArray(data)?data:[]);
  }
  useEffect(()=>{
    Promise.all([fetchProducts(),fetchOrders(),fetchCategories()]).finally(()=>setLoading(false));
  },[]);

  async function handleSeed() {
    setSeeding(true);setSeedMsg('');
    const res=await fetch('/api/admin/seed',{method:'POST'});
    const data=await res.json();
    setSeedMsg(data.error?`❌ ${data.error}`:`✅ Seeded ${data.seeded} products!`);
    setSeeding(false);fetchProducts();
  }
  async function handleDelete(id:string) {
    if(!confirm('Delete this product?')) return;
    await fetch(`/api/admin/products/${id}`,{method:'DELETE'});
    setProducts(p=>p.filter(x=>x.id!==id));
    setSelected(s=>{const n=new Set(s);n.delete(id);return n;});
  }
  async function handleLogout() {
    await fetch('/api/admin/login',{method:'DELETE'});
    router.push('/admin/login');
  }

  function toggleSelect(id:string, val:boolean) {
    setSelected(s=>{const n=new Set(s);val?n.add(id):n.delete(id);return n;});
  }
  const filteredProducts = search.trim()
    ? products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase())||p.category.toLowerCase().includes(search.toLowerCase()))
    : products;
  const allSelected = filteredProducts.length>0 && filteredProducts.every(p=>selected.has(p.id));
  function toggleAll() {
    if(allSelected) setSelected(s=>{const n=new Set(s);filteredProducts.forEach(p=>n.delete(p.id));return n;})
    else setSelected(s=>{const n=new Set(s);filteredProducts.forEach(p=>n.add(p.id));return n;});
  }

  async function executeBulkAction(action:BulkAction, payload?:string) {
    const ids = Array.from(selected);
    if(ids.length===0) return;
    if(action==='delete') {
      await Promise.all(ids.map(id=>fetch(`/api/admin/products/${id}`,{method:'DELETE'})));
      setProducts(p=>p.filter(x=>!ids.includes(x.id))); setSelected(new Set()); return;
    }
    if(action==='zero-stock') {
      const targets = products.filter(p=>ids.includes(p.id));
      await Promise.all(targets.flatMap(p=>(p.variants??[]).map(v=>fetch('/api/admin/stock',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({variant_id:v.id,stock_count:0})}))));
      await fetchProducts(); setSelected(new Set()); return;
    }
    if(action==='category' && payload) {
      await Promise.all(ids.map(id=>fetch(`/api/admin/products/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({category:payload})})));
      await fetchProducts(); setSelected(new Set()); return;
    }
    if(action==='badge') {
      await Promise.all(ids.map(id=>fetch(`/api/admin/products/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({badge:payload||''})})));
      await fetchProducts(); setSelected(new Set()); return;
    }
    if(action==='price-adjust' && payload) {
      const pct=parseFloat(payload); if(isNaN(pct)) return;
      const targets=products.filter(p=>ids.includes(p.id));
      await Promise.all(targets.map(p=>fetch(`/api/admin/products/${p.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({price:Math.round(p.price*(1+pct/100)*100)/100})})));
      await fetchProducts(); setSelected(new Set());
    }
  }

  const allVariants     = products.flatMap(p=>p.variants??[]);
  const outOfStockCount = allVariants.filter(v=>Number(v.stock_count)===0).length;
  const lowStockCount   = allVariants.filter(v=>Number(v.stock_count)>0&&Number(v.stock_count)<=5).length;
  const totalRevenue    = orders.reduce((s,o)=>s+Number(o.amount_aud),0);

  if(loading) return <div style={{ padding:'4rem',textAlign:'center',color:'#9ca3af' }}>Loading dashboard…</div>;

  return (
    <main style={{ minHeight:'100dvh',background:'#fdf2f8',fontFamily:'system-ui, sans-serif',paddingBottom:'5rem' }}>
      <div style={{ background:'#9d174d',color:'white',padding:'.85rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:20 }}>
        <div style={{ display:'flex',alignItems:'center',gap:'.6rem' }}>
          <a href="/" style={{ color:'white',textDecoration:'none',fontWeight:800,fontSize:'1rem' }}>Ethnic Story</a>
          <span style={{ opacity:.5 }}>|</span>
          <span style={{ fontSize:'.82rem',opacity:.8 }}>Admin</span>
        </div>
        <button onClick={handleLogout} style={{ background:'rgba(255,255,255,.2)',border:'none',color:'white',borderRadius:'.5rem',padding:'.3rem .75rem',fontSize:'.8rem',cursor:'pointer',fontWeight:600 }}>Sign out</button>
      </div>

      <div style={{ maxWidth:'560px',margin:'0 auto',padding:'1rem' }}>
        {apiError && <div style={{ background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'.75rem',padding:'.85rem',marginBottom:'1rem',color:'#dc2626',fontSize:'.82rem' }}>⚠️ {apiError}</div>}

        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.5rem',marginBottom:'1rem' }}>
          {[
            { label:'Products',value:products.length,       icon:'👗',alert:false },
            { label:'Revenue', value:formatAUD(totalRevenue),icon:'💰',alert:false },
            { label:'Low',     value:lowStockCount,          icon:'⚠️',alert:lowStockCount>0 },
            { label:'OOS',     value:outOfStockCount,        icon:'🚫',alert:outOfStockCount>0 },
          ].map(s=>(
            <div key={s.label} style={{ background:'white',borderRadius:'.75rem',padding:'.75rem .6rem',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.06)',border:s.alert&&(s.value as number)>0?'1px solid #fecaca':'1px solid transparent' }}>
              <div style={{ fontSize:'1.3rem' }}>{s.icon}</div>
              <div style={{ fontWeight:700,fontSize:'.95rem',color:s.alert&&(s.value as number)>0?'#dc2626':'#111827',marginTop:'.1rem' }}>{s.value}</div>
              <div style={{ fontSize:'.65rem',color:'#9ca3af',textTransform:'uppercase',letterSpacing:'.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {tab==='products' && (
          <div>
            <div style={{ display:'flex',gap:'.5rem',marginBottom:'.85rem',alignItems:'center' }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search products…"
                style={{ flex:1,padding:'.6rem .85rem',border:'1.5px solid #e5e7eb',borderRadius:'.75rem',fontSize:'.88rem',background:'white' }} />
              <a href="/admin/products/new" style={{ padding:'.6rem .9rem',borderRadius:'.75rem',background:'#9d174d',color:'white',fontWeight:700,fontSize:'.82rem',textDecoration:'none',whiteSpace:'nowrap' }}>+ New</a>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'.85rem',flexWrap:'wrap' }}>
              <button onClick={handleSeed} disabled={seeding} style={{ padding:'.4rem .85rem',borderRadius:'.65rem',border:'1.5px solid #e5e7eb',background:'white',color:'#6b7280',fontSize:'.78rem',fontWeight:600,cursor:'pointer' }}>{seeding?'Seeding…':'🌱 Seed demo products'}</button>
              {seedMsg && <span style={{ fontSize:'.78rem',color:seedMsg.startsWith('✅')?'#16a34a':'#dc2626' }}>{seedMsg}</span>}
            </div>
            {filteredProducts.length>0 && (
              <div style={{ display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'.65rem',padding:'.4rem .6rem',background:'white',borderRadius:'.65rem',border:'1.5px solid #e5e7eb' }}>
                <div onClick={toggleAll} style={{ width:'20px',height:'20px',borderRadius:'.35rem',border:`2px solid ${allSelected?'#9d174d':'#d1d5db'}`,background:allSelected?'#9d174d':'white',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0 }}>
                  {allSelected && <span style={{ color:'white',fontSize:'.75rem' }}>✓</span>}
                  {!allSelected && selected.size>0 && filteredProducts.some(p=>selected.has(p.id)) && <span style={{ color:'#9d174d',fontSize:'.75rem',fontWeight:900 }}>−</span>}
                </div>
                <span style={{ fontSize:'.8rem',color:'#6b7280',cursor:'pointer' }} onClick={toggleAll}>{allSelected?'Deselect all':`Select all (${filteredProducts.length})`}</span>
                {selected.size>0 && <span style={{ marginLeft:'auto',fontSize:'.75rem',color:'#9d174d',fontWeight:700 }}>{selected.size} selected</span>}
              </div>
            )}
            {selected.size>0 && <BulkBar count={selected.size} onClearAll={()=>setSelected(new Set())} onAction={executeBulkAction} categories={categories} />}
            <div style={{ display:'flex',flexDirection:'column',gap:'.6rem' }}>
              {filteredProducts.length===0 && (
                <div style={{ textAlign:'center',padding:'3rem',color:'#9ca3af',fontSize:'.9rem' }}>{search?`No products matching "${search}"` : 'No products yet.'}</div>
              )}
              {filteredProducts.map(p=>(
                <ProductCard key={p.id} product={p} selected={selected.has(p.id)} onSelect={toggleSelect} onDeleted={handleDelete} onRefresh={fetchProducts} categories={categories} />
              ))}
            </div>
          </div>
        )}

        {tab==='orders'     && <OrdersPanel orders={orders} />}
        {tab==='categories' && <CategoriesPanel categories={categories} onRefresh={fetchCategories} />}
      </div>

      <nav style={{ position:'fixed',bottom:0,left:0,right:0,background:'white',borderTop:'1.5px solid #fce7f3',display:'flex',zIndex:20,boxShadow:'0 -2px 12px rgba(0,0,0,.07)' }}>
        {([
          { id:'products',   icon:'👗', label:'Products' },
          { id:'orders',     icon:'📦', label:'Orders' },
          { id:'categories', icon:'🏷️', label:'Categories' },
        ] as {id:'products'|'orders'|'categories';icon:string;label:string}[]).map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{ flex:1,padding:'.75rem .5rem .5rem',border:'none',background:'none',cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:'.15rem',position:'relative' }}>
            <span style={{ fontSize:'1.3rem' }}>{n.icon}</span>
            <span style={{ fontSize:'.68rem',fontWeight:700,color:tab===n.id?'#9d174d':'#9ca3af' }}>{n.label}</span>
            {tab===n.id && <div style={{ position:'absolute',bottom:0,left:'50%',transform:'translateX(-50%)',width:'2rem',height:'2.5px',background:'#9d174d',borderRadius:'2px' }} />}
          </button>
        ))}
        <a href="/admin/scan" style={{ flex:1,padding:'.75rem .5rem .5rem',textDecoration:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'.15rem' }}>
          <span style={{ fontSize:'1.3rem' }}>📷</span>
          <span style={{ fontSize:'.68rem',fontWeight:700,color:'#9ca3af' }}>Scan</span>
        </a>
        <a href="/admin/import" style={{ flex:1,padding:'.75rem .5rem .5rem',textDecoration:'none',display:'flex',flexDirection:'column',alignItems:'center',gap:'.15rem' }}>
          <span style={{ fontSize:'1.3rem' }}>📥</span>
          <span style={{ fontSize:'.68rem',fontWeight:700,color:'#9ca3af' }}>Import</span>
        </a>
      </nav>
    </main>
  );
}
