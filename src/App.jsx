import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ShoppingCart, Package, LayoutDashboard, ClipboardList, Boxes, Store,
  Plus, Pencil, Trash2, X, Search, AlertTriangle, Clock, Truck, CheckCircle2,
  Lock, ArrowLeft, Minus, DollarSign, Upload, ImageIcon, Tag, Sparkles, LogOut, Loader2,
  MapPin, Phone, Mail, MessageCircle, Wrench, ListTree, Star, SlidersHorizontal, ShieldCheck, Menu, ChevronDown, ChevronRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import * as db from "./lib/db";
import { SHOP, waLink, mailLink } from "./lib/config";

/* ---------------------------------- theme --------------------------------- */
const T = {
  bg: "#F4F7F7", panel: "#FFFFFF", panel2: "#EBF1F1", border: "#DEE7E6",
  text: "#0F2622", muted: "#5A6B67", faint: "#93A29E",
  accent: "#0E9488", accentDim: "#DBF0ED", green: "#16A34A", red: "#E0483D", amber: "#E8A300",
  ink: "#0B2E2A", // dark teal for header utility bar + footer
  shadow: "0 1px 2px rgba(15,38,34,.05), 0 8px 24px rgba(15,38,34,.07)",
};
const LOW_STOCK = 5;
const GRADES = ["Like New", "Excellent", "Good", "Fair"];
const KIND_OPTIONS = ["fridge", "washer", "tv", "laptop", "phone", "speaker", "camera", "microwave", "generic"];
// Fallback categories if the DB hasn't loaded any yet
const FALLBACK_CATEGORIES = ["Fridges & Freezers", "Washing & Drying", "TVs", "Computers", "Phones", "Audio", "Cameras", "Kitchen", "Other"];
const kindForCategory = (categories, name) => (categories.find((c) => c.name === name) || {}).kind || "generic";
// Group categories into departments (ordered by their smallest sort value)
function buildDepartments(categories) {
  const map = new Map();
  categories.forEach((c) => {
    const d = c.department || "Other";
    if (!map.has(d)) map.set(d, { name: d, subs: [], minSort: c.sort ?? 999 });
    const e = map.get(d);
    e.subs.push(c);
    e.minSort = Math.min(e.minSort, c.sort ?? 999);
  });
  const arr = [...map.values()];
  arr.forEach((d) => d.subs.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)));
  arr.sort((a, b) => a.minSort - b.minSort);
  return arr;
}

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
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'><defs>` +
  `<linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#FFFFFF'/><stop offset='1' stop-color='#E9EEEE'/></linearGradient>` +
  `<linearGradient id='mtl' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#FCFEFE'/><stop offset='.5' stop-color='#E7EDED'/><stop offset='1' stop-color='#D2DAD9'/></linearGradient>` +
  `<linearGradient id='glass' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#E4EBEA'/><stop offset='1' stop-color='#C4CECC'/></linearGradient>` +
  `</defs><rect width='400' height='300' fill='url(#bg)'/><ellipse cx='200' cy='264' rx='118' ry='13' fill='#0B2E2A' opacity='.06'/>${inner}</svg>`);
const SHAPES = {
  fridge: `<g stroke='#BFC9C7' stroke-width='2' stroke-linejoin='round'><rect x='150' y='44' width='100' height='210' rx='12' fill='url(#mtl)'/><line x1='150' y1='126' x2='250' y2='126'/><rect x='236' y='66' width='5' height='36' rx='2.5' fill='#A7B2AF' stroke='none'/><rect x='236' y='150' width='5' height='48' rx='2.5' fill='#A7B2AF' stroke='none'/></g>`,
  washer: `<g stroke='#BFC9C7' stroke-width='2'><rect x='148' y='54' width='104' height='196' rx='12' fill='url(#mtl)'/><rect x='162' y='68' width='78' height='12' rx='4' fill='#D3DBDA' stroke='none'/><circle cx='225' cy='74' r='3' fill='#A7B2AF' stroke='none'/><circle cx='200' cy='160' r='44' fill='#D7DEDD'/><circle cx='200' cy='160' r='30' fill='url(#glass)'/></g>`,
  microwave: `<g stroke='#BFC9C7' stroke-width='2'><rect x='110' y='92' width='180' height='112' rx='10' fill='url(#mtl)'/><rect x='124' y='106' width='118' height='84' rx='6' fill='url(#glass)'/><rect x='252' y='106' width='26' height='84' rx='5' fill='#DCE3E2' stroke='none'/><circle cx='265' cy='118' r='4' fill='#A7B2AF' stroke='none'/></g>`,
  generic: `<g stroke='#BFC9C7' stroke-width='2'><rect x='138' y='78' width='124' height='136' rx='14' fill='url(#mtl)'/><rect x='158' y='98' width='84' height='74' rx='8' fill='url(#glass)' stroke='none'/></g>`,
  tv: `<g stroke='#BFC9C7' stroke-width='2'><rect x='104' y='64' width='192' height='120' rx='8' fill='#2A3330'/><rect x='110' y='70' width='180' height='108' rx='4' fill='url(#glass)'/><rect x='178' y='186' width='44' height='10' fill='#C4CECC' stroke='none'/><rect x='150' y='196' width='100' height='8' rx='3' fill='#BFC9C7' stroke='none'/></g>`,
  laptop: `<g stroke='#BFC9C7' stroke-width='2' stroke-linejoin='round'><rect x='138' y='86' width='124' height='84' rx='6' fill='url(#glass)'/><path d='M118 184 L282 184 L298 206 L102 206 Z' fill='url(#mtl)'/></g>`,
  phone: `<g stroke='#BFC9C7' stroke-width='2'><rect x='164' y='56' width='72' height='186' rx='15' fill='url(#glass)'/><rect x='184' y='64' width='32' height='5' rx='2.5' fill='#A7B2AF' stroke='none'/></g>`,
  speaker: `<g stroke='#BFC9C7' stroke-width='2'><rect x='158' y='62' width='84' height='176' rx='14' fill='url(#mtl)'/><circle cx='200' cy='112' r='18' fill='#CFD7D6'/><circle cx='200' cy='184' r='30' fill='#CFD7D6'/></g>`,
  camera: `<g stroke='#BFC9C7' stroke-width='2' stroke-linejoin='round'><rect x='116' y='112' width='168' height='100' rx='10' fill='url(#mtl)'/><rect x='172' y='96' width='56' height='20' rx='5' fill='url(#mtl)'/><circle cx='200' cy='164' r='36' fill='#CFD7D6'/><circle cx='200' cy='164' r='20' fill='url(#glass)'/></g>`,
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
        <div key={t.id} style={{ animation: "vm-pop .25s ease", background: T.panel, border: `1px solid ${T.border}`, borderLeft: `3px solid ${t.kind === "warn" ? T.amber : t.kind === "err" ? T.red : T.green}`, color: T.text, padding: "12px 16px", borderRadius: 10, fontSize: 14, minWidth: 240, maxWidth: 340, boxShadow: "0 8px 28px rgba(20,48,90,.14)", fontFamily: "Manrope" }}>{t.msg}</div>
      ))}
    </div>
  );
  return [push, node];
}
const Spin = ({ size = 16 }) => <Loader2 size={size} style={{ animation: "vm-spin 1s linear infinite" }} />;

