import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  updatePassword, reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, deleteDoc, query, where }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20261026-182400";

const BUILD = "20261026-182400";
// Wspólne konto rodziny: stały adres w domenie projektu, hasło zna cała rodzina.
const FAMILY_EMAIL = "rodzina@" + firebaseConfig.authDomain;

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
let fs;
try { fs = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
catch (e) { fs = getFirestore(fbApp); }

// ---------- nowa wersja na serwerze (telefony długo trzymają stare pliki)
async function checkUpdate() {
  try {
    const r = await fetch("version.json?t=" + Date.now(), { cache: "no-store" }); if (!r.ok) return;
    const { v } = await r.json();
    if (v && v !== BUILD && BUILD !== "dev") {
      const bar = document.getElementById("upd"); bar.hidden = false;
      bar.onclick = () => location.replace(location.pathname + "?v=" + encodeURIComponent(v));
    }
  } catch (e) {}
}
setInterval(checkUpdate, 60000);
setTimeout(checkUpdate, 3000);

const PALETTE = ["#D9480F","#1C7ED6","#2B8A3E","#7048E8","#C2255C","#0C8599","#E67700","#8B5E34"];
const SUGGESTIONS = ["Zmywanie naczyń","Odkurzanie","Wyprowadzenie psa","Pranie","Rozwieszenie prania","Podlewanie kwiatów","Zakupy","Gotowanie obiadu","Nakrycie do stołu","Sprzątanie łazienki","Ścielenie łóżka","Karmienie kota"];
const DAY_ABBR = ["Nd","Pn","Wt","Śr","Cz","Pt","So"];

const ICONS = {
  dish:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 8h16M7.5 5.5h.01M10.5 5.5h.01"/><circle cx="12" cy="14.5" r="3.5"/>',
  trash:'<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5"/>',
  broom:'<path d="M18.5 3l-6.5 9M8 12h7.5l2 9H5.5zM9.5 21l1-5M13.5 21l-.5-5"/>',
  paw:'<circle cx="6" cy="11" r="1.8"/><circle cx="9.5" cy="6.5" r="1.8"/><circle cx="14.5" cy="6.5" r="1.8"/><circle cx="18" cy="11" r="1.8"/><path d="M12 12c-2.8 0-5 3.2-5 5.5 0 1.6 1.2 2.5 2.6 2.5 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.9 2.6-2.5 0-2.3-2.2-5.5-5-5.5z"/>',
  shirt:'<path d="M8.5 3.5L4 6l1.5 4L8 9v11.5h8V9l2.5 1L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0z"/>',
  plant:'<path d="M12 21v-9M12 12c0-3.5-2.6-6-7-6 0 3.9 2.8 6 7 6zM12 10c0-3.5 2.6-6 7-6 0 3.9-2.8 6-7 6zM7.5 21h9"/>',
  bag:'<path d="M5 8h14l-1.2 12.5H6.2zM9 8V6.5a3 3 0 0 1 6 0V8"/>',
  pot:'<path d="M4.5 10h15v5.5a4.5 4.5 0 0 1-4.5 4.5H9a4.5 4.5 0 0 1-4.5-4.5zM2 10h2.5M19.5 10H22M9 6.5c0-1.2 1-1.3 1-2.5M14 6.5c0-1.2 1-1.3 1-2.5"/>',
  drop:'<path d="M12 3.5s6 6.6 6 10.8a6 6 0 0 1-12 0C6 10.1 12 3.5 12 3.5z"/>',
  bed:'<path d="M3 19V6M3 15h18v4M21 15v-2.5a3 3 0 0 0-3-3h-7V15"/><circle cx="7" cy="12" r="1.7"/>',
  plate:'<circle cx="14" cy="12" r="6"/><circle cx="14" cy="12" r="2.6"/><path d="M3.5 4v5a1.5 1.5 0 0 0 3 0V4M5 10.5V20"/>',
  bowl:'<path d="M3.5 11h17a8.5 8.5 0 0 1-17 0zM9 7.5c0-1 1-1.3 1-2.3M14 7.5c0-1 1-1.3 1-2.3"/>',
  check:'<circle cx="12" cy="12" r="8.5"/><path d="M8.3 12.2l2.6 2.6 4.8-5.4"/>'
};
const ICON_RULES = [
  [/łazien|lazien|toalet|wann|prysznic|umywal/, "drop"],
  [/zmywar|naczy|zmywan/, "dish"],
  [/śmie|smiec|kosz|segreg/, "trash"],
  [/(^|\s)(psa|psem|psy|pies|psu)(\s|$)|spacer/, "paw"],
  [/kot|karmi/, "bowl"],
  [/pran|ubra|prasow|skarpet/, "shirt"],
  [/kwiat|podlew|rośl|rosl/, "plant"],
  [/zakup|sklep/, "bag"],
  [/gotow|obiad|kolacj|śniad|sniad/, "pot"],
  [/łóż|łoż|lozk|pości|posci/, "bed"],
  [/stół|stol|nakry/, "plate"],
  [/odkurz|zamiat|sprząt|sprzat|porząd|porzad|mop|podłog|podlog|okn/, "broom"]
];
const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const safeColor = c => (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) ? c : "#6B7B82";
const clean = (s, max) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max);
const pad = n => String(n).padStart(2, "0");
const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const dateOf = k => { const p = k.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
const dayAgo = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const windowKeys = () => [6,5,4,3,2,1,0].map(n => keyOf(dayAgo(n)));
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const fmtDM = k => { const d = dateOf(k); return d.getDate() + "." + pad(d.getMonth() + 1); };
const czynnosc = n => n === 1 ? "czynność" : "czynności";
const wpis = n => n === 1 ? "wpis" : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? "wpisy" : "wpisów");
const byOrder = (a, b) => a.order - b.order || a.name.localeCompare(b.name, "pl");
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
function countBy(arr, k) { const o = {}; for (const x of arr) o[x[k]] = (o[x[k]] || 0) + 1; return o; }
function busy(el) { const a = document.activeElement; return !!(a && a.tagName === "INPUT" && el.contains(a)); }

