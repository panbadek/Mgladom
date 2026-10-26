// Ikonki czynności: rysunki 24×24 (kontur), dobierane po nazwie albo wybrane ręcznie.
export const ICONS = {
  dishwasher: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M7 4.75h.01M9.5 4.75h.01M14.5 4.75h2.5"/><path d="M6.5 18.5h11"/><path d="M8.5 18.5c-1.2 0-1.6-1.6-1.6-3.6s.4-3.6 1.6-3.6 1.6 1.6 1.6 3.6M12 18.5c-1.2 0-1.6-1.6-1.6-3.6s.4-3.6 1.6-3.6 1.6 1.6 1.6 3.6M15.5 18.5c-1.2 0-1.6-1.6-1.6-3.6s.4-3.6 1.6-3.6 1.6 1.6 1.6 3.6"/>',
  rack: '<path d="M3 17h18M4.5 17l1.2 3.5h12.6l1.2-3.5"/><ellipse cx="7.2" cy="11" rx="1.7" ry="6"/><ellipse cx="11.2" cy="11" rx="1.7" ry="6"/><path d="M14.8 11h4.4v3.8a2.2 2.2 0 0 1-2.2 2.2 2.2 2.2 0 0 1-2.2-2.2zM19.2 12.2h.6a1.2 1.2 0 0 1 0 2.4h-.6"/>',
  sink: '<circle cx="10" cy="14" r="6.5"/><circle cx="10" cy="14" r="3.2"/><circle cx="17.8" cy="5.2" r="2.2"/><circle cx="21" cy="9.2" r="1.2"/><circle cx="14.2" cy="3.6" r="1"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13.5h10L18 7M10 11v5.5M14 11v5.5"/>',
  cart: '<path d="M2.5 4h2.4l2.3 10.5h10.6L20 7H5.8"/><circle cx="9" cy="19" r="1.6"/><circle cx="16.5" cy="19" r="1.6"/>',
  package: '<path d="M12 2.8l8 4.5v9.4l-8 4.5-8-4.5V7.3z"/><path d="M4 7.3l8 4.5 8-4.5M12 11.8v9.4M8 5.05l8 4.5"/>',
  pot: '<path d="M4.5 11h15v5a4 4 0 0 1-4 4h-7a4 4 0 0 1-4-4z"/><path d="M2 11h2.5M19.5 11H22M4 8.5h16M10.5 8.5V7h3v1.5"/><path d="M9 4.8c0-.9.8-1 .8-1.9M14.2 4.8c0-.9.8-1 .8-1.9"/>',
  plate: '<circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2.6"/><path d="M2.8 4v4.4a1.6 1.6 0 0 0 3.2 0V4M4.4 10v10"/><path d="M21 20V4c-1.6 1-2.3 3.2-2.3 6.3H21"/>',
  washer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M7 4.75h.01M9.5 4.75h.01"/><circle cx="12" cy="14" r="4.8"/><path d="M8.6 14.6c1.1.9 2.3.9 3.4 0s2.3-.9 3.4 0"/>',
  dryer: '<rect x="4" y="2.5" width="16" height="19" rx="2"/><path d="M4 7h16M7 4.75h.01M9.5 4.75h.01"/><circle cx="12" cy="14" r="4.8"/><path d="M9.6 13h3.6a1.3 1.3 0 1 0-1.3-1.3M9.6 15.4h4.6a1.3 1.3 0 1 1-1.3 1.3"/>',
  hanger: '<path d="M2 5.5h20M9 4v3M15 4v3"/><path d="M9 6l-4.2 2.2 1.3 3 1.9-.8V20h8v-9.6l1.9.8 1.3-3L15 6a3 3 0 0 1-6 0z"/>',
  basket: '<path d="M3 10h18M4.5 10l1.8 10h11.4l1.8-10"/><path d="M8.5 13.5v3.5M12 13.5v3.5M15.5 13.5v3.5"/><path d="M7 10c0-2.5 1.6-4.5 4-4.5 1.6 0 2.4 1.2 4 1.2 1.2 0 2-.6 2.5-1.2"/>',
  iron: '<path d="M2.5 18.5h17V15a5 5 0 0 0-5-5H8.5c-3.5 0-6 3.5-6 8.5z"/><path d="M9 10V7.5a1.5 1.5 0 0 1 1.5-1.5h7"/><path d="M7 15.5h.01M10.5 15.5h.01"/>',
  bath: '<path d="M3 12h18v2.5a4.5 4.5 0 0 1-4.5 4.5h-9A4.5 4.5 0 0 1 3 14.5z"/><path d="M7 19l-1 2M17 19l1 2"/><path d="M6 12V5.5a2 2 0 0 1 3.8-.9"/><path d="M8.5 6.5l3-2.2M11.2 8.2v.01M13.2 7.2v.01M12.4 10v.01"/>',
  broom: '<path d="M20 3.5l-6.2 7"/><path d="M11.8 8.8l4 3.4-3.4 8.6-8.2-6.9z"/><path d="M7.3 16.8l3.4-4M9.9 19l2.6-4.4"/>',
  vacuum: '<path d="M2.5 18v-2.5A4.5 4.5 0 0 1 7 11h1.2a4.5 4.5 0 0 1 4.5 4.5V18z"/><circle cx="5.3" cy="19.6" r="1.3"/><circle cx="10" cy="19.6" r="1.3"/><path d="M12.2 13c3.2 0 2.6-9 6-9M18.2 4l2 14.5M17.2 18.5h4.8"/>',
  window: '<rect x="4.5" y="3" width="15" height="18" rx="1.2"/><path d="M12 3v18M4.5 12h15"/><path d="M7 8.5l2.5-2.5M14.5 9.5l2.5-2.5"/>',
  spray: '<path d="M8 10h5.5l1 2v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8z"/><path d="M9 10V7h3.5v3M8.5 4.5h7l1.5 2.5h-4.5"/><path d="M19.5 4h.01M21 6.5h.01M19.5 9h.01"/>',
  bed: '<path d="M3 19V5.5M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7.5V15"/><circle cx="6.8" cy="11.7" r="1.8"/>',
  plant: '<path d="M7.5 15h9l-1.2 6H8.7z"/><path d="M12 15v-4.5M12 10.5c0-3.3-2.4-5.5-6-5.5 0 3.4 2.4 5.5 6 5.5zM12 9c0-3.3 2.4-5.5 6-5.5 0 3.4-2.4 5.5-6 5.5z"/>',
  paw: '<circle cx="6" cy="11" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12 12c-2.8 0-5 3.2-5 5.5 0 1.6 1.2 2.5 2.6 2.5 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.9 2.6-2.5 0-2.3-2.2-5.5-5-5.5z"/>',
  cat: '<path d="M4.5 3.8l3.8 3.4a8.6 8.6 0 0 1 7.4 0l3.8-3.4V13a7.5 7 0 0 1-15 0z"/><path d="M9 12.5h.01M15 12.5h.01M11.2 15.2h1.6L12 16.2z"/><path d="M2.5 14.5l3 .5M2.5 17l3-.5M21.5 14.5l-3 .5M21.5 17l-3-.5"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.6 2.6 4.8-5.4"/>'
};