function useIsMobile(bp = 640) {
  const [m, setM] = useState(typeof window !== "undefined" && window.innerWidth <= bp);
  useEffect(() => {
    const onR = () => setM(window.innerWidth <= bp);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [bp]);
  return m;
}

/* =============================== MAIN APP ================================== */
export default function ZAAppliances() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [view, setView] = useState("store");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("All");
  const [cat, setCat] = useState("All");
  const [loading, setLoading] = useState(true);
  const [pushToast, toastNode] = useToasts();

  const reloadProducts = useCallback(async () => {
    try { setProducts(await db.listProducts()); }
    catch (e) { pushToast("Could not load products — check Supabase setup", "err"); console.error(e); }
  }, [pushToast]);
  const reloadCategories = useCallback(async () => {
    try { setCategories(await db.listCategories()); } catch (e) { console.error(e); }
  }, []);
  const reloadReviews = useCallback(async () => {
    try { setReviews(await db.listReviews()); } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { (async () => { await Promise.all([reloadProducts(), reloadCategories(), reloadReviews()]); setLoading(false); })(); }, [reloadProducts, reloadCategories, reloadReviews]);

  const placeOrder = useCallback(async (cart, customer) => {
    const res = await db.placeOrder(customer, cart);
    await reloadProducts();
    return { id: res.code || res.id, total: res.total };
  }, [reloadProducts]);

  return (
    <div style={{ background: T.bg, color: T.text, minHeight: "100vh", fontFamily: "Manrope" }}>
      <style>{FONTS}</style>
      {toastNode}
      {loading ? (
        <>
          <SiteHeader view={view} setView={setView} q={q} setQ={setQ} dept={dept} setDept={setDept} cat={cat} setCat={setCat} categories={categories} cartCount={0} onCartClick={() => {}} />
          <div style={{ display: "grid", placeItems: "center", minHeight: 360, color: T.muted }}>
            <div style={{ textAlign: "center" }}><Spin size={28} /><div style={{ marginTop: 10 }}>Loading the shop…</div></div>
          </div>
        </>
      ) : view === "store" ? (
        <Storefront products={products} categories={categories} reviews={reviews} reloadReviews={reloadReviews}
          placeOrder={placeOrder} pushToast={pushToast} q={q} setQ={setQ} dept={dept} setDept={setDept} cat={cat} setCat={setCat} setView={setView} />
      ) : view === "contact" ? (
        <>
          <SiteHeader view={view} setView={setView} q={q} setQ={setQ} dept={dept} setDept={setDept} cat={cat} setCat={setCat} categories={categories} cartCount={0} onCartClick={() => { setDept("All"); setCat("All"); setView("store"); }} />
          <ContactPage />
          <SiteFooter setView={setView} setDept={setDept} setCat={setCat} categories={categories} />
        </>
      ) : (
        <>
          <AdminTopBar setView={setView} />
          <Admin products={products} reloadProducts={reloadProducts} categories={categories} reloadCategories={reloadCategories}
            orders={orders} setOrders={setOrders} setProducts={setProducts} pushToast={pushToast} />
        </>
      )}
    </div>
  );
}

/* rating helpers + small star components */
const onSale = (p) => p.salePrice != null && p.salePrice > 0 && p.salePrice < p.price;
const effPrice = (p) => (onSale(p) ? p.salePrice : p.price);
const savePct = (p) => Math.round((1 - p.salePrice / p.price) * 100);
function Price({ p, size = 18 }) {
  if (!onSale(p)) return <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: size }}>{money(p.price)}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
      <span style={{ fontFamily: "JetBrains Mono", fontWeight: 700, fontSize: size, color: T.red }}>{money(p.salePrice)}</span>
      <span style={{ fontFamily: "JetBrains Mono", fontSize: size * 0.72, color: T.faint, textDecoration: "line-through" }}>{money(p.price)}</span>
    </span>
  );
}
const reviewStats = (reviews, productId) => {
  const rs = reviews.filter((r) => r.product_id === productId);
  if (!rs.length) return { avg: 0, count: 0 };
  return { avg: rs.reduce((s, r) => s + r.rating, 0) / rs.length, count: rs.length };
};
function Stars({ value = 0, size = 14 }) {
  return (
    <span style={{ display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} style={{ color: n <= Math.round(value) ? T.amber : T.faint }} fill={n <= Math.round(value) ? T.amber : "none"} />
      ))}
    </span>
  );
}
function StarInput({ value, onChange, size = 22 }) {
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0 }}>
          <Star size={size} style={{ color: n <= value ? T.amber : T.faint }} fill={n <= value ? T.amber : "none"} />
        </button>
      ))}
    </span>
  );
}
function DeliveryStrip({ mobile }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
      {SHOP.deliveryPerks.map(([title, detail], i) => (
        <div key={i} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Truck size={18} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
          <div><div style={{ fontWeight: 700, fontSize: 13.5 }}>{title}</div><div style={{ color: T.muted, fontSize: 12, lineHeight: 1.4 }}>{detail}</div></div>
        </div>
      ))}
    </div>
  );
}

function WhyChooseUs({ mobile }) {
  const items = [
    [Truck, "Free local delivery", "Across East London (E7 & nearby)"],
    [Wrench, "Repairs & installation", "We fit, connect and repair"],
    [ShieldCheck, "Warranty included", "Used items tested & warrantied"],
    [Tag, "New & used", "Quality-checked, fairly priced"],
  ];
  return (
    <section style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadow, padding: mobile ? "22px 16px" : "30px 24px", margin: "30px 0" }}>
      <h2 style={{ ...sectionH, textAlign: "center", marginBottom: 22 }}>Why choose {SHOP.name}?</h2>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: mobile ? 16 : 20 }}>
        {items.map(([Icon, title, sub], i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: 34, background: T.accentDim, display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon size={28} style={{ color: T.accent }} /></div>
            <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 14.5 }}>{title}</div>
            <div style={{ color: T.muted, fontSize: 12.5, marginTop: 4, lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SiteHeader({ view, setView, q, setQ, dept, cat, setDept, setCat, categories, cartCount, onCartClick }) {
  const mobile = useIsMobile();
  const departments = buildDepartments(categories);
  const [openDept, setOpenDept] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const goHome = () => { setDept("All"); setCat("All"); setView("store"); setMenuOpen(false); };
  const goDept = (d) => { setDept(d); setCat("All"); setView("store"); setOpenDept(null); setMenuOpen(false); };
  const goSub = (d, s) => { setDept(d); setCat(s); setView("store"); setOpenDept(null); setMenuOpen(false); };
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 45, boxShadow: "0 2px 12px rgba(20,48,90,.07)" }}>
      {!mobile && (
        <div style={{ background: T.ink, color: "#c7d2e0", fontSize: 12.5 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "7px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><MapPin size={13} /> {SHOP.address}</span>
            <span style={{ display: "flex", gap: 18, alignItems: "center" }}>
              <a href={`tel:${SHOP.phoneDisplay.replace(/\s/g, "")}`} style={{ color: "#c7d2e0", textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center" }}><Phone size={13} /> {SHOP.phoneDisplay}</a>
              <a href={waLink(`Hi ${SHOP.name},`)} target="_blank" rel="noreferrer" style={{ color: "#7ee2a3", textDecoration: "none", display: "inline-flex", gap: 6, alignItems: "center", fontWeight: 600 }}><MessageCircle size={13} /> WhatsApp us</a>
            </span>
          </div>
        </div>
      )}
      <div style={{ background: T.panel, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "10px 14px" : "12px 20px", display: "flex", alignItems: "center", gap: mobile ? 10 : 16 }}>
          {mobile && <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: T.text, padding: 0, display: "grid", placeItems: "center" }}><Menu size={24} /></button>}
          <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: T.accent, display: "grid", placeItems: "center", fontFamily: "Sora", fontWeight: 800, fontSize: 15, color: "#fff" }}>ZA</div>
            {!mobile && <div style={{ textAlign: "left" }}><div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, color: T.text, lineHeight: 1.1 }}>{SHOP.name}</div><div style={{ color: T.faint, fontSize: 11 }}>{SHOP.tagline}</div></div>}
          </button>
          <div style={{ flex: 1, position: "relative", maxWidth: 560 }}>
            <Search size={17} style={{ position: "absolute", left: 13, top: 12, color: T.faint }} />
            <input value={q} onChange={(e) => { setQ(e.target.value); setView("store"); setDept("All"); setCat("All"); }} placeholder={mobile ? "Search…" : "Search fridges, washers, hobs…"}
              style={{ width: "100%", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "11px 12px 11px 38px", color: T.text, fontSize: 14, fontFamily: "Manrope", outline: "none" }} />
          </div>
          {!mobile && <button onClick={() => setView("contact")} title="Contact" style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: view === "contact" ? T.accent : T.muted, fontWeight: 600, fontSize: 13.5, fontFamily: "Manrope", flexShrink: 0 }}><MapPin size={18} />Contact</button>}
          <button onClick={onCartClick} style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, background: T.accent, border: "none", cursor: "pointer", color: "#fff", fontWeight: 700, fontSize: 13.5, fontFamily: "Manrope", padding: mobile ? "9px 11px" : "10px 16px", borderRadius: 10, flexShrink: 0 }}>
            <ShoppingCart size={17} />{!mobile && "Cart"}
            {cartCount > 0 && <span style={{ background: "#fff", color: T.accent, borderRadius: 20, padding: "0 7px", fontSize: 11.5, fontFamily: "JetBrains Mono", fontWeight: 700 }}>{cartCount}</span>}
          </button>
        </div>
      </div>
      {/* desktop department mega-menu */}
      {!mobile && (
        <div style={{ background: T.panel, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 12px", display: "flex", gap: 2, position: "relative" }}>
            <button onClick={goHome} style={{ border: "none", background: "none", cursor: "pointer", padding: "14px 14px", fontSize: 12.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, color: dept === "All" && view === "store" ? T.accent : T.text, fontFamily: "Manrope" }}>Home</button>
            {departments.map((d) => {
              const on = view === "store" && dept === d.name;
              return (
                <div key={d.name} onMouseEnter={() => setOpenDept(d.name)} onMouseLeave={() => setOpenDept(null)} style={{ position: "relative" }}>
                  <button onClick={() => goDept(d.name)} style={{ border: "none", background: "none", cursor: "pointer", padding: "14px 14px", fontSize: 12.5, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 700, color: on ? T.accent : T.text, borderBottom: `3px solid ${on ? T.accent : "transparent"}`, fontFamily: "Manrope", display: "flex", alignItems: "center", gap: 4 }}>{d.name} <ChevronDown size={14} style={{ color: T.faint }} /></button>
                  {openDept === d.name && d.subs.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, minWidth: 220, background: T.panel, border: `1px solid ${T.border}`, borderRadius: "0 0 12px 12px", boxShadow: "0 12px 28px rgba(20,48,90,.16)", padding: 8, zIndex: 50 }}>
                      <button onClick={() => goDept(d.name)} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "8px 10px", fontSize: 13, fontWeight: 700, color: T.accent, fontFamily: "Manrope" }}>All {d.name}</button>
                      {d.subs.map((s) => (
                        <button key={s.id || s.name} onClick={() => goSub(d.name, s.name)} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "8px 10px", fontSize: 13.5, color: T.muted, fontFamily: "Manrope", borderRadius: 6 }} onMouseEnter={(e) => (e.currentTarget.style.background = T.panel2)} onMouseLeave={(e) => (e.currentTarget.style.background = "none")}>{s.name}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* mobile slide-in menu */}
      {mobile && menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 60, animation: "vm-fade .2s" }} />
          <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 280, maxWidth: "85vw", background: T.panel, zIndex: 61, overflowY: "auto", animation: "vm-slide .25s ease", boxShadow: "4px 0 24px rgba(0,0,0,.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ fontFamily: "Sora", fontWeight: 800 }}>Menu</span>
              <button onClick={() => setMenuOpen(false)} style={iconBtn}><X size={20} /></button>
            </div>
            <button onClick={goHome} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "13px 16px", fontSize: 15, fontWeight: 700, color: T.text, borderBottom: `1px solid ${T.border}`, fontFamily: "Manrope" }}>Home</button>
            {departments.map((d) => (
              <div key={d.name} style={{ borderBottom: `1px solid ${T.border}` }}>
                <button onClick={() => setOpenDept(openDept === d.name ? null : d.name)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", border: "none", background: "none", cursor: "pointer", padding: "13px 16px", fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "Manrope" }}>{d.name}<ChevronDown size={16} style={{ transform: openDept === d.name ? "rotate(180deg)" : "none", transition: ".2s" }} /></button>
                {openDept === d.name && (
                  <div style={{ background: T.panel2, paddingBottom: 6 }}>
                    <button onClick={() => goDept(d.name)} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "9px 26px", fontSize: 13.5, fontWeight: 700, color: T.accent, fontFamily: "Manrope" }}>All {d.name}</button>
                    {d.subs.map((s) => <button key={s.id || s.name} onClick={() => goSub(d.name, s.name)} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "9px 26px", fontSize: 13.5, color: T.muted, fontFamily: "Manrope" }}>{s.name}</button>)}
                  </div>
                )}
              </div>
            ))}
            <button onClick={() => { setView("contact"); setMenuOpen(false); }} style={{ width: "100%", textAlign: "left", border: "none", background: "none", cursor: "pointer", padding: "13px 16px", fontSize: 15, fontWeight: 700, color: T.text, fontFamily: "Manrope" }}>Contact</button>
          </div>
        </>
      )}
    </header>
  );
}