function icon(name) {
  const n = String(name).toLowerCase();
  let k = "check";
  for (const [re, key] of ICON_RULES) { if (re.test(n)) { k = key; break; } }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[k] + "</svg>";
}
function avatar(m, size) {
  const ch = (m.name.trim().charAt(0) || "?").toUpperCase();
  return '<span class="av' + (size ? " " + size : "") + '" style="--c:' + m.color + '" aria-hidden="true">' + esc(ch) + "</span>";
}
function tally(n, color) {
  const shown = Math.min(n, 20), groups = Math.ceil(shown / 5);
  const gw = 26, w = groups * gw + 2, h = 22;
  let s = "";
  for (let g = 0; g < groups; g++) {
    const inG = Math.min(5, shown - g * 5), x0 = g * gw + 4;
    for (let i = 0; i < Math.min(4, inG); i++) { const x = x0 + i * 5; s += '<line x1="' + x + '" y1="3" x2="' + x + '" y2="19"/>'; }
    if (inG === 5) s += '<line x1="' + (x0 - 2) + '" y1="16" x2="' + (x0 + 17) + '" y2="6"/>';
  }
  return '<svg class="tally" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' + s + "</svg>";
}

/* ---------- stan ---------- */
let members = [], chores = [], ENT = [];
let ghostM = {}, ghostC = {};          // osoby i czynności usunięte z list, ale obecne w dawnych wpisach
const loaded = { members: false, chores: false, entries: false };
let unsubs = [], unsubEntries = null;
let selected = lsGet("dd.member");
let when = "today";
let todayK = keyOf(new Date());
let showAllHist = false, addingChore = false, tilesSig = "";
let swatch = null, toastAction = null, toastTimer = null;
let flashId = null, flashAt = 0;
let signedIn = false;

const ready = () => loaded.members && loaded.chores && loaded.entries;
function memberOf(id) { return members.find(m => m.id === id) || ghostM[id] || { id, name: "Usunięta osoba", color: "#6B7B82", order: 1e15 }; }
function choreOf(id) { return chores.find(c => c.id === id) || ghostC[id] || { id, name: "Usunięta czynność", order: 1e15 }; }
function entriesIn(keys) { const s = new Set(keys); return ENT.filter(e => s.has(e.day)); }

