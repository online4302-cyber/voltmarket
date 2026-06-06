import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ShoppingCart, Package, LayoutDashboard, ClipboardList, Boxes, Store,
  Plus, Pencil, Trash2, X, Search, AlertTriangle, Clock, Truck, CheckCircle2,
  Lock, ArrowLeft, Minus, DollarSign, Upload, ImageIcon, Tag, Sparkles, LogOut, Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import * as db from "./lib/db";

/* ---------------------------------- theme --------------------------------- */
const T = {
  bg: "#0B0E14", panel: "#131823", panel2: "#0F1420", border: "#232B3A",
  text: "#E6E9EF", muted: "#8A93A6", faint: "#5A6378",
  accent: "#4D8DFF", accentDim: "#1c3a6e", green: "#34D399", red: "#F87171", amber: "#FBBF24",
};
const LOW_STOCK = 5;
const GRADES = ["Like New", "Excellent", "Good", "Fair"];
const CATEGORIES = ["Fridges & Freezers", "Washing & Drying", "TVs", "Computers", "Phones", "Audio", "Cameras", "Kitchen", "Other"];
const KIND_BY_CAT = { "Fridges & Freezers": "fridge", "Washing & Drying": "washer", TVs: "tv", Computers: "laptop", Phones: "phone", Audio: "speaker", Cameras: "camera", Kitchen: "microwave" };

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
*{box-sizing:border-box;}
body{margin:0;}
::-webkit-scrollbar{width:10px;height:10px;}
::-webkit-scrollbar-thumb{background:#232B3A;border-radius:8px;}
@keyframes vm-pop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;transform:none;}}
@keyframes vm-slide{from{transform:translateX(100%);}to{transform:none;}}
@keyframes vm-fade{from{opacity:0;}to{opacity:1;}}
@keyframes vm-spin{to{transform:rotate(360deg);}}
`;
const money = (n) => "£" + (Number(n) || 0).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ------------------------- product illustrations -------------------------- */
const svgURI = (inner) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1a2332'/><stop offset='1' stop-color='#0d1420'/></linearGradient></defs><rect width='400' height='300' fill='url(#g)'/>${inner}</svg>`);
const SHAPES = {
  fridge: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e' stroke-linejoin='round'><rect x='150' y='50' width='100' height='200' rx='10'/><line x1='150' y1='128' x2='250' y2='128'/><rect x='234' y='70' width='6' height='34' rx='3' fill='#6f93cf' stroke='none'/><rect x='234' y='150' width='6' height='46' rx='3' fill='#6f93cf' stroke='none'/></g>`,
  tv: `<g stroke='#6f93cf' stroke-width='3' fill='#0c1424'><rect x='108' y='72' width='184' height='112' rx='8'/><rect x='150' y='184' width='100' height='10' rx='3' fill='#6f93cf' stroke='none'/><rect x='184' y='194' width='32' height='16' fill='#6f93cf' stroke='none'/></g>`,
  laptop: `<g stroke='#6f93cf' stroke-width='3' fill='#0c1424' stroke-linejoin='round'><rect x='138' y='88' width='124' height='82' rx='6'/><path d='M118 185 L282 185 L298 207 L102 207 Z' fill='#101a2c'/></g>`,
  phone: `<g stroke='#6f93cf' stroke-width='3' fill='#0c1424'><rect x='164' y='58' width='72' height='184' rx='15'/><rect x='184' y='66' width='32' height='6' rx='3' fill='#6f93cf' stroke='none'/><circle cx='200' cy='230' r='6' fill='none'/></g>`,
  washer: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e'><rect x='150' y='62' width='100' height='176' rx='10'/><circle cx='200' cy='162' r='40'/><circle cx='200' cy='162' r='23' fill='#0c1424'/><circle cx='226' cy='86' r='5' fill='#6f93cf' stroke='none'/></g>`,
  microwave: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e'><rect x='118' y='98' width='164' height='104' rx='8'/><rect x='133' y='113' width='96' height='74' rx='5' fill='#0c1424'/><rect x='244' y='113' width='24' height='74' rx='4' fill='#0c1424'/></g>`,
  speaker: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e'><rect x='160' y='66' width='80' height='168' rx='14'/><circle cx='200' cy='114' r='18' fill='#0c1424'/><circle cx='200' cy='182' r='29' fill='#0c1424'/></g>`,
  camera: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e' stroke-linejoin='round'><rect x='118' y='114' width='164' height='98' rx='10'/><rect x='173' y='98' width='54' height='20' rx='5'/><circle cx='200' cy='164' r='35'/><circle cx='200' cy='164' r='18' fill='#0c1424'/></g>`,
  generic: `<g stroke='#6f93cf' stroke-width='3' fill='#141d2e'><rect x='138' y='88' width='124' height='124' rx='12'/><circle cx='200' cy='150' r='30' fill='#0c1424'/></g>`,
};
const illustration = (kind) => svgURI(SHAPES[kind] || SHAPES.generic);
const mainImage = (p) => (p.images && p.images[0]) || illustration(p.kind);