function CategoryTile({ title, sub, kind, image, onClick }) {
  return (
    <button onClick={onClick} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", cursor: "pointer", boxShadow: T.shadow, padding: 0, textAlign: "left", display: "flex", flexDirection: "column" }}>
      <div style={{ aspectRatio: "1/1", background: T.panel2, overflow: "hidden" }}><img src={image || illustration(kind)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
      <div style={{ padding: "13px 15px" }}>
        <div style={{ fontWeight: 700, fontFamily: "Sora", fontSize: 15.5, color: T.text }}>{title}</div>
        {sub && <div style={{ color: T.muted, fontSize: 12.5, marginTop: 2 }}>{sub}</div>}
      </div>
    </button>
  );
}

function Hero({ mobile, onShop }) {
  return (
    <div style={{ background: "linear-gradient(110deg, #0E9488 0%, #0B6E66 100%)", color: "#fff" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "30px 16px" : "48px 24px", display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.35fr 1fr", gap: 16, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,.18)", padding: "5px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, marginBottom: 14 }}>Sales · Repairs · Installation</div>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: mobile ? 27 : 42, lineHeight: 1.04, letterSpacing: -1 }}>New &amp; used appliances, fully checked.</div>
          <div style={{ marginTop: 12, fontSize: mobile ? 14.5 : 16.5, opacity: .93, maxWidth: 480, lineHeight: 1.5 }}>Fridges, washers, TVs and more — fair prices, free local delivery, and same-day repairs across East London.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
            <button onClick={onShop} style={{ background: "#fff", color: T.accent, fontWeight: 700, border: "none", borderRadius: 10, padding: "12px 24px", cursor: "pointer", fontSize: 15, fontFamily: "Manrope" }}>Shop now</button>
            <a href={waLink(`Hi ${SHOP.name}, I'd like to ask about a repair.`)} target="_blank" rel="noreferrer" style={{ background: "rgba(255,255,255,.14)", color: "#fff", border: "1px solid rgba(255,255,255,.45)", fontWeight: 700, borderRadius: 10, padding: "12px 22px", textDecoration: "none", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}><Wrench size={16} /> Book a repair</a>
          </div>
        </div>
        {!mobile && <div style={{ textAlign: "center", fontSize: 130, lineHeight: 1, filter: "drop-shadow(0 12px 24px rgba(0,0,0,.2))" }}>🧊</div>}
      </div>
    </div>
  );
}

function ProductCard({ p, reviews, onOpen, onAdd, mobile, width }) {
  const out = p.stock === 0;
  const rs = reviewStats(reviews, p.id);
  return (
    <div onClick={() => onOpen(p)} style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", animation: "vm-pop .3s ease", cursor: "pointer", boxShadow: T.shadow, width: width || "auto", flexShrink: width ? 0 : 1 }}>
      <div style={{ position: "relative", aspectRatio: "4/3", background: T.panel2, overflow: "hidden" }}>
        <img src={mainImage(p)} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: out ? .45 : 1 }} />
        <div style={{ position: "absolute", top: 10, left: 10 }}><ConditionBadge condition={p.condition} grade={p.grade} /></div>
        {onSale(p) && <div style={{ position: "absolute", top: 10, right: 10, background: T.red, color: "#fff", fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 20, fontFamily: "Manrope" }}>-{savePct(p)}%</div>}
        {p.images && p.images.length > 1 && <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, padding: "2px 7px", borderRadius: 20, display: "flex", alignItems: "center", gap: 4 }}><ImageIcon size={11} />{p.images.length}</div>}
      </div>
      <div style={{ padding: 14, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, fontFamily: "Sora", lineHeight: 1.25 }}>{p.name}</div>
        <div style={{ color: T.faint, fontSize: 12, margin: "3px 0 6px" }}>{p.category}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8, minHeight: 16 }}>
          {rs.count > 0 ? <><Stars value={rs.avg} size={12} /><span style={{ color: T.muted, fontSize: 11.5, fontFamily: "JetBrains Mono" }}>{rs.avg.toFixed(1)} ({rs.count})</span></>
            : <span style={{ color: T.faint, fontSize: 11.5 }}>No reviews yet</span>}
        </div>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
          <Price p={p} size={17} />
          <StockBadge stock={p.stock} />
        </div>
        <button disabled={out} onClick={(e) => { e.stopPropagation(); onAdd(p); }} style={{ marginTop: 12, width: "100%", borderRadius: 9, padding: "9px 0", cursor: out ? "not-allowed" : "pointer", background: out ? T.panel2 : T.accent, color: out ? T.faint : "#fff", fontWeight: 600, fontSize: 13.5, fontFamily: "Manrope", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: out ? `1px solid ${T.border}` : "none" }}>{out ? "Sold out" : <><Plus size={15} /> Add to cart</>}</button>
      </div>
    </div>
  );
}