function parseMember(d) {
  const x = d.data(); if (!x || typeof x.name !== "string") return null;
  return { id: d.id, name: clean(x.name, 30) || "Bez imienia", color: safeColor(x.color), order: Number.isFinite(x.order) ? x.order : 0 };
}
function parseChore(d) {
  const x = d.data(); if (!x || typeof x.name !== "string") return null;
  return { id: d.id, name: clean(x.name, 50) || "Bez nazwy", order: Number.isFinite(x.order) ? x.order : 0 };
}
function parseEntry(d) {
  const x = d.data();
  if (!x || typeof x.m !== "string" || typeof x.c !== "string" || typeof x.day !== "string" || !Number.isFinite(x.t)) return null;
  return { id: d.id, m: x.m, c: x.c, day: x.day, t: x.t, mn: clean(x.mn, 30), mc: safeColor(x.mc), cn: clean(x.cn, 50) };
}
function rebuildGhosts() {
  ghostM = {}; ghostC = {};
  for (const e of ENT) {
    if (!ghostM[e.m]) ghostM[e.m] = { id: e.m, name: e.mn || "Usunięta osoba", color: e.mc, order: 1e15 };
    if (!ghostC[e.c]) ghostC[e.c] = { id: e.c, name: e.cn || "Usunięta czynność", order: 1e15 };
  }
}

/* ---------- widok ---------- */
function renderHeader() {
  const s = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("#today-label").textContent = s.charAt(0).toUpperCase() + s.slice(1);
  $("#ver").textContent = "wersja " + BUILD;
}
function renderWhen() {
  document.querySelectorAll('[data-action="when"]').forEach(b => b.setAttribute("aria-checked", String(b.dataset.when === when)));
}

function renderWho() {
  const el = $("#who");
  if (busy(el)) return;
  if (!loaded.members) { el.innerHTML = '<p class="muted">Wczytywanie domowników…</p>'; return; }
  if (!members.some(m => m.id === selected)) selected = members.length === 1 ? members[0].id : null;
  if (!members.length) {
    el.innerHTML = '<div class="empty-inline"><p>Dodaj pierwszego domownika, żeby zacząć odhaczać. Resztę dodasz w Ustawieniach.</p>' +
      '<form data-form="quick-member" class="row" autocomplete="off"><input id="quick-member" maxlength="30" placeholder="Imię, np. Ola" aria-label="Imię domownika">' +
      '<button class="btn primary" type="submit">Dodaj</button></form></div>';
  } else {
    el.innerHTML = members.map(m => '<button type="button" class="chip' + (m.id === selected ? " on" : "") + '" data-action="pick" data-id="' + esc(m.id) + '" aria-pressed="' + (m.id === selected) + '" style="--c:' + m.color + '">' + avatar(m) + "<span>" + esc(m.name) + "</span></button>").join("");
  }
  $("#who-hint").hidden = !(members.length > 1 && !selected);
}

function renderTiles(force) {
  const el = $("#tiles");
  if (!force && busy(el)) return;
  if (!loaded.chores) { el.innerHTML = '<p class="muted span">Wczytywanie czynności…</p>'; tilesSig = ""; return; }
  const dis = !selected;
  const sig = JSON.stringify([chores.map(c => [c.id, c.name]), dis, addingChore]);
  if (sig !== tilesSig) {
    tilesSig = sig;
    let html = "";
    if (!chores.length) html += '<p class="muted span">Nie ma jeszcze żadnej czynności. Dodaj własną albo wybierz z podpowiedzi w Ustawieniach.</p>';
    html += chores.map(c => '<button type="button" class="tile" data-action="log" data-id="' + esc(c.id) + '"' + (dis ? " disabled" : "") + ">" +
      '<span class="ic">' + icon(c.name) + '</span><span class="tname">' + esc(c.name) + "</span>" +
      '<span class="badge" hidden></span><span class="tick">' + TICK_SVG + "</span></button>").join("");
    html += addingChore
      ? '<form class="tile tile-form" data-form="tile-chore" autocomplete="off"><label class="tname" for="tile-chore">Nowa czynność</label><input id="tile-chore" maxlength="50" placeholder="Np. Mycie okien"><div class="row"><button class="btn primary sm" type="submit">Dodaj</button><button type="button" class="btn ghost sm" data-action="cancel-chore">Anuluj</button></div></form>'
      : '<button type="button" class="tile add" data-action="add-chore"><span class="ic">+</span><span class="tname">Własna czynność</span></button>';
    el.innerHTML = html;
  }
  const counts = countBy(entriesIn([todayK]), "c");
  el.querySelectorAll(".tile[data-id]").forEach(b => {
    const n = counts[b.dataset.id] || 0, bd = b.querySelector(".badge");
    bd.textContent = n ? "dziś " + n + "×" : ""; bd.hidden = !n;
    if (b.dataset.id === flashId && Date.now() - flashAt < 300 && !b.classList.contains("flash")) b.classList.add("flash");
  });
}