/* -------------------------------- toast ----------------------------------- */
function useToasts() {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setItems((s) => [...s, { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 3000);
  }, []);
  const node = (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 200, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((t) => (
        <div key={t.id} style={{ animation: "vm-pop .25s ease", background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${t.kind === "warn" ? T.amber : t.kind === "err" ? T.red : T.green}`, color: T.text, padding: "12px 16px", borderRadius: 10, fontSize: 14, minWidth: 240, maxWidth: 340, boxShadow: "0 10px 30px rgba(0,0,0,.5)", fontFamily: "Manrope" }}>{t.msg}</div>
      ))}
    </div>
  );
  return [push, node];
}
const Spin = ({ size = 16 }) => <Loader2 size={size} style={{ animation: "vm-spin 1s linear infinite" }} />;

/* =============================== MAIN APP ================================== */
export default function VoltMarket() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [view, setView] = useState("store");
  const [loading, setLoading] = useState(true);
  const [pushToast, toastNode] = useToasts();

  const reloadProducts = useCallback(async () => {
    try { setProducts(await db.listProducts()); }
    catch (e) { pushToast("Could not load products — check Supabase setup", "err"); console.error(e); }
  }, [pushToast]);

  useEffect(() => { (async () => { await reloadProducts(); setLoading(false); })(); }, [reloadProducts]);

  const placeOrder = useCallback(async (cart, customer) => {
    const res = await db.placeOrder(customer, cart);
    await reloadProducts();
    return { id: res.code || res.id, total: res.total };
  }, [reloadProducts]);

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "Manrope" }}>
      <style>{FONTS}</style>
      {toastNode}
      <TopBar view={view} setView={setView} />
      {loading ? (
        <div style={{ display: "grid", placeItems: "center", minHeight: 480, color: T.muted }}>
          <div style={{ textAlign: "center" }}><Spin size={28} /><div style={{ marginTop: 10 }}>Connecting to your store…</div></div>
        </div>
      ) : view === "store" ? (
        <Storefront products={products} placeOrder={placeOrder} pushToast={pushToast} />
      ) : (
        <Admin products={products} reloadProducts={reloadProducts} orders={orders} setOrders={setOrders} setProducts={setProducts} pushToast={pushToast} />
      )}
    </div>
  );
}

function TopBar({ view, setView }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: `1px solid ${T.border}`, background: T.panel2, position: "sticky", top: 0, zIndex: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accent, display: "grid", placeItems: "center", fontSize: 18 }}>⚡</div>
        <div><span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 19, letterSpacing: -0.5 }}>VoltMarket</span><span style={{ color: T.faint, fontSize: 12, marginLeft: 8 }}>New &amp; Used Electronics</span></div>
      </div>
      <div style={{ display: "flex", background: T.panel, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
        {[["store", "Shop", Store], ["admin", "Admin", LayoutDashboard]].map(([k, label, Icon]) => (
          <button key={k} onClick={() => setView(k)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer", background: view === k ? T.accent : "transparent", color: view === k ? "#fff" : T.muted, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "Manrope" }}><Icon size={15} />{label}</button>
        ))}
      </div>
    </div>
  );
}

function ConditionBadge({ condition, grade, big }) {
  const isNew = condition === "new";
  const c = isNew ? T.green : T.amber;
  return <span style={{ fontSize: big ? 13 : 11.5, fontWeight: 600, color: c, border: `1px solid ${c}40`, background: `${c}14`, padding: big ? "5px 11px" : "3px 8px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 5 }}>{isNew ? <Sparkles size={big ? 13 : 11} /> : <Tag size={big ? 13 : 11} />}{isNew ? "New" : `Used · ${grade || "Good"}`}</span>;
}
function StockBadge({ stock }) {
  const out = stock === 0, low = stock > 0 && stock <= LOW_STOCK;
  const c = out ? T.red : low ? T.amber : T.green;
  return <span style={{ fontSize: 11.5, fontFamily: "JetBrains Mono", color: c, border: `1px solid ${c}40`, background: `${c}14`, padding: "3px 8px", borderRadius: 20 }}>{out ? "Sold out" : low ? `${stock} left` : "In stock"}</span>;
}

/* =============================== STOREFRONT =============================== */
function Storefront({ products, placeOrder, pushToast }) {
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [cond, setCond] = useState("all");
  const [detail, setDetail] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const cats = useMemo(() => ["All", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = products.filter((p) =>
    (cat === "All" || p.category === cat) && (cond === "all" || p.condition === cond) &&
    (p.name.toLowerCase().includes(q.toLowerCase()) || (p.category || "").toLowerCase().includes(q.toLowerCase())));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const addToCart = (p, qty = 1) => {
    const ex = cart.find((c) => c.id === p.id);
    if ((ex ? ex.qty : 0) + qty > p.stock) { pushToast("Not enough stock available", "warn"); return; }
    setCart((c) => ex ? c.map((x) => x.id === p.id ? { ...x, qty: x.qty + qty } : x) : [...c, { id: p.id, name: p.name, price: p.price, qty, img: mainImage(p) }]);
    pushToast(`Added ${p.name}`);
  };
  const setQty = (id, qty) => {
    const prod = products.find((p) => p.id === id);
    if (prod && qty > prod.stock) { pushToast("Exceeds available stock", "warn"); return; }
    setCart((c) => qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => x.id === id ? { ...x, qty } : x));
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <div style={{ background: `linear-gradient(120deg, ${T.accentDim}, ${T.panel})`, border: `1px solid ${T.border}`, borderRadius: 16, padding: "26px 30px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
        <div style={{ fontFamily: "Sora", fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Fridges, TVs, laptops &amp; more.</div>
        <div style={{ color: T.muted, marginTop: 6, maxWidth: 480 }}>New and quality-checked used electronics. Live stock, real photos, delivery across East London.</div>
        <div style={{ position: "absolute", right: -10, top: -16, fontSize: 120, opacity: .12 }}>🧊</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 200px" }}>
          <Search size={16} style={{ position: "absolute", left: 12, top: 11, color: T.faint }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" style={{ width: "100%", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 10, padding: "9px 12px 9px 36px", color: T.text, fontSize: 14, fontFamily: "Manrope", outline: "none" }} />
        </div>
        <div style={{ display: "flex", background: T.panel, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
          {[["all", "All"], ["new", "New"], ["used", "Used"]].map(([k, l]) => (
            <button key={k} onClick={() => setCond(k)} style={{ border: "none", cursor: "pointer", background: cond === k ? T.accent : "transparent", color: cond === k ? "#fff" : T.muted, padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "Manrope" }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} style={{ border: `1px solid ${cat === c ? T.accent : T.border}`, background: cat === c ? T.accentDim : "transparent", color: cat === c ? T.text : T.muted, padding: "7px 13px", borderRadius: 9, fontSize: 12.5, cursor: "pointer", fontWeight: 500, fontFamily: "Manrope" }}>{c}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 16 }}>
        {filtered.map((p) => {
          const out = p.stock === 0;
          return (
            <div key={p.id} onClick={() => setDetail(p)} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", animation: "vm-pop .3s ease", cursor: "pointer" }}>
              <div style={{ position: "relative", aspectRatio: "4/3", background: T.panel2, overflow: "hidden" }}>
                <img src={mainImage(p)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: out ? .45 : 1 }} />
                <div style={{ position: "absolute", top: 10, left: 10 }}><ConditionBadge condition={p.condition} grade={p.grade} /></div>
                {p.images && p.images.length > 1 && <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}><ImageIcon size={11} />{p.images.length}</div>}
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: "Sora", lineHeight: 1.25 }}>{p.name}</div>
                <div style={{ color: T.faint, fontSize: 12, margin: "3px 0 10px" }}>{p.category}</div>
                <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 18 }}>{money(p.price)}</div>
                  <StockBadge stock={p.stock} />
                </div>
                <button disabled={out} onClick={(e) => { e.stopPropagation(); addToCart(p); }} style={{ marginTop: 12, width: "100%", borderRadius: 9, padding: "9px 0", cursor: out ? "not-allowed" : "pointer", background: out ? T.panel2 : T.accent, color: out ? T.faint : "#fff", fontWeight: 600, fontSize: 13.5, fontFamily: "Manrope", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: out ? `1px solid ${T.border}` : "none" }}>{out ? "Sold out" : <><Plus size={15} /> Add to cart</>}</button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <div style={{ color: T.faint, padding: 40 }}>No products yet. Add some in the Admin area.</div>}
      </div>

      <button onClick={() => setCartOpen(true)} style={{ position: "fixed", right: 24, bottom: 24, zIndex: 50, background: T.accent, border: "none", color: "#fff", borderRadius: 14, padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 10px 30px rgba(77,141,255,.4)", fontWeight: 700, fontFamily: "Manrope" }}>
        <ShoppingCart size={18} /> Cart{cartCount > 0 && <span style={{ background: "#fff", color: T.accent, borderRadius: 20, padding: "1px 8px", fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{cartCount}</span>}
      </button>

      {detail && <ProductDetail p={detail} onClose={() => setDetail(null)} onAdd={(qty) => { addToCart(detail, qty); setDetail(null); }} />}
      {cartOpen && <CartDrawer cart={cart} cartTotal={cartTotal} setQty={setQty} onClose={() => setCartOpen(false)} onCheckout={async (customer) => { try { const ord = await placeOrder(cart, customer); setCart([]); setCartOpen(false); setConfirmation(ord); } catch (e) { pushToast(e.message || "Order failed", "err"); } }} />}
      {confirmation && (
        <Modal onClose={() => setConfirmation(null)} width={420}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 30, background: T.accentDim, color: T.green, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><CheckCircle2 size={30} /></div>
            <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 20 }}>Order placed!</div>
            <div style={{ color: T.muted, marginTop: 6 }}>Order <b style={{ fontFamily: "JetBrains Mono", color: T.text }}>{confirmation.id}</b> · {money(confirmation.total)}</div>
            <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>Saved to your database. Track it in Admin → Orders.</div>
            <button onClick={() => setConfirmation(null)} style={{ marginTop: 18, background: T.accent, border: "none", color: "#fff", padding: "10px 26px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontFamily: "Manrope" }}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductDetail({ p, onClose, onAdd }) {
  const imgs = (p.images && p.images.length ? p.images : [illustration(p.kind)]);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const out = p.stock === 0;
  return (
    <Modal onClose={onClose} width={760}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div>
          <div style={{ aspectRatio: "4/3", background: T.panel2, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <img src={imgs[active]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {imgs.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {imgs.map((src, i) => <img key={i} src={src} onClick={() => setActive(i)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `2px solid ${i === active ? T.accent : T.border}` }} />)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}><ConditionBadge condition={p.condition} grade={p.grade} big /><StockBadge stock={p.stock} /></div>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 23, lineHeight: 1.2 }}>{p.name}</div>
          <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>{p.category} · SKU {p.sku}</div>
          <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 30, margin: "14px 0" }}>{money(p.price)}</div>
          <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>{p.desc}</div>
          {!out && (
            <div style={{ marginTop: "auto", paddingTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>Qty</span>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}><Minus size={13} /></button>
                <span style={{ fontFamily: "JetBrains Mono", minWidth: 18, textAlign: "center" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(p.stock, qty + 1))} style={qtyBtn}><Plus size={13} /></button>
              </div>
              <button onClick={() => onAdd(qty)} style={primaryBtn}>Add {qty} to cart · {money(p.price * qty)}</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CartDrawer({ cart, cartTotal, setQty, onClose, onCheckout }) {
  const [step, setStep] = useState("cart");
  const [form, setForm] = useState({ name: "", email: "", address: "" });
  const [busy, setBusy] = useState(false);
  const valid = form.name && form.email && form.address;
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 99, animation: "vm-fade .2s" }} />
      <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 380, maxWidth: "92vw", background: T.panel2, borderLeft: `1px solid ${T.border}`, zIndex: 100, display: "flex", flexDirection: "column", animation: "vm-slide .28s ease" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {step === "checkout" && <button onClick={() => setStep("cart")} style={iconBtn}><ArrowLeft size={18} /></button>}
            <span style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 17 }}>{step === "cart" ? "Your Cart" : "Checkout"}</span>
          </div>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {cart.length === 0 ? <div style={{ color: T.faint, textAlign: "center", marginTop: 60 }}><ShoppingCart size={32} style={{ opacity: .4 }} /><div style={{ marginTop: 10 }}>Your cart is empty</div></div>
            : step === "cart" ? cart.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <img src={c.img} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.border}` }} />
                <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div><div style={{ color: T.muted, fontSize: 13, fontFamily: "JetBrains Mono" }}>{money(c.price)}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => setQty(c.id, c.qty - 1)} style={qtyBtn}><Minus size={13} /></button>
                  <span style={{ fontFamily: "JetBrains Mono", minWidth: 18, textAlign: "center" }}>{c.qty}</span>
                  <button onClick={() => setQty(c.id, c.qty + 1)} style={qtyBtn}><Plus size={13} /></button>
                </div>
              </div>
            )) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {["name", "email", "address"].map((f) => (
                  <div key={f}><label style={lbl}>{f[0].toUpperCase() + f.slice(1)}</label>
                    <input value={form[f]} onChange={(e) => setForm({ ...form, [f]: e.target.value })} placeholder={f === "email" ? "you@email.com" : f === "address" ? "Delivery address" : "Full name"} style={inp} /></div>
                ))}
              </div>
            )}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: 18, borderTop: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}><span style={{ color: T.muted }}>Total</span><span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 20 }}>{money(cartTotal)}</span></div>
            {step === "cart" ? <button onClick={() => setStep("checkout")} style={primaryBtn}>Checkout</button>
              : <button disabled={!valid || busy} onClick={async () => { setBusy(true); await onCheckout(form); setBusy(false); }} style={{ ...primaryBtn, opacity: valid && !busy ? 1 : .5, cursor: valid && !busy ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{busy ? <><Spin /> Placing…</> : `Place order · ${money(cartTotal)}`}</button>}
          </div>
        )}
      </div>
    </>
  );
}

