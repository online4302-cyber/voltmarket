// ============================================================================
//  ZA Appliances — business details
//  Edit the three lines marked TODO with your real contact info, then save.
// ============================================================================

export const SHOP = {
  name: "ZA Appliances",
  legalName: "ZA Appliances & Repairing Services",
  tagline: "New & Used Appliances · Sales & Repairs",

  address: "493 Katherine Rd, London E7 8DR",

  // WhatsApp number in INTERNATIONAL format, digits only.
  // UK: drop the leading 0 and put 44 in front. e.g. 07123 456789 -> 447123456789
  whatsapp: "447411727470",
  phoneDisplay: "+44 7411 727470",
  email: "online4302@gmail.com",

  hours: [
    ["Mon – Fri", "9:00 – 18:00"],
    ["Saturday", "9:00 – 18:00"],
    ["Sunday", "Closed"],
  ],

  // No API key needed — these use the public address-based Google Maps URLs.
  mapsEmbed: "https://maps.google.com/maps?q=493%20Katherine%20Rd%2C%20London%20E7%208DR&z=16&output=embed",
  mapsLink: "https://www.google.com/maps/search/?api=1&query=493%20Katherine%20Rd%2C%20London%20E7%208DR",
};

export const waLink = (text) =>
  `https://wa.me/${SHOP.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailLink = (subject, body) =>
  `mailto:${SHOP.email}?subject=${encodeURIComponent(subject || "")}${body ? `&body=${encodeURIComponent(body)}` : ""}`;