function SiteFooter({ setView, setDept, setCat, categories }) {
  const mobile = useIsMobile();
  const departments = buildDepartments(categories);
  const colH = { color: "#fff", fontFamily: "Sora", fontWeight: 700, fontSize: 14, marginBottom: 12 };
  const fLink = { background: "none", border: "none", color: "#aeb9c8", cursor: "pointer", padding: "4px 0", fontSize: 13.5, fontFamily: "Manrope", textAlign: "left", textDecoration: "none", display: "block" };
  const goDept = (d) => { setDept(d); setCat("All"); setView("store"); };
  return (
    <footer style={{ background: T.ink, color: "#aeb9c8", marginTop: 44 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "30px 16px" : "44px 24px", display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "2fr 1fr 1.1fr 1.2fr", gap: mobile ? 24 : 32 }}>
        <div style={{ gridColumn: mobile ? "1 / -1" : "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: T.accent, display: "grid", placeItems: "center", fontFamily: "Sora", fontWeight: 800, fontSize: 14, color: "#fff" }}>ZA</div>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 17, color: "#fff" }}>{SHOP.legalName}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13.5 }}><MapPin size={15} /> {SHOP.address}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13.5 }}><Phone size={15} /> {SHOP.phoneDisplay}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13.5 }}><Mail size={15} /> {SHOP.email}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href={waLink(`Hi ${SHOP.name},`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#06210f", fontWeight: 700, padding: "8px 13px", borderRadius: 9, textDecoration: "none", fontSize: 13 }}><MessageCircle size={15} /> WhatsApp</a>
            <a href={SHOP.mapsLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(255,255,255,.25)", color: "#fff", fontWeight: 600, padding: "8px 13px", borderRadius: 9, textDecoration: "none", fontSize: 13 }}><MapPin size={15} /> Directions</a>
          </div>
        </div>
        <div>
          <div style={colH}>Shop</div>
          <button style={fLink} onClick={() => { setDept("All"); setCat("All"); setView("store"); }}>All products</button>
          {departments.map((d) => <button key={d.name} style={fLink} onClick={() => goDept(d.name)}>{d.name}</button>)}
        </div>
        <div>
          <div style={colH}>Customer service</div>
          <button style={fLink} onClick={() => setView("contact")}>Contact us</button>
          <a style={fLink} href={waLink(`Hi ${SHOP.name}, I'd like to book a repair. Appliance: `)} target="_blank" rel="noreferrer">Book a repair</a>
          <button style={fLink} onClick={() => setView("contact")}>Delivery & installation</button>
          <a style={fLink} href={SHOP.mapsLink} target="_blank" rel="noreferrer">Find our shop</a>
        </div>
        <div>
          <div style={colH}>Opening hours</div>
          {SHOP.hours.map(([d, h]) => <div key={d} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0" }}><span>{d}</span><span style={{ fontFamily: "JetBrains Mono", color: "#fff" }}>{h}</span></div>)}
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(255,255,255,.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, fontSize: 12.5 }}>
          <span>© {new Date().getFullYear()} {SHOP.legalName}. All rights reserved.</span>
          <button onClick={() => setView("admin")} style={{ background: "none", border: "none", color: "#7e8aa0", cursor: "pointer", fontSize: 12.5, fontFamily: "Manrope" }}>Staff login</button>
        </div>
      </div>
    </footer>
  );
}

function AdminTopBar({ setView }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, background: T.panel2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: T.accent, display: "grid", placeItems: "center", fontFamily: "Sora", fontWeight: 800, fontSize: 13, color: "#fff" }}>ZA</div>
        <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 16 }}>{SHOP.name} <span style={{ color: T.faint, fontWeight: 600, fontSize: 13 }}>· Admin</span></span>
      </div>
      <button onClick={() => setView("store")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, fontFamily: "Manrope" }}><ArrowLeft size={15} /> View shop</button>
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
function Storefront({ products, categories, reviews, reloadReviews, placeOrder, pushToast, q, setQ, dept, setDept, cat, setCat, setView }) {
  const mobile = useIsMobile();
  const shopRef = useRef(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cond, setCond] = useState("all");
  const [minP, setMinP] = useState("");
  const [maxP, setMaxP] = useState("");
  const [inStock, setInStock] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const catNames = categories.length ? categories.map((c) => c.name) : FALLBACK_CATEGORIES;
  const departments = buildDepartments(categories);
  const curDept = departments.find((d) => d.name === dept);
  const deptSubs = curDept ? curDept.subs.map((s) => s.name) : [];
  const inScope = (p) => cat !== "All" ? p.category === cat : (dept !== "All" ? deptSubs.includes(p.category) : true);
  const searching = q.trim().length > 0;
  const filtered = useMemo(() => {
    let list = products.filter((p) =>
      inScope(p) && (cond === "all" || p.condition === cond) &&
      (!inStock || p.stock > 0) && (!saleOnly || onSale(p)) &&
      (minP === "" || effPrice(p) >= Number(minP)) && (maxP === "" || effPrice(p) <= Number(maxP)) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) || (p.category || "").toLowerCase().includes(q.toLowerCase())));
    const rate = (p) => reviewStats(reviews, p.id).avg;
    if (sort === "price-asc") list = [...list].sort((a, b) => effPrice(a) - effPrice(b));
    else if (sort === "price-desc") list = [...list].sort((a, b) => effPrice(b) - effPrice(a));
    else if (sort === "rating") list = [...list].sort((a, b) => rate(b) - rate(a));
    return list;
  }, [products, reviews, dept, cat, cond, inStock, saleOnly, minP, maxP, q, sort]);
  const countInCat = (name) => products.filter((p) => p.category === name).length;
  const subImage = (name) => (products.find((p) => p.category === name && p.images && p.images.length) || {}).images?.[0];
  const deptImage = (d) => { const sub = d.subs.map((s) => s.name); return (products.find((p) => sub.includes(p.category) && p.images && p.images.length) || {}).images?.[0]; };
  const activeFilters = (cat !== "All" ? 1 : 0) + (cond !== "all" ? 1 : 0) + (inStock ? 1 : 0) + (saleOnly ? 1 : 0) + (minP !== "" || maxP !== "" ? 1 : 0);
  const clearFilters = () => { setCat("All"); setCond("all"); setInStock(false); setSaleOnly(false); setMinP(""); setMaxP(""); };
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const addToCart = (p, qty = 1) => {
    const ex = cart.find((c) => c.id === p.id);
    if ((ex ? ex.qty : 0) + qty > p.stock) { pushToast("Not enough stock available", "warn"); return; }
    setCart((c) => ex ? c.map((x) => x.id === p.id ? { ...x, qty: x.qty + qty } : x) : [...c, { id: p.id, name: p.name, price: effPrice(p), qty, img: mainImage(p) }]);
    pushToast(`Added ${p.name}`);
  };
  const setQty = (id, qty) => {
    const prod = products.find((p) => p.id === id);
    if (prod && qty > prod.stock) { pushToast("Exceeds available stock", "warn"); return; }
    setCart((c) => qty <= 0 ? c.filter((x) => x.id !== id) : c.map((x) => x.id === id ? { ...x, qty } : x));
  };
  const submitReview = async (productId, r) => {
    try { await db.addReview({ product_id: productId, ...r }); await reloadReviews(); pushToast("Thanks for your review!"); return true; }
    catch (e) { pushToast(e.message || "Could not submit review", "err"); return false; }
  };

  const FilterControls = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={filterHead}>Condition</div>
        <div style={{ display: "flex", background: T.panel2, borderRadius: 9, padding: 3, border: `1px solid ${T.border}` }}>
          {[["all", "All"], ["new", "New"], ["used", "Used"]].map(([k, l]) => (
            <button key={k} onClick={() => setCond(k)} style={{ flex: 1, border: "none", cursor: "pointer", background: cond === k ? T.accent : "transparent", color: cond === k ? "#fff" : T.muted, padding: "7px 0", borderRadius: 7, fontSize: 13, fontWeight: 600, fontFamily: "Manrope" }}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <div style={filterHead}>Price (£)</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={minP} onChange={(e) => setMinP(e.target.value)} placeholder="Min" style={{ ...inp, marginTop: 0 }} />
          <span style={{ color: T.faint }}>–</span>
          <input type="number" value={maxP} onChange={(e) => setMaxP(e.target.value)} placeholder="Max" style={{ ...inp, marginTop: 0 }} />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
        <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.accent }} />
        In stock only
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14, marginTop: -8 }}>
        <input type="checkbox" checked={saleOnly} onChange={(e) => setSaleOnly(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.red }} />
        On sale only
      </label>
      {activeFilters > 0 && <button onClick={clearFilters} style={{ ...ghostBtn, padding: "9px 0" }}>Clear filters</button>}
    </div>
  );

  const deals = products.filter(onSale).slice(0, 12);
  const mode = searching ? "search" : cat !== "All" ? "sub" : dept !== "All" ? "dept" : "home";
  const goDept = (d) => { setDept(d); setCat("All"); setQ(""); shopRef.current?.scrollIntoView({ behavior: "smooth" }); };
  const goSub = (s) => { const c = categories.find((x) => x.name === s); if (c) setDept(c.department || dept); setCat(s); setQ(""); shopRef.current?.scrollIntoView({ behavior: "smooth" }); };

  const Listing = () => (
    <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "230px 1fr", gap: 20, alignItems: "start" }}>
      {!mobile && <div style={{ ...card, padding: 16, position: "sticky", top: 152 }}><FilterControls /></div>}
      <div>
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ color: T.muted, fontSize: 13.5, marginRight: "auto" }}>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</div>
          {mobile && (
            <button onClick={() => setFiltersOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, background: T.panel, border: `1px solid ${T.border}`, color: T.text, padding: "9px 14px", borderRadius: 10, fontSize: 13.5, fontWeight: 600, fontFamily: "Manrope", cursor: "pointer" }}>
              <SlidersHorizontal size={15} /> Filters{activeFilters > 0 && <span style={{ background: T.accent, color: "#fff", borderRadius: 20, padding: "0 7px", fontSize: 11, fontFamily: "JetBrains Mono" }}>{activeFilters}</span>}
            </button>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ background: T.panel, border: `1px solid ${T.border}`, color: T.text, padding: "9px 12px", borderRadius: 10, fontSize: 13.5, fontFamily: "Manrope", outline: "none", cursor: "pointer" }}>
            <option value="featured">Sort: Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top rated</option>
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(220px, 1fr))", gap: mobile ? 10 : 16 }}>
          {filtered.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} onOpen={setDetail} onAdd={addToCart} mobile={mobile} />)}
          {filtered.length === 0 && <div style={{ color: T.faint, padding: 40, gridColumn: "1 / -1" }}>No products found.</div>}
        </div>
      </div>
    </div>
  );

  const Breadcrumb = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: T.muted, fontSize: 13, marginBottom: 14 }}>
      <button onClick={() => { setDept("All"); setCat("All"); setQ(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.muted, fontFamily: "Manrope", fontSize: 13, padding: 0 }}>Home</button>
      {dept !== "All" && <><ChevronRight size={13} /><button onClick={() => goDept(dept)} style={{ background: "none", border: "none", cursor: "pointer", color: cat === "All" ? T.text : T.muted, fontWeight: cat === "All" ? 700 : 400, fontFamily: "Manrope", fontSize: 13, padding: 0 }}>{dept}</button></>}
      {cat !== "All" && <><ChevronRight size={13} /><span style={{ color: T.text, fontWeight: 700 }}>{cat}</span></>}
      {searching && <><ChevronRight size={13} /><span style={{ color: T.text, fontWeight: 700 }}>Search: “{q}”</span></>}
    </div>
  );

  return (
    <>
      <SiteHeader view="store" setView={setView} q={q} setQ={setQ} dept={dept} setDept={setDept} cat={cat} setCat={setCat} categories={categories} cartCount={cartCount} onCartClick={() => setCartOpen(true)} />
      {mode === "home" && <Hero mobile={mobile} onShop={() => shopRef.current?.scrollIntoView({ behavior: "smooth" })} />}

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: mobile ? "18px 14px 30px" : "26px 24px 30px" }}>
        {mode === "home" && (
          <>
            <DeliveryStrip mobile={mobile} />
            {deals.length > 0 && (
              <section style={{ marginBottom: 30 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h2 style={sectionH}>🔥 Today's deals</h2>
                  <button onClick={() => { setSaleOnly(true); shopRef.current?.scrollIntoView({ behavior: "smooth" }); }} style={{ background: "none", border: "none", color: T.accent, fontWeight: 700, cursor: "pointer", fontSize: 13.5, fontFamily: "Manrope" }}>See all deals →</button>
                </div>
                <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
                  {deals.map((p) => <ProductCard key={p.id} p={p} reviews={reviews} onOpen={setDetail} onAdd={addToCart} mobile={mobile} width={mobile ? 168 : 212} />)}
                </div>
              </section>
            )}
            {departments.length > 0 && (
              <section style={{ marginBottom: 30 }}>
                <h2 style={{ ...sectionH, marginBottom: 14 }}>Browse by department</h2>
                <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(200px, 1fr))", gap: mobile ? 10 : 16 }}>
                  {departments.map((d) => <CategoryTile key={d.name} title={d.name} sub={`${d.subs.length} categor${d.subs.length === 1 ? "y" : "ies"}`} kind={d.subs[0]?.kind || "generic"} image={deptImage(d)} onClick={() => goDept(d.name)} />)}
                </div>
              </section>
            )}
            <section style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 30 }}>
              <div style={{ background: "linear-gradient(120deg,#0E9488,#0B6E66)", color: "#fff", borderRadius: 16, padding: mobile ? "22px" : "30px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 21 }}>Fridges &amp; freezers</div>
                <div style={{ opacity: .92, marginTop: 6, fontSize: 14, maxWidth: 280, lineHeight: 1.5 }}>New &amp; used cooling — fully tested and ready to go.</div>
                <button onClick={() => goDept("Refrigeration")} style={{ marginTop: 16, background: "#fff", color: T.accent, border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 700, cursor: "pointer", fontFamily: "Manrope" }}>Shop refrigeration →</button>
                <div style={{ position: "absolute", right: -6, bottom: -18, fontSize: 96, opacity: .18 }}>🧊</div>
              </div>
              <div style={{ background: T.ink, color: "#fff", borderRadius: 16, padding: mobile ? "22px" : "30px", position: "relative", overflow: "hidden" }}>
                <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 21 }}>Appliance not working?</div>
                <div style={{ opacity: .85, marginTop: 6, fontSize: 14, maxWidth: 300, lineHeight: 1.5 }}>We repair and install across East London. Message us for a quote.</div>
                <a href={waLink(`Hi ${SHOP.name}, I'd like to book a repair. Appliance: `)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16, background: "#25D366", color: "#06210f", borderRadius: 9, padding: "10px 18px", fontWeight: 700, textDecoration: "none", fontFamily: "Manrope" }}><Wrench size={16} /> Book a repair</a>
                <div style={{ position: "absolute", right: -6, bottom: -16, fontSize: 88, opacity: .12 }}>🔧</div>
              </div>
            </section>
            <section ref={shopRef} style={{ scrollMarginTop: 150 }}>
              <h2 style={{ ...sectionH, marginBottom: 14 }}>All products</h2>
              <Listing />
            </section>
            <WhyChooseUs mobile={mobile} />
          </>
        )}

        {mode === "dept" && (
          <section ref={shopRef} style={{ scrollMarginTop: 150 }}>
            <Breadcrumb />
            <h1 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: mobile ? 24 : 30, margin: "0 0 4px", letterSpacing: -0.5 }}>{dept}</h1>
            <div style={{ color: T.muted, marginBottom: 18 }}>Browse all {dept.toLowerCase()} — new &amp; used.</div>
            {curDept && curDept.subs.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: mobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(190px, 1fr))", gap: mobile ? 10 : 16, marginBottom: 28 }}>
                {curDept.subs.map((s) => <CategoryTile key={s.id || s.name} title={s.name} sub={`${countInCat(s.name)} item${countInCat(s.name) === 1 ? "" : "s"}`} kind={s.kind} image={subImage(s.name)} onClick={() => goSub(s.name)} />)}
              </div>
            )}
            <h2 style={{ ...sectionH, marginBottom: 14 }}>All {dept}</h2>
            <Listing />
          </section>
        )}

        {(mode === "sub" || mode === "search") && (
          <section ref={shopRef} style={{ scrollMarginTop: 150 }}>
            <Breadcrumb />
            <h1 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: mobile ? 24 : 30, margin: "0 0 14px", letterSpacing: -0.5 }}>{searching ? `Search results` : cat}</h1>
            <Listing />
          </section>
        )}
      </div>

      <SiteFooter setView={setView} setDept={setDept} setCat={setCat} categories={categories} />

      {mobile && filtersOpen && (
        <>
          <div onClick={() => setFiltersOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 99, animation: "vm-fade .2s" }} />
          <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, maxHeight: "82vh", overflowY: "auto", background: T.panel, borderTop: `1px solid ${T.border}`, borderRadius: "16px 16px 0 0", zIndex: 100, padding: 20, animation: "vm-pop .25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 17 }}>Filters</span>
              <button onClick={() => setFiltersOpen(false)} style={iconBtn}><X size={18} /></button>
            </div>
            <FilterControls />
            <button onClick={() => setFiltersOpen(false)} style={{ ...primaryBtn, marginTop: 18 }}>Show {filtered.length} results</button>
          </div>
        </>
      )}

      <a href={waLink(`Hi ${SHOP.name}, I have a question.`)} target="_blank" rel="noreferrer" title="Chat on WhatsApp" style={{ position: "fixed", right: 20, bottom: 20, zIndex: 50, background: "#25D366", color: "#fff", borderRadius: 30, width: 56, height: 56, textDecoration: "none", display: "grid", placeItems: "center", boxShadow: "0 8px 24px rgba(37,211,102,.45)" }}>
        <MessageCircle size={26} />
      </a>

      {detail && <ProductDetail p={detail} reviews={reviews} onSubmitReview={(r) => submitReview(detail.id, r)} onClose={() => setDetail(null)} onAdd={(qty) => { addToCart(detail, qty); setDetail(null); }} />}
      {cartOpen && <CartDrawer cart={cart} cartTotal={cartTotal} setQty={setQty} onClose={() => setCartOpen(false)} onCheckout={async (customer) => { try { const ord = await placeOrder(cart, customer); setCart([]); setCartOpen(false); setConfirmation(ord); } catch (e) { pushToast(e.message || "Order failed", "err"); } }} />}
      {confirmation && (
        <Modal onClose={() => setConfirmation(null)} width={420}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ width: 56, height: 56, borderRadius: 30, background: T.accentDim, color: T.green, display: "grid", placeItems: "center", margin: "0 auto 14px" }}><CheckCircle2 size={30} /></div>
            <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 20 }}>Order placed!</div>
            <div style={{ color: T.muted, marginTop: 6 }}>Order <b style={{ fontFamily: "JetBrains Mono", color: T.text }}>{confirmation.id}</b> · {money(confirmation.total)}</div>
            <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>We'll be in touch to arrange delivery. Thank you!</div>
            <button onClick={() => setConfirmation(null)} style={{ marginTop: 18, background: T.accent, border: "none", color: "#fff", padding: "10px 26px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontFamily: "Manrope" }}>Done</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProductDetail({ p, reviews, onSubmitReview, onClose, onAdd }) {
  const mobile = useIsMobile();
  const imgs = (p.images && p.images.length ? p.images : [illustration(p.kind)]);
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("details");
  const [rName, setRName] = useState("");
  const [rRating, setRRating] = useState(5);
  const [rComment, setRComment] = useState("");
  const [rBusy, setRBusy] = useState(false);
  const out = p.stock === 0;
  const prodReviews = reviews.filter((r) => r.product_id === p.id);
  const stats = reviewStats(reviews, p.id);

  const submit = async () => {
    if (!rName.trim()) return;
    setRBusy(true);
    const ok = await onSubmitReview({ name: rName.trim(), rating: rRating, comment: rComment.trim() });
    setRBusy(false);
    if (ok) { setRName(""); setRComment(""); setRRating(5); }
  };

  return (
    <Modal onClose={onClose} width={800}>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 16 : 22 }}>
        <div>
          <div style={{ aspectRatio: "4/3", background: T.panel2, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}>
            <img src={imgs[active]} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          {imgs.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {imgs.map((src, i) => <img key={i} src={src} onClick={() => setActive(i)} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `2px solid ${i === active ? T.accent : T.border}` }} />)}
            </div>
          )}
          {/* delivery / service info */}
          <div style={{ marginTop: 14, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 12, padding: 14 }}>
            {SHOP.deliveryPerks.map(([title, detail], i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "6px 0" }}>
                <ShieldCheck size={16} style={{ color: T.green, flexShrink: 0, marginTop: 2 }} />
                <div><span style={{ fontWeight: 600, fontSize: 13.5 }}>{title}</span><span style={{ color: T.muted, fontSize: 12.5 }}> — {detail}</span></div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}><ConditionBadge condition={p.condition} grade={p.grade} big /><StockBadge stock={p.stock} /></div>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 23, lineHeight: 1.2 }}>{p.name}</div>
          <div style={{ color: T.faint, fontSize: 13, marginTop: 4 }}>{p.category} · SKU {p.sku}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <Stars value={stats.avg} size={15} />
            <span style={{ color: T.muted, fontSize: 13 }}>{stats.count ? `${stats.avg.toFixed(1)} · ${stats.count} review${stats.count !== 1 ? "s" : ""}` : "No reviews yet"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0", flexWrap: "wrap" }}>
            <Price p={p} size={30} />
            {onSale(p) && <span style={{ background: T.red, color: "#fff", fontWeight: 700, fontSize: 13, padding: "4px 10px", borderRadius: 8 }}>Save {money(p.price - p.salePrice)} ({savePct(p)}%)</span>}
          </div>

          {/* tabs: details / reviews */}
          <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.border}`, marginBottom: 12 }}>
            {[["details", "Details"], ["reviews", `Reviews (${stats.count})`]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{ border: "none", background: "none", cursor: "pointer", color: tab === k ? T.text : T.muted, fontWeight: 700, fontFamily: "Manrope", fontSize: 13.5, padding: "6px 10px", borderBottom: `2px solid ${tab === k ? T.accent : "transparent"}` }}>{l}</button>
            ))}
          </div>

          {tab === "details" ? (
            <div style={{ color: T.muted, fontSize: 14, lineHeight: 1.6 }}>{p.desc}</div>
          ) : (
            <div>
              <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 12 }}>
                {prodReviews.length === 0 && <div style={{ color: T.faint, fontSize: 13 }}>Be the first to review this item.</div>}
                {prodReviews.map((r) => (
                  <div key={r.id} style={{ padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.name}</span>
                      <Stars value={r.rating} size={12} />
                    </div>
                    {r.comment && <div style={{ color: T.muted, fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{r.comment}</div>}
                    <div style={{ color: T.faint, fontSize: 11, marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 8 }}>Write a review</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}><span style={{ color: T.muted, fontSize: 13 }}>Rating</span><StarInput value={rRating} onChange={setRRating} /></div>
                <input value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Your name" style={{ ...inp, marginTop: 0, marginBottom: 8 }} />
                <textarea value={rComment} onChange={(e) => setRComment(e.target.value)} rows={2} placeholder="Your review (optional)" style={{ ...inp, marginTop: 0, resize: "vertical" }} />
                <button onClick={submit} disabled={!rName.trim() || rBusy} style={{ ...primaryBtn, marginTop: 10, opacity: rName.trim() && !rBusy ? 1 : .5, cursor: rName.trim() && !rBusy ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>{rBusy ? <><Spin /> Submitting…</> : "Submit review"}</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <a href={waLink(`Hi ${SHOP.name}, I'm interested in: ${p.name} (${money(effPrice(p))}). Is it available?`)} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#25D366", color: "#06210f", fontWeight: 700, padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontSize: 13 }}><MessageCircle size={15} /> Ask on WhatsApp</a>
            <a href={mailLink(`Enquiry: ${p.name}`, `Hi ${SHOP.name},\n\nI'm interested in "${p.name}" (${money(effPrice(p))}). Is it still available?\n\nThanks,`)} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${T.border}`, color: T.text, fontWeight: 600, padding: "8px 13px", borderRadius: 8, textDecoration: "none", fontSize: 13 }}><Mail size={15} /> Email</a>
          </div>
          {!out && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ color: T.muted, fontSize: 13 }}>Qty</span>
                <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}><Minus size={13} /></button>
                <span style={{ fontFamily: "JetBrains Mono", minWidth: 18, textAlign: "center" }}>{qty}</span>
                <button onClick={() => setQty(Math.min(p.stock, qty + 1))} style={qtyBtn}><Plus size={13} /></button>
              </div>
              <button onClick={() => onAdd(qty)} style={primaryBtn}>Add {qty} to cart · {money(effPrice(p) * qty)}</button>
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
function Admin({ products, reloadProducts, categories, reloadCategories, orders, setOrders, setProducts, pushToast }) {
  const mobile = useIsMobile();
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

  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", Package], ["categories", "Categories", ListTree], ["orders", "Orders", ClipboardList], ["inventory", "Inventory", Boxes]];
  return (
    <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", minHeight: "calc(100vh - 60px)" }}>
      <div style={{ width: mobile ? "auto" : 200, borderRight: mobile ? "none" : `1px solid ${T.border}`, borderBottom: mobile ? `1px solid ${T.border}` : "none", background: T.panel2, padding: mobile ? "8px 10px" : 14, display: "flex", flexDirection: mobile ? "row" : "column", gap: mobile ? 6 : 4, overflowX: mobile ? "auto" : "visible", position: mobile ? "sticky" : "static", top: mobile ? 58 : "auto", zIndex: 30 }}>
        {nav.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setTab(k)} title={label} style={{ display: "flex", alignItems: "center", gap: mobile ? 6 : 10, border: "none", cursor: "pointer", textAlign: "left", background: tab === k ? T.accentDim : "transparent", color: tab === k ? T.text : T.muted, padding: mobile ? "8px 12px" : "10px 12px", borderRadius: 9, fontSize: mobile ? 13 : 14, fontWeight: 600, fontFamily: "Manrope", whiteSpace: "nowrap", flexShrink: 0 }}><Icon size={mobile ? 15 : 17} />{label}</button>
        ))}
        <button onClick={async () => { await db.signOut(); setSession(null); }} style={{ marginTop: mobile ? 0 : "auto", marginLeft: mobile ? "auto" : 0, display: "flex", alignItems: "center", gap: 8, border: "none", cursor: "pointer", background: "transparent", color: T.faint, padding: mobile ? "8px 12px" : "10px 12px", borderRadius: 9, fontSize: 13, fontFamily: "Manrope", whiteSpace: "nowrap", flexShrink: 0 }}><LogOut size={15} />{!mobile && "Sign out"}</button>
      </div>
      <div style={{ flex: 1, padding: mobile ? 14 : 24, overflowY: "auto", minWidth: 0 }}>
        {tab === "dashboard" && <Dashboard products={products} orders={orders} setTab={setTab} />}
        {tab === "products" && <ProductsAdmin products={products} reloadProducts={reloadProducts} categories={categories} pushToast={pushToast} />}
        {tab === "categories" && <CategoriesAdmin categories={categories} reloadCategories={reloadCategories} products={products} pushToast={pushToast} />}
        {tab === "orders" && <OrdersAdmin orders={orders} setOrders={setOrders} pushToast={pushToast} />}
        {tab === "inventory" && <Inventory products={products} setProducts={setProducts} pushToast={pushToast} />}
      </div>
    </div>
  );
}

function Dashboard({ products, orders, setTab }) {
  const mobile = useIsMobile();
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const lowStock = products.filter((p) => p.stock <= LOW_STOCK);
  const usedCount = products.filter((p) => p.condition === "used").length;
  const byCat = useMemo(() => {
    const m = {}; products.forEach((p) => { const k = (p.category || "Other").split(" ")[0]; m[k] = (m[k] || 0) + effPrice(p) * p.stock; });
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
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1.4fr 1fr", gap: 16 }}>
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

function ProductsAdmin({ products, reloadProducts, categories, pushToast }) {
  const [editing, setEditing] = useState(null);
  const catNames = categories.length ? categories.map((c) => c.name) : FALLBACK_CATEGORIES;
  const blank = { name: "", category: catNames[0], kind: kindForCategory(categories, catNames[0]), sku: "", price: "", cost: "", stock: "", salePrice: "", condition: "new", grade: "Good", images: [], desc: "" };
  const save = async (p) => {
    if (!p.name || !p.price) { pushToast("Name and price required", "warn"); return; }
    const payload = { ...p, kind: kindForCategory(categories, p.category) };
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
      <div style={{ ...card, padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ color: T.muted, textAlign: "left", fontSize: 12 }}>{["Product", "Condition", "Price", "Stock", "Margin", ""].map((h, i) => <th key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={td}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src={mainImage(p)} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", border: `1px solid ${T.border}` }} /><div>{p.name}<div style={{ color: T.faint, fontSize: 12 }}>{p.category}</div></div></div></td>
                <td style={td}><ConditionBadge condition={p.condition} grade={p.grade} /></td>
                <td style={td}><Price p={p} size={14} /></td>
                <td style={td}><StockBadge stock={p.stock} /></td>
                <td style={{ ...td, fontFamily: "JetBrains Mono", color: T.green }}>{effPrice(p) ? Math.round((1 - p.cost / effPrice(p)) * 100) : 0}%</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => setEditing({ ...p, salePrice: p.salePrice ?? "" })} style={iconBtnSm}><Pencil size={15} /></button>
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
          <ProductForm p={editing} onChange={setEditing} categories={categories} pushToast={pushToast} />
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setEditing(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
            <button onClick={() => save(editing)} style={{ ...primaryBtn, flex: 1 }}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductForm({ p, onChange, categories, pushToast }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const catNames = (categories && categories.length) ? categories.map((c) => c.name) : FALLBACK_CATEGORIES;
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
        <div style={{ flex: 1 }}><label style={lbl}>Category</label><select value={p.category} onChange={(e) => f("category", e.target.value)} style={inp}>{buildDepartments(categories).map((d) => <optgroup key={d.name} label={d.name}>{d.subs.map((s) => <option key={s.name} value={s.name} style={{ background: T.panel }}>{s.name}</option>)}</optgroup>)}{(!categories || categories.length === 0) && catNames.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        {field("sku", "SKU (optional)")}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><label style={lbl}>Condition</label><select value={p.condition} onChange={(e) => f("condition", e.target.value)} style={inp}><option value="new" style={{ background: T.panel }}>New</option><option value="used" style={{ background: T.panel }}>Used</option></select></div>
        {p.condition === "used" && <div style={{ flex: 1 }}><label style={lbl}>Grade</label><select value={p.grade} onChange={(e) => f("grade", e.target.value)} style={inp}>{GRADES.map((g) => <option key={g} value={g} style={{ background: T.panel }}>{g}</option>)}</select></div>}
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{field("price", "Price (£)", "number")}{field("cost", "Cost (£)", "number")}{field("stock", "Stock", "number")}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        {field("salePrice", "Sale price (£) — optional", "number", "Leave blank for none")}
        <div style={{ flex: 1, fontSize: 12.5, color: T.muted, paddingBottom: 9 }}>
          {p.salePrice && Number(p.salePrice) > 0 && Number(p.salePrice) < Number(p.price)
            ? <span style={{ color: T.green }}>Shows as -{Math.round((1 - Number(p.salePrice) / Number(p.price)) * 100)}% off</span>
            : (p.salePrice && Number(p.salePrice) >= Number(p.price) ? <span style={{ color: T.amber }}>Sale price must be below the normal price</span> : "Set a lower price to show a discount badge")}
        </div>
      </div>
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
      <div style={{ ...card, padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13.5 }}>
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

function CategoriesAdmin({ categories, reloadCategories, products, pushToast }) {
  const [editing, setEditing] = useState(null);
  const departments = [...new Set(categories.map((c) => c.department || "Other"))];
  const blank = { name: "", department: departments[0] || "Refrigeration", kind: "generic", sort: (categories.length ? Math.max(...categories.map((c) => c.sort || 0)) + 1 : 1) };
  const countFor = (name) => products.filter((p) => p.category === name).length;
  const save = async (c) => {
    if (!c.name.trim()) { pushToast("Category name required", "warn"); return; }
    if (!c.department?.trim()) { pushToast("Department required", "warn"); return; }
    try {
      if (c.id) { await db.updateCategory(c.id, c); pushToast("Category updated"); }
      else { await db.createCategory(c); pushToast("Category added"); }
      setEditing(null); await reloadCategories();
    } catch (e) { pushToast(e.message?.includes("duplicate") ? "That category already exists" : (e.message || "Save failed"), "err"); }
  };
  const del = async (c) => {
    if (countFor(c.name) > 0) { pushToast(`Move the ${countFor(c.name)} product(s) in “${c.name}” first`, "warn"); return; }
    try { await db.deleteCategory(c.id); pushToast("Category deleted", "err"); await reloadCategories(); } catch (e) { pushToast(e.message, "err"); }
  };
  const ordered = buildDepartments(categories);
  return (
    <div style={{ animation: "vm-pop .3s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ ...h2, margin: 0 }}>Departments &amp; categories</h2>
        <button onClick={() => setEditing(blank)} style={primaryBtnSm}><Plus size={16} /> Add category</button>
      </div>
      <div style={{ ...card, padding: 0, overflow: "hidden", overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead><tr style={{ color: T.muted, textAlign: "left", fontSize: 12 }}>{["Order", "Department", "Category", "Icon", "Products", ""].map((h, i) => <th key={i} style={{ padding: "12px 14px", borderBottom: `1px solid ${T.border}`, fontWeight: 600 }}>{h}</th>)}</tr></thead>
          <tbody>
            {ordered.flatMap((d) => d.subs).map((c) => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ ...td, fontFamily: "JetBrains Mono", color: T.faint }}>{c.sort}</td>
                <td style={{ ...td, color: T.muted }}>{c.department || "Other"}</td>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={td}><img src={illustration(c.kind)} alt="" style={{ width: 40, height: 30, borderRadius: 5, objectFit: "cover", border: `1px solid ${T.border}` }} /></td>
                <td style={{ ...td, fontFamily: "JetBrains Mono", color: T.muted }}>{countFor(c.name)}</td>
                <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button onClick={() => setEditing(c)} style={iconBtnSm}><Pencil size={15} /></button>
                  <button onClick={() => del(c)} style={{ ...iconBtnSm, color: T.red }}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={6} style={{ ...td, color: T.faint }}>No categories yet — add your first one.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <Modal onClose={() => setEditing(null)} width={440}>
          <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 18, marginBottom: 16 }}>{editing.id ? "Edit category" : "New category"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><label style={lbl}>Department</label>
              <input list="dept-list" value={editing.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} placeholder="e.g. Refrigeration" style={inp} />
              <datalist id="dept-list">{departments.map((d) => <option key={d} value={d} />)}</datalist>
              <div style={{ color: T.faint, fontSize: 11.5, marginTop: 4 }}>Pick an existing department or type a new one.</div>
            </div>
            <div><label style={lbl}>Category name</label><input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Fridge Freezer" style={inp} /></div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}><label style={lbl}>Placeholder icon</label><select value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value })} style={inp}>{KIND_OPTIONS.map((k) => <option key={k} value={k} style={{ background: T.panel }}>{k}</option>)}</select></div>
              <div style={{ width: 90 }}><label style={lbl}>Sort</label><input type="number" value={editing.sort} onChange={(e) => setEditing({ ...editing, sort: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.faint, fontSize: 13 }}>Preview <img src={illustration(editing.kind)} alt="" style={{ width: 54, height: 40, borderRadius: 6, objectFit: "cover", border: `1px solid ${T.border}` }} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button onClick={() => setEditing(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
            <button onClick={() => save(editing)} style={{ ...primaryBtn, flex: 1 }}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ContactPage() {
  const mobile = useIsMobile();
  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: mobile ? 14 : 24, animation: "vm-pop .3s" }}>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: mobile ? 16 : 22 }}>
        <div>
          <h2 style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 26, marginBottom: 4 }}>{SHOP.legalName}</h2>
          <div style={{ color: T.muted, marginBottom: 20 }}>{SHOP.tagline}</div>

          <div style={{ ...card, marginBottom: 14, display: "flex", gap: 12 }}>
            <MapPin size={20} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
            <div><div style={{ fontWeight: 700 }}>Visit the shop</div><div style={{ color: T.muted, marginTop: 2 }}>{SHOP.address}</div>
              <a href={SHOP.mapsLink} target="_blank" rel="noreferrer" style={{ color: T.accent, fontSize: 13, textDecoration: "none" }}>Open in Google Maps →</a></div>
          </div>

          <div style={{ ...card, marginBottom: 14, display: "flex", gap: 12 }}>
            <Clock size={20} style={{ color: T.accent, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700, marginBottom: 6 }}>Opening hours</div>
              {SHOP.hours.map(([d, h]) => <div key={d} style={{ display: "flex", justifyContent: "space-between", color: T.muted, fontSize: 14, padding: "2px 0" }}><span>{d}</span><span style={{ fontFamily: "JetBrains Mono" }}>{h}</span></div>)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <a href={waLink(`Hi ${SHOP.name}, I'd like to ask a question.`)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, background: "#25D366", color: "#06210f", fontWeight: 700, padding: "13px 16px", borderRadius: 11, textDecoration: "none" }}><MessageCircle size={18} /> Message us on WhatsApp</a>
            <a href={`tel:${SHOP.phoneDisplay.replace(/\s/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.border}`, color: T.text, fontWeight: 600, padding: "13px 16px", borderRadius: 11, textDecoration: "none" }}><Phone size={18} style={{ color: T.accent }} /> {SHOP.phoneDisplay}</a>
            <a href={mailLink("Enquiry", `Hi ${SHOP.name},\n\n`)} style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.border}`, color: T.text, fontWeight: 600, padding: "13px 16px", borderRadius: 11, textDecoration: "none" }}><Mail size={18} style={{ color: T.accent }} /> {SHOP.email}</a>
            <a href={waLink(`Hi ${SHOP.name}, I'd like to book a repair. Appliance: `)} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 10, border: `1px solid ${T.border}`, color: T.text, fontWeight: 600, padding: "13px 16px", borderRadius: 11, textDecoration: "none" }}><Wrench size={18} style={{ color: T.accent }} /> Book a repair</a>
          </div>
        </div>

        <div>
          <div style={{ ...card, padding: 0, overflow: "hidden", height: "100%", minHeight: 420 }}>
            <iframe title="map" src={SHOP.mapsEmbed} style={{ border: 0, width: "100%", height: "100%", minHeight: 420 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({ children, onClose, width = 440 }) {
  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 120, animation: "vm-fade .2s" }} />
      <div style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width, maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto", background: T.panel, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, zIndex: 121, animation: "vm-pop .25s ease", boxShadow: "0 24px 60px rgba(20,48,90,.20)" }}>{children}</div>
    </>
  );
}

