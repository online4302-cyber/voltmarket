# ZA Appliances & Repairing Services — online shop

493 Katherine Rd, London E7 8DR

A full storefront + admin back office for selling new & used appliances and
taking repair enquiries. Products, categories, orders and photos live in
**Supabase** (free). The site is hosted on **Vercel** (free). Stock decrements
automatically on the database when an order is placed, and the admin area is
protected by a real Supabase login.

Everything below is on free tiers. No card needed.

---

## 0. Add your contact details (1 minute)

Open `src/lib/config.js` and edit the three lines marked **TODO**:

- `whatsapp` — WhatsApp number, international format, digits only
  (UK: drop the leading 0 and put 44 in front, e.g. 07123 456789 -> 447123456789)
- `phoneDisplay` — how you want the number shown
- `email` — your real email

The address, opening hours and Google map are already set. Change hours in the
same file if needed.

## 1. Create the database (Supabase — free)

1. supabase.com -> sign up -> New project. Set a name + database password. Wait ~2 min.
2. Open SQL Editor -> New query.
3. Open supabase/schema.sql, copy everything, paste, Run. This creates the
   tables (categories, products, orders), image bucket, security rules, the
   automatic-stock order function, and starter data.
4. Create your admin login: Authentication -> Users -> Add user -> email + password.
5. Project Settings -> API. Copy the Project URL and the anon public key
   (NOT the service_role key).

## 2. Run it locally (optional)

    npm install
    cp .env.example .env        # then edit .env with your two keys
    npm run dev

## 3. Put it online (Vercel — free)

1. Push this folder to a GitHub repo.
2. vercel.com -> sign in with GitHub -> Add New -> Project -> import it.
3. Add two Environment Variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
4. Deploy. You get a live https://....vercel.app URL. Every push redeploys.

---

## What you can do

- Shop (public): browse, filter New/Used and by category, photo galleries, cart,
  checkout. Each product has Ask on WhatsApp and Email buttons. Stock can't be
  oversold (handled in one DB transaction).
- Contact (public): address, live Google map, opening hours, and WhatsApp /
  phone / email / "Book a repair" buttons.
- Admin (login required):
  - Dashboard: revenue, orders, low-stock alerts.
  - Products: add / edit / delete with photo upload (auto-resized, stored in
    Supabase). Condition New/Used and a used grade.
  - Categories: add / edit / delete your own categories, set placeholder icon
    and order. New ones appear in the shop and product form automatically.
  - Orders: advance pending -> processing -> shipped -> delivered.
  - Inventory: restock with one tap.

## Notes
- The anon key is meant to be public; data is protected by the row-level
  security rules in schema.sql, not by hiding the key.
- To take card payments later, add Stripe Checkout (free test mode).
- Supabase pauses a free project after a week of no activity; open the dashboard
  to wake it.