function renderToday() {
  const el = $("#today-list");
  if (!ready()) { el.innerHTML = '<p class="loading">Wczytywanie…</p>'; return; }
  const es = entriesIn([todayK]);
  $("#today-total").textContent = es.length ? "razem " + es.length + " " + czynnosc(es.length) : "";
  const ids = new Set(members.map(m => m.id)); es.forEach(e => ids.add(e.m));
  if (!ids.size) { el.innerHTML = '<p class="loading">Gdy dodasz domowników, zobaczysz tu, kto co dziś zrobił.</p>'; return; }
  const rows = [...ids].map(id => ({ m: memberOf(id), mine: es.filter(e => e.m === id) }))
    .sort((a, b) => b.mine.length - a.mine.length || a.m.order - b.m.order);
  el.innerHTML = '<ul class="list">' + rows.map(r => {
    const n = r.mine.length;
    const done = n ? r.mine.slice().sort((a, b) => a.t - b.t).map(e => '<span class="done">' + esc(choreOf(e.c).name) + "<time>" + hhmm(e.t) + "</time></span>").join("") : '<span class="muted">jeszcze nic</span>';
    return '<li class="trow"><div class="who-cell">' + avatar(r.m) + '<span class="nm">' + esc(r.m.name) + "</span></div>" +
      '<div class="cnt-cell">' + (n ? tally(n, r.m.color) : "") + '<span class="big" aria-label="' + n + " " + czynnosc(n) + '">' + n + "</span></div>" +
      '<div class="done-list">' + done + "</div></li>";
  }).join("") + "</ul>";
}

function dayLabel(k) {
  const d = dateOf(k);
  if (k === todayK) return 'Dziś<span class="dd">' + fmtDM(k) + "</span>";
  if (k === keyOf(dayAgo(1))) return 'Wczoraj<span class="dd">' + fmtDM(k) + "</span>";
  return DAY_ABBR[d.getDay()] + '<span class="dd">' + fmtDM(k) + "</span>";
}
function cell(n, color, max) {
  if (!n) return '<td><span class="zero">·</span></td>';
  const p = Math.round(18 + 62 * (n / max));
  return '<td><span class="cnt' + (p >= 52 ? " s" : "") + '" style="--c:' + color + ";--p:" + p + '%">' + n + "</span></td>";
}

function renderWeek() {
  const barsEl = $("#week-bars"), board = $("#board"), tbl = $("#week-table");
  const keys = windowKeys();
  $("#week-range").textContent = fmtDM(keys[0]) + " – " + fmtDM(keys[6]);
  if (!ready()) { barsEl.innerHTML = '<p class="loading">Wczytywanie…</p>'; board.hidden = true; return; }
  const es = entriesIn(keys);
  const ids = new Set(members.map(m => m.id)); es.forEach(e => ids.add(e.m));
  if (!ids.size) { barsEl.innerHTML = '<p class="loading">Tu pojawi się podsumowanie tygodnia: kto ile razy i co robił.</p>'; board.hidden = true; return; }
  const rows = [...ids].map(id => { const mine = es.filter(e => e.m === id); return { m: memberOf(id), n: mine.length, by: countBy(mine, "c"), byDay: countBy(mine, "day") }; })
    .sort((a, b) => b.n - a.n || a.m.order - b.m.order);
  const max = Math.max(1, ...rows.map(r => r.n));
  barsEl.innerHTML = rows.map(r => {
    const parts = Object.entries(r.by).sort((a, b) => b[1] - a[1]).map(([c, n]) => esc(choreOf(c).name) + " " + n + "×").join(" · ");
    return '<div class="bar-row"><div class="who-cell">' + avatar(r.m) + '<span class="nm">' + esc(r.m.name) + "</span></div>" +
      '<div class="track" role="img" aria-label="' + esc(r.m.name) + ": " + r.n + " " + czynnosc(r.n) + '"><span class="fill" style="--c:' + r.m.color + ";width:" + (r.n / max * 100).toFixed(1) + '%"></span></div>' +
      '<span class="num">' + r.n + '</span><p class="breakdown">' + (parts || "brak wpisów") + "</p></div>";
  }).join("");

  board.hidden = false;
  const dayMax = Math.max(1, ...rows.flatMap(r => keys.map(k => r.byDay[k] || 0)));
  const choreIds = new Set(chores.map(c => c.id)); es.forEach(e => choreIds.add(e.c));
  const choreRows = [...choreIds].map(id => ({ c: choreOf(id), total: es.filter(e => e.c === id).length }))
    .sort((a, b) => b.total - a.total || a.c.order - b.c.order);
  const choreMax = Math.max(1, ...rows.flatMap(r => choreRows.map(cr => r.by[cr.c.id] || 0)));
  const span = rows.length + 2, zero = '<span class="zero">·</span>';
  let h = '<thead><tr><th scope="col"></th>' +
    rows.map(r => '<th scope="col" class="mh">' + avatar(r.m, "sm") + '<span class="mhn">' + esc(r.m.name) + "</span></th>").join("") +
    '<th scope="col" class="tot">Razem</th></tr></thead>';
  h += '<tbody><tr class="grp"><th colspan="' + span + '" scope="colgroup">Dzień po dniu</th></tr>';
  for (const k of keys.slice().reverse()) {
    const tot = es.filter(e => e.day === k).length;
    h += "<tr" + (k === todayK ? ' class="is-today"' : "") + '><th scope="row">' + dayLabel(k) + "</th>" +
      rows.map(r => cell(r.byDay[k] || 0, r.m.color, dayMax)).join("") + '<td class="tot">' + (tot || zero) + "</td></tr>";
  }
  h += '<tr class="sum"><th scope="row">Razem</th>' + rows.map(r => "<td>" + r.n + "</td>").join("") + '<td class="tot">' + es.length + "</td></tr></tbody>";
  if (choreRows.length) {
    h += '<tbody><tr class="grp"><th colspan="' + span + '" scope="colgroup">Kto co robił</th></tr>';
    for (const cr of choreRows) {
      h += '<tr><th scope="row"><span class="cname"><span class="ic sm">' + icon(cr.c.name) + "</span>" + esc(cr.c.name) + "</span></th>" +
        rows.map(r => cell(r.by[cr.c.id] || 0, r.m.color, choreMax)).join("") + '<td class="tot">' + (cr.total || zero) + "</td></tr>";
    }
    h += "</tbody>";
  }
  tbl.innerHTML = h;
}