/* ================================= ADMIN ================================== */
function Admin({ products, reloadProducts, orders, setOrders, setProducts, pushToast }) {
  const [session, setSession] = useState(undefined); // undefined = checking
  const [tab, setTab] = useState("dashboard");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { db.getSession().then(setSession); }, []);
  useEffect(() => { if (session) db.listOrders().then(setOrders).catch(() => {}); }, [session, setOrders]);

  if (session === undefined) return <div style={{ display: "grid", placeItems: "center", minHeight: 480, color: T.muted }}><Spin size={26} /></div>;

  if (!session) return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 560, padding: 20 }}>
      <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, width: 340, animation: "vm-pop .3s" }}>
        <div style={{ width: 50, height: 50, borderRadius: 25, background: T.accentDim, color: T.accent, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Lock size={22} /></div>
        <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 19, textAlign: "center" }}>Admin Login</div>
        <div style={{ color: T.faint, fontSize: 12.5, margin: "6px 0 18px", textAlign: "center" }}>Use the admin account you created in Supabase → Authentication.</div>
        <label style={lbl}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" style={inp} />
        <div style={{ height: 10 }} />
        <label style={lbl}>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} style={inp} />
        <button onClick={doLogin} disabled={busy} style={{ ...primaryBtn, marginTop: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>{busy ? <><Spin /> Signing in…</> : "Sign in"}</button>
      </div>
    </div>
  );

  async function doLogin() {
    setBusy(true);
    try { const s = await db.signIn(email, pw); setSession(s); }
    catch (e) { pushToast(e.message || "Login failed", "err"); }
    finally { setBusy(false); }
  }

  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", Package], ["orders", "Orders", ClipboardList], ["inventory", "Inventory", Boxes]];
  return (
    <div style={{ display: "flex", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ width: 200, borderRight: `1px solid ${T.border}`, background: T.panel2, padding: 14, display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} style={{ display: "flex", alignItems: "center", gap: 10, border: "none", cursor: "pointer", textAlign: "left", background: tab === k ? T.accentDim : "transparent", color: tab === k ? T.text : T.muted, padding: "10px 12px", borderRadius: 9, fontSize: 14, fontWeight: 600, fontFamily: "Manrope" }}><Icon size={17} />{label}</button>
        ))}
        <button onClick={async () => { await db.signOut(); setSession(null); }} style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer", background: "transparent", color: T.faint, padding: "10px 12px", borderRadius: 9, fontSize: 13, fontFamily: "Manrope" }}><LogOut size={15} />Sign out</button>
      </div>
      <div style={{ flex: 1, padding: 24, overflowY: "auto" }}>
        {tab === "dashboard" && <Dashboard products={products} orders={orders} setTab={setTab} />}
        {tab === "products" && <ProductsAdmin products={products} reloadProducts={reloadProducts} pushToast={pushToast} />}
        {tab === "orders" && <OrdersAdmin orders={orders} setOrders={setOrders} pushToast={pushToast} />}
        {tab === "inventory" && <Inventory products={products} setProducts={setProducts} pushToast={pushToast} />}
      </div>
    </div>
  );
}