/* --------------------------------- styles --------------------------------- */
const h2 = { fontFamily: "Sora", fontWeight: 700, fontSize: 22, marginBottom: 18 };
const card = { background: T.panel, border: `1px solid ${T.border}`, borderRadius: 14, padding: 18, boxShadow: T.shadow };
const td = { padding: "12px 14px", verticalAlign: "middle" };
const lbl = { fontSize: 12, color: T.muted };
const filterHead = { fontSize: 11, fontWeight: 700, color: T.faint, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 };
const sectionH = { fontFamily: "Sora", fontWeight: 800, fontSize: 21, margin: 0, letterSpacing: -0.5 };
const inp = { width: "100%", marginTop: 4, background: T.panel2, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 11px", color: T.text, fontSize: 14, fontFamily: "Manrope", outline: "none" };
const primaryBtn = { width: "100%", background: T.accent, border: "none", color: "#fff", padding: "11px 0", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: "Manrope" };
const primaryBtnSm = { display: "flex", alignItems: "center", gap: 6, background: T.accent, border: "none", color: "#fff", padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "Manrope" };
const ghostBtn = { background: "transparent", border: `1px solid ${T.border}`, color: T.muted, padding: "10px 0", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13.5, fontFamily: "Manrope" };
const iconBtn = { background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 4, display: "grid", placeItems: "center" };
const iconBtnSm = { background: "transparent", border: `1px solid ${T.border}`, color: T.muted, cursor: "pointer", padding: 6, borderRadius: 7, marginLeft: 6 };
const qtyBtn = { background: T.panel, border: `1px solid ${T.border}`, color: T.text, cursor: "pointer", width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center" };
const chipBtn = { background: T.panel2, border: `1px solid ${T.border}`, color: T.accent, cursor: "pointer", padding: "5px 10px", borderRadius: 7, fontSize: 12.5, fontFamily: "JetBrains Mono", fontWeight: 700 };