function renderHistory() {
  const el = $("#history");
  if (!ready()) { el.innerHTML = '<p class="loading">Wczytywanie…</p>'; return; }
  const es = entriesIn(windowKeys());
  $("#hist-meta").textContent = es.length ? es.length + " " + wpis(es.length) + " z 7 dni" : "";
  if (!es.length) { el.innerHTML = '<p class="loading">Brak wpisów z ostatnich 7 dni. Odhacz pierwsze zadanie w panelu „Odhacz zrobione”.</p>'; return; }
  const LIMIT = 20, list = showAllHist ? es : es.slice(0, LIMIT), groups = [];
  for (const e of list) { let g = groups[groups.length - 1]; if (!g || g.day !== e.day) { g = { day: e.day, items: [] }; groups.push(g); } g.items.push(e); }
  let h = "";
  for (const g of groups) {
    const lbl = g.day === todayK ? "Dziś" : (g.day === keyOf(dayAgo(1)) ? "Wczoraj" : new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(dateOf(g.day)));
    h += '<p class="hday">' + esc(lbl) + " · " + fmtDM(g.day) + '</p><ul class="list">';
    h += g.items.map(e => {
      const m = memberOf(e.m), c = choreOf(e.c);
      return '<li class="hrow"><time>' + hhmm(e.t) + "</time>" + avatar(m, "sm") +
        '<span class="htext"><b>' + esc(m.name) + "</b> · " + esc(c.name) + "</span>" +
        '<button type="button" class="del" data-action="del" data-id="' + esc(e.id) + '">Usuń</button></li>';
    }).join("");
    h += "</ul>";
  }
  if (es.length > LIMIT) h += '<button type="button" class="btn ghost sm more" data-action="more-hist">' + (showAllHist ? "Pokaż mniej" : "Pokaż wszystkie (" + es.length + ")") + "</button>";
  el.innerHTML = h;
}