function Dashboard({ products, orders, setTab }) {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK);
  const usedCount = products.filter((p) => p.condition === "used").length;
  const byCat = useMemo(() => {
    const m = {}; products.forEach((p) => { const k = (p.category || "Other").split(" ")[0]; m[k] = (m[k] || 0) + p.price * p.stock; });
    return Object.entries(m).map(([category, value]) => ({ category, value: Math.round(value) }));
  }, [products]);
  const kpis = [
    { label: "Revenue", val: money(revenue), icon: DollarSign, c: T.green },
    { label: "Orders", val: orders.length, icon: ClipboardList, c: T.accent },
    { label: "Listings", val: products.length, icon: Package, c: T.amber },
    { label: "Used items", val: usedCount, icon: Tag, c: "#A78BFA" },
  ];
  return (
    <div style={{ animation: "vm-pop .3s" }}>
      <h2 style={h2}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 14, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><span style={{ color: T.muted, fontSize: 13 }}>{k.label}</span><k.icon size={18} style={{ color: k.c }} /></div>
            <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 24, marginTop: 8 }}>{k.val}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ fontWeight: 700, fontFamily: "Sora", marginBottom: 14 }}>Stock value by category</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCat}>
              <XAxis dataKey="category" tick={{ fill: T.faint, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
              <YAxis tick={{ fill: T.faint, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#ffffff08" }} contentStyle={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} formatter={(v) => money(v)} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{byCat.map((_, i) => <Cell key={i} fill={T.accent} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><span style={{ fontWeight: 700, fontFamily: "Sora" }}>Low stock alerts</span><AlertTriangle size={16} style={{ color: T.amber }} /></div>
          {lowStock.length === 0 ? <div style={{ color: T.faint, fontSize: 13 }}>All products well stocked ✓</div>
            : lowStock.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${T.border}`, fontSize: 13.5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={mainImage(p)} alt="" style={{ width: 26, height: 26, borderRadius: 6, objectFit: "cover" }} />{p.name}</span><StockBadge stock={p.stock} />
              </div>
            ))}
          <button onClick={() => setTab("inventory")} style={{ ...ghostBtn, marginTop: 12, width: "100%" }}>Manage inventory →</button>
        </div>
      </div>
    </div>
  );
}

function ProductsAdmin({ products, reloadProducts, pushToast }) {
  const [editing, setEditing] = useState(null);
  const blank = { name: "", category: CATEGORIES[0], kind: "fridge", sku: "", price: "", cost: "", stock: "", condition: "new", grade: "Good", images: [], desc: "" };
  const save = async (p) => {
    if (!p.name || !p.price) { pushToast("Name and price required", "warn"); return; }
    const payload = { ...p, kind: KIND_BY_CAT[p.category] || "generic" };
    try {
      if (p.id) { await db.updateProduct(p.id, payload); pushToast("Product updated"); }
      else { await db.createProduct(payload); pushToast("Product added"); }
      setEditing(null); await reloadProducts();
    } catch (e) { pushToast(e.message || "Save failed", "err"); }
  };
  const del = async (id) => { try { await db.deleteProduct(id); pushToast("Product deleted", "err"); await reloadProducts(); } catch (e) { pushToast(e.message, "err"); } };
  return (
    <div style={{ animation: "vm-pop .3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ ...h2, margin: 0 }}>Products</h2>
        <button onClick={() => setEditing(blank)} style={primaryBtnSm}><Plus size={16} /> Add product</button>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ color: T.muted, textAlign: "left", fontSize: 12 }}>{["Product", "Condition", "Price", "Stock", "Margin", ""].map((h, i) => <th key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src={mainImage(p)} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", border: `1px solid ${T.border}` }} /><div>{p.name}<div style={{ color: T.faint, fontSize: 12 }}>{p.category}</div></div></div></td>
                <td style={td}><ConditionBadge condition={p.condition} grade={p.grade} /></td>
                <td style={{ ...td, fontFamily: "JetBrains Mono" }}>{money(p.price)}</td>
                <td style={td}><StockBadge stock={p.stock} /></td>
                <td style={{ ...td, fontFamily: "JetBrains Mono", color: T.green }}>{p.price ? Math.round((1 - p.cost / p.price) * 100) : 0}%</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => setEditing(p)} style={iconBtnSm}><Pencil size={15} /></button>
                  <button onClick={() => del(p.id)} style={{ ...iconBtnSm, color: T.red }}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal onClose={() => setEditing(null)} width={520}>
          <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{editing.id ? "Edit product" : "New product"}</div>
          <ProductForm p={editing} onChange={setEditing} pushToast={pushToast} />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setEditing(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
            <button onClick={() => save(editing)} style={{ ...primaryBtn, flex: 1 }}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ p, onChange, pushToast }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const f = (k, v) => onChange({ ...p, [k]: v });
  const field = (k, label, type = "text", ph = "") => (
    <div style={{ flex: 1 }}><label style={lbl}>{label}</label><input type={type} value={p[k]} placeholder={ph} onChange={(e) => f(k, e.target.value)} style={inp} /></div>
  );
  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6 - (p.images?.length || 0));
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) urls.push(await db.uploadImage(file));
      onChange({ ...p, images: [...(p.images || []), ...urls] });
      pushToast(`Uploaded ${urls.length} photo${urls.length > 1 ? "s" : ""}`);
    } catch (err) { pushToast(err.message || "Upload failed", "err"); }
    finally { setUploading(false); e.target.value = ""; }
  };
  const removeImg = (i) => onChange({ ...p, images: p.images.filter((_, idx) => idx !== i) });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={lbl}>Photos <span style={{ color: T.faint }}>(first = main, up to 6)</span></label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
          {(p.images || []).map((src, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={src} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `2px solid ${i === 0 ? T.accent : T.border}` }} />
              <button onClick={() => removeImg(i)} style={{ position: "absolute", top: -6, right: -6, background: T.red, border: "none", color: "#fff", width: 20, height: 20, borderRadius: 10, cursor: "pointer", display: "grid", placeItems: "center" }}><X size={12} /></button>
            </div>
          ))}
          {(p.images?.length || 0) < 6 && (
            <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: 64, height: 64, borderRadius: 8, border: `1.5px dashed ${T.border}`, background: T.panel2, color: T.muted, cursor: "pointer", display: "grid", placeItems: "center" }}>{uploading ? <Spin size={18} /> : <Upload size={18} />}</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: "none" }} />
        </div>
      </div>
      {field("name", "Name", "text", "e.g. Bosch Larder Fridge")}
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Category</label><select value={p.category} onChange={(e) => f("category", e.target.value)} style={inp}>{CATEGORIES.map((c) => <option key={c} value={c} style={{ background: T.panel }}>{c}</option>)}</select></div>
        {field("sku", "SKU (optional)")}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Condition</label><select value={p.condition} onChange={(e) => f("condition", e.target.value)} style={inp}><option value="new" style={{ background: T.panel }}>New</option><option value="used" style={{ background: T.panel }}>Used</option></select></div>
        {p.condition === "used" && <div style={{ flex: 1 }}><label style={lbl}>Grade</label><select value={p.grade} onChange={(e) => f("grade", e.target.value)} style={inp}>{GRADES.map((g) => <option key={g} value={g} style={{ background: T.panel }}>{g}</option>)}</select></div>}
      </div>
      <div style={{ display: "flex", gap: 10 }}>{field("price", "Price (£)", "number")}{field("cost", "Cost (£)", "number")}{field("stock", "Stock", "number")}</div>
      <div><label style={lbl}>Description</label><textarea value={p.desc} onChange={(e) => f("desc", e.target.value)} rows={3} style={{ ...inp, resize: "vertical" }} /></div>
    </div>
  );
}

const STATUS_FLOW = ["pending", "processing", "shipped", "delivered"];
const STATUS_META = { pending: { c: T.amber, icon: Clock }, processing: { c: T.accent, icon: Package }, shipped: { c: "#A78BFA", icon: Truck }, delivered: { c: T.green, icon: CheckCircle2 } };
function OrdersAdmin({ orders, setOrders, pushToast }) {
  const advance = async (o) => {
    const i = STATUS_FLOW.indexOf(o.status); const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
    if (next === o.status) return;
    try { await db.advanceOrder(o.dbId, next); setOrders((prev) => prev.map((x) => x.dbId === o.dbId ? { ...x, status: next } : x)); pushToast(`${o.id} → ${next}`); }
    catch (e) { pushToast(e.message, "err"); }
  };
  return (
    <div style={{ animation: "vm-pop .3s" }}>
      <h2 style={h2}>Orders</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {orders.length === 0 && <div style={{ color: T.faint }}>No orders yet — place one from the shop.</div>}
        {orders.map((o) => {
          const M = STATUS_META[o.status] || STATUS_META.pending;
          return (
            <div key={o.dbId} style={{ ...card, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 160px" }}>
                <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700 }}>{o.id}</div>
                <div style={{ color: T.muted, fontSize: 13 }}>{o.customer} · {o.email}</div>
                <div style={{ color: T.faint, fontSize: 12 }}>{new Date(o.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{o.items?.length ? ` · ${o.items.reduce((s, i) => s + i.qty, 0)} items` : ""}</div>
              </div>
              <div style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: 18 }}>{money(o.total)}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: M.c, fontSize: 13, fontWeight: 600, border: `1px solid ${M.c}40`, background: `${M.c}14`, padding: "5px 11px", borderRadius: 20, textTransform: "capitalize" }}><M.icon size={14} />{o.status}</div>
              {o.status !== "delivered" && <button onClick={() => advance(o)} style={primaryBtnSm}>Advance →</button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Inventory({ products, setProducts, pushToast }) {
  const restock = async (id, amt) => {
    try { const ns = await db.adjustStock(id, amt); setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock: ns } : p)); pushToast(`Restocked +${amt}`); }
    catch (e) { pushToast(e.message, "err"); }
  };
  const sorted = [...products].sort((a, b) => a.stock - b.stock);
  return (
    <div style={{ animation: "vm-pop .3s" }}>
      <h2 style={h2}>Inventory</h2>
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ color: T.muted, textAlign: "left", fontSize: 12 }}>{["Product", "Status", "On hand", "Restock", "SKU"].map((h, i) => <th key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src={mainImage(p)} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover" }} />{p.name}</div></td>
                <td style={td}><StockBadge stock={p.stock} /></td>
                <td style={{ ...td, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{p.stock}</td>
                <td style={td}>{[5, 10, 25].map((n) => <button key={n} onClick={() => restock(p.id, n)} style={{ ...chipBtn, marginRight: 6 }}>+{n}</button>)}</td>
                <td style={{ ...td, color: T.faint, fontFamily: "JetBrains Mono" }}>{p.sku}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Modal({ children, onClose, width = 440 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 120, animation: "vm-fade .2s" }} />
      <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width, maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, zIndex: 121, animation: "vm-pop .25s ease", boxShadow: "0 24px 60px rgba(0,0,0,.5)" }}>{children}</div>
    </>
  );
}

/* --------------------------------- styles --------------------------------- */
const h2 = { fontFamily: "Sora", fontWeight: 700, fontSize: 22, marginBottom: 18 };
const card = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18 };
const td = { padding: "12px 14px", verticalAlign: "middle" };
const lbl = { fontSize: 12, color: T.muted };
const inp = { width: "100%", marginTop: 4, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px", color: T.text, fontSize: 14, fontFamily: "Manrope", outline: "none" };
const primaryBtn = { width: "100%", background: T.accent, border: "none", color: "#fff", padding: "11px 0", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "Manrope" };
const primaryBtnSm = { display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "Manrope" };
const ghostBtn = { background: "transparent", border: `1px solid ${T.border}`, color: T.muted, padding: "10px 0", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13.5, fontFamily: "Manrope" };
const iconBtn = { background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 4, display: "grid", placeItems: "center" };
const iconBtnSm = { background: "transparent", border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", padding: 6, borderRadius: 7, marginLeft: 6 };
const qtyBtn = { background: T.panel, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center" };
const chipBtn = { background: T.panel2, border: `1px solid ${T.border}`, color: T.accent, cursor: "pointer", padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontFamily: "JetBrains Mono", fontWeight: 700 };
