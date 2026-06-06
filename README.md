# VoltMarket — New & Used Electronics Store

A full storefront + admin back office. Products, orders and photos live in
**Supabase** (free). The site is hosted on **Vercel** (free). Stock decrements
automatically on the database when an order is placed, and the admin area is
protected by a real Supabase login.

Everything below is on free tiers. No card needed.

---

## 1. Create the database (Supabase — free)

1. Go to **supabase.com** → sign up → **New project**. Pick a name and a
   database password (save it). Wait ~2 minutes for it to provision.
2. In the project, open **SQL Editor → New query**.
3. Open `supabase/schema.sql` from this project, copy everything, paste it in,
   and click **Run**. This creates the tables, the image bucket, security
   rules, the automatic-stock order function, and 12 sample products.
4. Create your admin login: **Authentication → Users → Add user** →
   enter your email + a password → **Create user**. (Tick "auto-confirm" if
   asked.) This is the account you'll use to sign into the Admin area.
5. Get your keys: **Project Settings → API**. Copy:
   - **Project URL**
   - **anon public** key (the public one — NOT the service_role key)

## 2. Run it locally (optional, to test first)

```bash
npm install
cp .env.example .env        # then edit .env with your two keys from step 1.5
npm run dev
```

Open the URL it prints. Go to **Admin → Sign in** with the user you created.

## 3. Put it on the internet (Vercel — free)

1. Push this folder to a **GitHub** repo (e.g. via GitHub Desktop or):
   ```bash
   git init && git add . && git commit -m "VoltMarket"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/voltmarket.git
   git push -u origin main
   ```
2. Go to **vercel.com** → sign in with GitHub → **Add New → Project** →
   import the repo. Vercel auto-detects Vite — leave the build settings as is.
3. Before deploying, open **Environment Variables** and add the same two:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Click **Deploy**. In ~1 minute you get a live `https://….vercel.app` URL.
   Share it. Every `git push` afterwards redeploys automatically.

That's the whole free stack: Supabase (database + image storage + login) +
Vercel (hosting). You can add your own domain in Vercel later for free.

---

## How it works

- **Shop** — public. Browse, filter New/Used and by category, view photo
  galleries, add to cart, check out. Checkout calls the `place_order` database
  function which validates stock, writes the order, and decrements stock in one
  transaction (no overselling).
- **Admin** — login required. Dashboard (revenue, orders, low-stock alerts),
  Products (add/edit/delete with photo upload to Supabase Storage), Orders
  (advance pending → processing → shipped → delivered), Inventory (restock).
- **Photos** — uploaded in the admin form, auto-resized in the browser, stored
  in the `product-images` bucket, served as public URLs.

## Notes / next steps
- The anon key is meant to be public — your data is protected by the row-level
  security rules in `schema.sql`, not by hiding the key.
- To actually take payment, add **Stripe Checkout** (also has a free test mode).
- Free tiers are generous for a small shop; Supabase pauses a project after a
  week of zero activity — just open the dashboard to wake it.