function renderManage() {
  const ml = $("#m-list"), cl = $("#c-list");
  if (!loaded.members) ml.innerHTML = '<li class="mrow muted">Wczytywanie…</li>';
  else ml.innerHTML = (members.length ? "" : '<li class="mrow muted">Nikogo jeszcze nie ma.</li>') +
    members.map(m => '<li class="mrow">' + avatar(m) + '<span class="nm">' + esc(m.name) + '</span><button type="button" class="btn ghost sm" data-action="del-m" data-id="' + esc(m.id) + '">Usuń</button></li>').join("");
  if (!loaded.chores) cl.innerHTML = '<li class="mrow muted">Wczytywanie…</li>';
  else cl.innerHTML = (chores.length ? "" : '<li class="mrow muted">Brak czynności.</li>') +
    chores.map(c => '<li class="mrow"><span class="ic">' + icon(c.name) + '</span><span class="nm">' + esc(c.name) + '</span><button type="button" class="btn ghost sm" data-action="del-c" data-id="' + esc(c.id) + '">Usuń</button></li>').join("");
  const used = new Set(members.map(m => m.color));
  if (!swatch || used.has(swatch)) swatch = PALETTE.find(c => !used.has(c)) || swatch || PALETTE[0];
  $("#swatches").innerHTML = PALETTE.map((c, i) => '<button type="button" class="sw" role="radio" aria-checked="' + (c === swatch) + '" aria-label="Kolor ' + (i + 1) + '" data-action="swatch" data-color="' + c + '" style="--c:' + c + '"></button>').join("");
  const have = new Set(chores.map(c => c.name.toLowerCase()));
  const sug = SUGGESTIONS.filter(s => !have.has(s.toLowerCase()));
  $("#sugg").innerHTML = sug.map(s => '<button type="button" class="sugg-chip" data-action="sugg" data-name="' + esc(s) + '">+ ' + esc(s) + "</button>").join("");
  $("#sugg-lbl").hidden = !sug.length;
  $("#app-url").textContent = location.origin + location.pathname;
}

function renderAll() { renderWho(); renderTiles(); renderToday(); renderWeek(); renderHistory(); renderManage(); }

/* ---------- komunikaty ---------- */
function showNotice(msg) { const n = $("#notice"); n.textContent = msg; n.hidden = !msg; }
function toast(msg, action, kind) {
  const t = $("#toast");
  t.className = "toast" + (kind === "err" ? " err" : "");
  t.innerHTML = '<div class="toast-inner"><span>' + esc(msg) + "</span>" + (action ? '<button type="button" class="toast-act" data-action="toast-act">' + esc(action.label) + "</button>" : "") + "</div>";
  t.hidden = false;
  toastAction = action ? action.fn : null;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; toastAction = null; }, action ? 6000 : 3800);
}
function handleErr(e) {
  console.warn(e);
  if (e && e.code === "permission-denied") toast("Brak dostępu do bazy. Sprawdź reguły Firestore albo zaloguj się ponownie.", null, "err");
  else toast("Nie udało się zapisać. Spróbuj jeszcze raz.", null, "err");
}

/* ---------- zapis ---------- */
const newId = col => doc(collection(fs, col)).id;

function logChore(choreId) {
  if (!selected) return;
  const m = memberOf(selected), c = choreOf(choreId);
  const d = new Date();
  if (when === "yesterday") d.setDate(d.getDate() - 1);
  const day = keyOf(d), id = newId("entries");
  flashId = choreId; flashAt = Date.now();
  const btn = document.querySelector('#tiles .tile[data-id="' + CSS.escape(choreId) + '"]');
  if (btn) { btn.classList.remove("flash"); void btn.offsetWidth; btn.classList.add("flash"); }
  toast(m.name + ": " + c.name + (when === "yesterday" ? " (wczoraj)" : ""), { label: "Cofnij", fn: () => {
    deleteDoc(doc(fs, "entries", id)).then(() => toast("Cofnięto wpis.")).catch(handleErr);
  } });
  setDoc(doc(fs, "entries", id), { m: m.id, mn: m.name, mc: m.color, c: c.id, cn: c.name, day, t: d.getTime() }).catch(handleErr);
}

async function addMember(raw) {
  const name = clean(raw, 30);
  if (!name) return false;
  if (members.some(m => m.name.toLowerCase() === name.toLowerCase())) { toast(name + " już jest na liście."); return false; }
  const used = new Set(members.map(m => m.color));
  const color = (swatch && !used.has(swatch)) ? swatch : (PALETTE.find(c => !used.has(c)) || PALETTE[members.length % PALETTE.length]);
  setDoc(doc(fs, "members", newId("members")), { name, color, order: Date.now() }).catch(handleErr);
  toast("Dodano: " + name);
  return true;
}
async function addChore(raw) {
  const name = clean(raw, 50);
  if (!name) return false;
  if (chores.some(c => c.name.toLowerCase() === name.toLowerCase())) { toast("„" + name + "” już jest na liście."); return false; }
  setDoc(doc(fs, "chores", newId("chores")), { name, order: Date.now() }).catch(handleErr);
  toast("Dodano czynność: " + name);
  return true;
}

function confirmThen(btn, label, fn) {
  if (btn.dataset.confirm) { fn(); return; }
  btn.dataset.confirm = "1";
  const old = btn.textContent;
  btn.textContent = label; btn.classList.add("warn");
  setTimeout(() => { if (btn.isConnected && btn.dataset.confirm) { delete btn.dataset.confirm; btn.textContent = old; btn.classList.remove("warn"); } }, 3000);
}

