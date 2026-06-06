import { supabase } from "./supabase";

/* row <-> app shape mapping (db uses `description`, UI uses `desc`) */
const toApp = (r) => ({
  id: r.id, name: r.name, category: r.category, kind: r.kind, sku: r.sku,
  price: Number(r.price), cost: Number(r.cost), stock: r.stock,
  condition: r.condition, grade: r.grade, images: r.images || [], desc: r.description || "",
});
const toRow = (p) => ({
  name: p.name, category: p.category, kind: p.kind, sku: p.sku,
  price: Number(p.price) || 0, cost: Number(p.cost) || 0, stock: Number(p.stock) || 0,
  condition: p.condition, grade: p.condition === "used" ? p.grade : null,
  images: p.images || [], description: p.desc || "",
});

/* -------------------------------- products -------------------------------- */
export async function listProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(toApp);
}
export async function createProduct(p) {
  const { data, error } = await supabase.from("products").insert(toRow(p)).select().single();
  if (error) throw error;
  return toApp(data);
}
export async function updateProduct(id, p) {
  const { data, error } = await supabase.from("products").update(toRow(p)).eq("id", id).select().single();
  if (error) throw error;
  return toApp(data);
}
export async function deleteProduct(id) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
export async function adjustStock(id, delta) {
  const { data, error } = await supabase.rpc("adjust_stock", { p_id: id, p_delta: delta });
  if (error) throw error;
  return data; // new stock value
}

/* ---------------------------------- images -------------------------------- */
/* downscale in the browser, then upload to Supabase Storage -> returns public URL */
function downscaleToBlob(file, max = 1100, quality = 0.78) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > max) { height = Math.round(height * max / width); width = max; }
        else if (height > max) { width = Math.round(width * max / height); height = max; }
        const c = document.createElement("canvas");
        c.width = width; c.height = height;
        c.getContext("2d").drawImage(img, 0, 0, width, height);
        c.toBlob((b) => res(b), "image/jpeg", quality);
      };
      img.onerror = rej; img.src = reader.result;
    };
    reader.onerror = rej; reader.readAsDataURL(file);
  });
}
export async function uploadImage(file) {
  const blob = await downscaleToBlob(file);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from("product-images").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

/* --------------------------------- orders --------------------------------- */
export async function listOrders() {
  const { data, error } = await supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((o) => ({
    id: o.code || o.id, dbId: o.id, customer: o.customer, email: o.email, address: o.address,
    total: Number(o.total), status: o.status, date: new Date(o.created_at).getTime(),
    items: (o.order_items || []).map((i) => ({ id: i.product_id, name: i.name, qty: i.qty, price: Number(i.price) })),
  }));
}
/* atomic: validates + decrements stock + writes order in one DB transaction */
export async function placeOrder(customer, items) {
  const { data, error } = await supabase.rpc("place_order", {
    p_customer: customer.name, p_email: customer.email, p_address: customer.address,
    p_items: items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
  });
  if (error) throw error;
  return data; // { id, code, total, status }
}
export async function advanceOrder(dbId, next) {
  const { error } = await supabase.from("orders").update({ status: next }).eq("id", dbId);
  if (error) throw error;
}

/* ---------------------------------- auth ---------------------------------- */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
export async function signOut() { await supabase.auth.signOut(); }
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}