// Kolejność i podpisy w wyborze ikonki
export const ICON_LIST = [
  ["dishwasher","Zmywarka"],["rack","Ociekacz"],["sink","Naczynia"],["trash","Śmieci"],["cart","Zakupy"],["package","Paczka"],
  ["pot","Gotowanie"],["plate","Stół"],["washer","Pralka"],["dryer","Suszarka"],["hanger","Rozwieszanie"],["basket","Pranie"],
  ["iron","Prasowanie"],["bath","Łazienka"],["broom","Zamiatanie"],["vacuum","Odkurzanie"],["window","Okna"],["spray","Wycieranie"],
  ["bed","Łóżko"],["plant","Kwiaty"],["paw","Pies"],["cat","Kot"],["check","Inne"]
];

const RULES = [
  [/ociekacz|suszark\S* na naczy/, "rack"],
  [/zmywar/, "dishwasher"],
  [/naczy|zmywan|garn/, "sink"],
  [/łazien|lazien|toalet|wann|prysznic|umywal|sedes/, "bath"],
  [/suszark|suszen/, "dryer"],
  [/pralk/, "washer"],
  [/rozwies|wiesza|zdj[eę]\S* prani|składan|skladan/, "hanger"],
  [/prasow/, "iron"],
  [/pran|ubra|skarpet/, "basket"],
  [/śmie|smiec|kosz|segreg|odpad/, "trash"],
  [/(^|\s)(psa|psem|psy|pies|psu)(\s|$)|spacer/, "paw"],
  [/kot|kuwet/, "cat"],
  [/kwiat|podlew|rośl|rosl/, "plant"],
  [/paczk|kurier|poczt|przesyłk|przesylk/, "package"],
  [/zakup|sklep/, "cart"],
  [/gotow|obiad|kolacj|śniad|sniad|piecz/, "pot"],
  [/stół|stol|nakry/, "plate"],
  [/łóż|łoż|lozk|pości|posci/, "bed"],
  [/okn|okien|okno|szyb/, "window"],
  [/odkurz/, "vacuum"],
  [/zamiat|sprząt|sprzat|porząd|porzad|mop|podłog|podlog/, "broom"],
  [/kurz|blat|wycier|przetar/, "spray"]
];

export function guessIcon(name) {
  const n = String(name || "").toLowerCase();
  for (const [re, key] of RULES) if (re.test(n)) return key;
  return "check";
}
export const iconKey = (stored, name) => (stored && ICONS[stored]) ? stored : guessIcon(name);
export function iconSvg(key) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[key] || ICONS.check) + "</svg>";
}