/* ---------- arkusz ustawień ---------- */
let lastFocus = null;
function openManage() {
  lastFocus = document.activeElement;
  $("#manage").hidden = false;
  document.documentElement.style.overflow = "hidden";
  renderManage();
  $("#manage-h").focus();
}
function closeManage() {
  $("#manage").hidden = true;
  document.documentElement.style.overflow = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/* ---------- zdarzenia ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action;
  if (a === "pick") { selected = b.dataset.id; lsSet("dd.member", selected); renderWho(); renderTiles(); }
  else if (a === "when") { when = b.dataset.when; renderWhen(); }
  else if (a === "log") { logChore(b.dataset.id); }
  else if (a === "add-chore") { addingChore = true; renderTiles(true); const i = $("#tile-chore"); if (i) i.focus(); }
  else if (a === "cancel-chore") { addingChore = false; renderTiles(true); }
  else if (a === "open-manage") { openManage(); }
  else if (a === "close-manage") { closeManage(); }
  else if (a === "toast-act") { const f = toastAction; toastAction = null; $("#toast").hidden = true; if (f) f(); }
  else if (a === "del") { const id = b.dataset.id; confirmThen(b, "Na pewno?", () => { deleteDoc(doc(fs, "entries", id)).then(() => toast("Usunięto wpis.")).catch(handleErr); }); }
  else if (a === "more-hist") { showAllHist = !showAllHist; renderHistory(); }
  else if (a === "swatch") { swatch = b.dataset.color; renderManage(); }
  else if (a === "del-m") { const id = b.dataset.id; confirmThen(b, "Na pewno?", () => { deleteDoc(doc(fs, "members", id)).catch(handleErr); }); }
  else if (a === "del-c") { const id = b.dataset.id; confirmThen(b, "Na pewno?", () => { deleteDoc(doc(fs, "chores", id)).catch(handleErr); }); }
  else if (a === "sugg") { addChore(b.dataset.name); }
  else if (a === "copy-url") { copyUrl(b); }
  else if (a === "logout") { closeManage(); signOut(auth); }
});

document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form]");
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, input = f.querySelector("input"), val = input ? input.value : "";
  if (kind === "member" || kind === "quick-member") {
    if (await addMember(val) && input) input.value = "";
    if (kind === "quick-member" && input) input.blur();
  } else if (kind === "chore") {
    if (await addChore(val) && input) input.value = "";
  } else if (kind === "tile-chore") {
    if (input) input.blur();
    if (await addChore(val)) { addingChore = false; renderTiles(true); }
  } else if (kind === "pass") {
    changePass(f);
  }
});

document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#manage").hidden) closeManage(); });

async function copyUrl(btn) {
  const url = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(url); btn.textContent = "Skopiowano"; setTimeout(() => { btn.textContent = "Kopiuj"; }, 2000); }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("#app-url")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Zaznaczyłem link, skopiuj go ręcznie."); }
}

/* ---------- logowanie ---------- */
const PL_ERR = {
  "auth/invalid-credential": "Złe hasło rodziny.", "auth/invalid-login-credentials": "Złe hasło rodziny.",
  "auth/wrong-password": "Złe hasło rodziny.", "auth/user-not-found": "Złe hasło rodziny.",
  "auth/email-already-in-use": "Hasło rodziny jest już ustawione. Wpisz je, żeby wejść.",
  "auth/weak-password": "Hasło musi mieć co najmniej 6 znaków.",
  "auth/too-many-requests": "Za dużo prób. Spróbuj za kilka minut.",
  "auth/network-request-failed": "Brak internetu. Sprawdź połączenie.",
  "auth/operation-not-allowed": "Logowanie hasłem jest wyłączone w Firebase (Authentication → E-mail/hasło)."
};
let createMode = false;
function setLoginMode(create) {
  createMode = create;
  $("#login-h").textContent = create ? "Ustaw hasło rodziny" : "Wejdź";
  $("#login-desc").textContent = create
    ? "Robisz to tylko raz. Potem podaj to hasło domownikom, żeby weszli na swoich telefonach."
    : "Wpisz hasło rodziny. Ten telefon je zapamięta.";
  $("#pw2-box").hidden = !create;
  $("#pw").autocomplete = create ? "new-password" : "current-password";
  $("#login-btn").textContent = create ? "Ustaw hasło i wejdź" : "Wejdź";
  $("#login-mode").textContent = create ? "Hasło już jest ustawione? Wejdź" : "Pierwsze uruchomienie? Ustaw hasło rodziny";
  $("#login-err").hidden = true;
}
$("#login-mode").addEventListener("click", () => setLoginMode(!createMode));
$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("#pw").value, err = $("#login-err"), btn = $("#login-btn");
  err.hidden = true;
  if (pw.length < 6) { err.textContent = "Hasło musi mieć co najmniej 6 znaków."; err.hidden = false; return; }
  if (createMode && pw !== $("#pw2").value) { err.textContent = "Hasła się różnią."; err.hidden = false; return; }
  btn.disabled = true;
  try {
    if (createMode) {
      await createUserWithEmailAndPassword(auth, FAMILY_EMAIL, pw);
      // pierwsze czynności na start (można je usunąć w Ustawieniach)
      setDoc(doc(fs, "chores", "zmywarka"), { name: "Rozładowanie zmywarki", order: 1 }).catch(handleErr);
      setDoc(doc(fs, "chores", "smieci"), { name: "Wyniesienie śmieci", order: 2 }).catch(handleErr);
    }
    else await signInWithEmailAndPassword(auth, FAMILY_EMAIL, pw);
    $("#pw").value = ""; $("#pw2").value = "";
  } catch (ex) {
    err.textContent = PL_ERR[ex.code] || ("Błąd: " + ex.message); err.hidden = false;
    if (ex.code === "auth/email-already-in-use") setLoginMode(false), err.textContent = PL_ERR[ex.code], err.hidden = false;
  } finally { btn.disabled = false; }
});

async function changePass(form) {
  const oldP = $("#old-pw").value, newP = $("#new-pw").value;
  if (newP.length < 6) { toast("Nowe hasło musi mieć co najmniej 6 znaków.", null, "err"); return; }
  try {
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(FAMILY_EMAIL, oldP));
    await updatePassword(auth.currentUser, newP);
    form.reset();
    toast("Hasło rodziny zmienione.");
  } catch (ex) { toast(PL_ERR[ex.code] || ("Nie udało się zmienić hasła: " + ex.message), null, "err"); }
}

/* ---------- dane na żywo ---------- */
function subErr(e) {
  console.warn(e);
  showNotice(e && e.code === "permission-denied"
    ? "Baza odmówiła dostępu. Sprawdź, czy reguły Firestore są wklejone, albo zaloguj się ponownie."
    : "Połączenie z bazą zostało przerwane. Odśwież stronę.");
}
function subEntries() {
  if (unsubEntries) unsubEntries();
  unsubEntries = onSnapshot(query(collection(fs, "entries"), where("day", ">=", windowKeys()[0])), s => {
    ENT = s.docs.map(parseEntry).filter(Boolean).sort((a, b) => b.t - a.t);
    rebuildGhosts(); loaded.entries = true; renderAll();
  }, subErr);
}
function subscribe() {
  unsubs.push(onSnapshot(collection(fs, "members"), s => { members = s.docs.map(parseMember).filter(Boolean).sort(byOrder); loaded.members = true; renderAll(); }, subErr));
  unsubs.push(onSnapshot(collection(fs, "chores"), s => { chores = s.docs.map(parseChore).filter(Boolean).sort(byOrder); loaded.chores = true; renderAll(); }, subErr));
  subEntries();
}
function unsubscribeAll() {
  unsubs.forEach(u => u()); unsubs = [];
  if (unsubEntries) { unsubEntries(); unsubEntries = null; }
  members = []; chores = []; ENT = []; ghostM = {}; ghostC = {};
  loaded.members = loaded.chores = loaded.entries = false; tilesSig = "";
}

function checkDay() {
  const k = keyOf(new Date());
  if (k !== todayK) { todayK = k; renderHeader(); if (signedIn) subEntries(); renderAll(); }
}
setInterval(checkDay, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { checkDay(); checkUpdate(); } });

onAuthStateChanged(auth, user => {
  const ok = !!user && user.email === FAMILY_EMAIL;
  if (user && !ok) { signOut(auth); return; }
  if (ok && !signedIn) {
    signedIn = true;
    $("#login").hidden = true; $("#app").hidden = false;
    showNotice("");
    renderHeader(); renderWhen(); renderAll(); subscribe();
  } else if (!ok) {
    signedIn = false; unsubscribeAll();
    $("#app").hidden = true; $("#login").hidden = false;
    setLoginMode(false);
  }
});
