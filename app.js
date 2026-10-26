import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, initializeAuth, inMemoryPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updatePassword, reauthenticateWithCredential, EmailAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, where, getDoc, getDocFromServer, getDocsFromServer, writeBatch }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=20261026-212010";
import { ICON_LIST, guessIcon, iconKey, iconSvg } from "./icons.js?v=20261026-212010";

const BUILD = "20261026-212010";

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
      bar.onclick = () => location.replace(location.pathname + "?v=" + encodeURIComponent(v) + location.hash);
    }
  } catch (e) {}
}
setInterval(checkUpdate, 60000);
setTimeout(checkUpdate, 3000);

const SLOTS = 8;
// dawne kolory (pierwsza wersja) → miejsce w nowej palecie
const LEGACY_COLORS = { "#D9480F": 1, "#1C7ED6": 0, "#2B8A3E": 5, "#7048E8": 6, "#C2255C": 4, "#0C8599": 2, "#E67700": 3, "#8B5E34": 7 };
const ONCE = "_once";
const WINDOW_DAYS = 30;
const SUGGESTIONS = ["Zmywanie naczyń","Odkurzanie","Wyprowadzenie psa","Pranie","Rozwieszenie prania","Podlewanie kwiatów","Zakupy","Gotowanie obiadu","Nakrycie do stołu","Sprzątanie łazienki","Ścielenie łóżka","Karmienie kota","Mycie okien","Prasowanie","Wycieranie kurzu"];
const DAY_ABBR = ["Nd","Pn","Wt","Śr","Cz","Pt","So"];
// Zestaw czynności na start (nowe rodziny dostają go od razu; przy przenosinach dopisywany do istniejących)
const SEED = [
  ["wstawienie-prania", "Wstawienie prania", "washer"],
  ["rozwieszenie-prania-suszarka", "Rozwieszenie prania i wstawienie suszarki", "hanger"],
  ["odkurzenie-przedpokoju", "Odkurzenie całego przedpokoju", "vac_hall"],
  ["odkurzenie-salonu", "Odkurzenie całego salonu", "vac_sofa"],
  ["smieci-i-worki", "Wyrzucenie śmieci (w tym z łazienek) i włożenie worków", "garbage"],
  ["zakupy-domowe", "Zrobienie zakupów domowych", "cart"],
  ["butelki-kaucyjne", "Wyniesienie butelek kaucyjnych", "bottles"],
  ["posilek-2-osoby", "Przygotowanie posiłku dla co najmniej 2 osób", "pot"],
  ["obiad-kupiony-2-osoby", "Kupienie obiadu dla co najmniej 2 osób", "meal"],
  ["wystawienie-zmywarki", "Wystawienie rzeczy ze zmywarki", "dishwasher"],
  ["reczne-naczynia-ociekacz", "Umycie ręczne naczyń i uprzątnięcie ociekacza", "sink"]
];
const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const clean = (s, max) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, max);
// porównywanie nazw bez wielkości liter i polskich znaków („wstawienie prania” = „Wstawienie prania”)
const norm = s => String(s || "").toLowerCase().replace(/ł/g, "l").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
const cleanNote = s => String(s == null ? "" : s).replace(/[\r\n]+/g, " ").trim().slice(0, 200);
const pad = n => String(n).padStart(2, "0");
const keyOf = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const dateOf = k => { const p = k.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
const dayAgo = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
const keysFor = n => Array.from({ length: n }, (_, i) => keyOf(dayAgo(n - 1 - i)));   // od najstarszego
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const fmtDM = k => { const d = dateOf(k); return d.getDate() + "." + pad(d.getMonth() + 1); };
const czynnosc = n => n === 1 ? "czynność" : "czynności";
const wpis = n => n === 1 ? "wpis" : ((n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? "wpisy" : "wpisów");
const byOrder = (a, b) => a.order - b.order || a.name.localeCompare(b.name, "pl");
const validSlot = s => Number.isInteger(s) && s >= 0 && s < SLOTS;
const cvar = slot => "--c:var(--s" + slot + ");--ci:var(--s" + slot + "-ink)";
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
function countBy(arr, k) { const o = {}; for (const x of arr) o[x[k]] = (o[x[k]] || 0) + 1; return o; }
function busy(el) { const a = document.activeElement; return !!(a && a.tagName === "INPUT" && el.contains(a)); }
function hashSlot(id) { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % SLOTS; }

// ---------- konta rodzin: nazwa rodziny + 4-cyfrowy PIN
const DOMAIN = "@" + firebaseConfig.authDomain;
const LEGACY_EMAIL = "rodzina" + DOMAIN;                 // poprzednia wersja: jedno wspólne konto z hasłem
const slugOf = name => norm(name).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
const famEmail = slug => "r." + slug + DOMAIN;
const pinPass = pin => "dyzury-" + pin;                  // Firebase wymaga co najmniej 6 znaków
const isFamEmail = e => typeof e === "string" && e.startsWith("r.") && e.endsWith(DOMAIN);
const PIN_RE = /^\d{4}$/;

function avatar(m, size) {
  const ch = (m.name.trim().charAt(0) || "?").toUpperCase();
  return '<span class="av' + (size ? " " + size : "") + '" style="' + cvar(m.slot) + '" aria-hidden="true">' + esc(ch) + "</span>";
}
function tally(n, slot) {
  const shown = Math.min(n, 20), groups = Math.ceil(shown / 5);
  const gw = 26, w = groups * gw + 2, h = 22;
  let s = "";
  for (let g = 0; g < groups; g++) {
    const inG = Math.min(5, shown - g * 5), x0 = g * gw + 4;
    for (let i = 0; i < Math.min(4, inG); i++) { const x = x0 + i * 5; s += '<line x1="' + x + '" y1="3" x2="' + x + '" y2="19"/>'; }
    if (inG === 5) s += '<line x1="' + (x0 - 2) + '" y1="16" x2="' + (x0 + 17) + '" y2="6"/>';
  }
  return '<svg class="tally" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '" fill="none" style="stroke:var(--s' + slot + ')" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' + s + "</svg>";
}

/* ---------- stan ---------- */
let famId = null, famName = "";
let members = [], chores = [], ENT = [];
let ghostM = {}, ghostC = {};          // osoby i czynności usunięte z list, ale obecne w dawnych wpisach
const loaded = { members: false, chores: false, entries: false };
let unsubs = [], unsubEntries = null;
let selected = null;
let when = "today";
let tab = ["zglos", "wyniki"].includes(location.hash.slice(1)) ? location.hash.slice(1) : (lsGet("dd.tab") === "wyniki" ? "wyniki" : "zglos");
let range = lsGet("dd.range") === "30" ? 30 : 7;
let todayK = keyOf(new Date());
let showAllHist = false, addingChore = false, tilesSig = "";
let newIcon = "check", newIconManual = false;     // wybór ikonki w formularzu „Inna czynność”
let mIcon = "check", mIconManual = false;         // wybór ikonki w Ustawieniach
let iconEdit = null, editNote = null, editMember = null;
let swatch = null, toastAction = null, toastTimer = null;
let flashId = null, flashAt = 0;

// ścieżki danych bieżącej rodziny
const fcol = name => collection(fs, "families", famId, name);
const fdoc = (name, id) => doc(fs, "families", famId, name, id);
const newId = () => doc(collection(fs, "families")).id;

const ready = () => loaded.members && loaded.chores && loaded.entries;
function memberOf(id) { return members.find(m => m.id === id) || ghostM[id] || { id, name: "Usunięta osoba", slot: 7, order: 1e15 }; }
function choreOf(id) {
  if (id === ONCE) return { id: ONCE, name: "Jednorazowe", icon: "check", order: 1e16 };
  return chores.find(c => c.id === id) || ghostC[id] || { id, name: "Usunięta czynność", icon: null, order: 1e15 };
}
const choreIcon = c => iconKey(c.icon, c.name);
const entryName = e => e.once ? (e.cn || "Jednorazowa czynność") : choreOf(e.c).name;
const entryIcon = e => e.once ? iconKey(e.ci, e.cn) : choreIcon(choreOf(e.c));
function entriesIn(keys) { const s = new Set(keys); return ENT.filter(e => s.has(e.day)); }
// stała kolejność domowników na wykresach (kolor i miejsce idą za osobą, nie za wynikiem)
function seriesFor(es) {
  const ids = new Set(members.map(m => m.id)); es.forEach(e => ids.add(e.m));
  return [...ids].map(memberOf).sort(byOrder);
}

function parseMember(d) {
  const x = d.data(); if (!x || typeof x.name !== "string") return null;
  const legacy = LEGACY_COLORS[String(x.color || "").toUpperCase()];
  const slot = validSlot(x.slot) ? x.slot : (legacy != null ? legacy : hashSlot(d.id));
  return { id: d.id, name: clean(x.name, 30) || "Bez imienia", slot, order: Number.isFinite(x.order) ? x.order : 0 };
}
function parseChore(d) {
  const x = d.data(); if (!x || typeof x.name !== "string") return null;
  return { id: d.id, name: clean(x.name, 80) || "Bez nazwy", icon: typeof x.icon === "string" ? x.icon : null, order: Number.isFinite(x.order) ? x.order : 0 };
}
function parseEntry(d) {
  const x = d.data();
  if (!x || typeof x.m !== "string" || typeof x.c !== "string" || typeof x.day !== "string" || !Number.isFinite(x.t)) return null;
  const legacy = LEGACY_COLORS[String(x.mc || "").toUpperCase()];
  return { id: d.id, m: x.m, c: x.c, day: x.day, t: x.t, mn: clean(x.mn, 30),
    ms: validSlot(x.ms) ? x.ms : (legacy != null ? legacy : hashSlot(x.m)),
    cn: clean(x.cn, 80), ci: typeof x.ci === "string" ? x.ci : null, once: x.once === true || x.c === ONCE, d: cleanNote(x.d) };
}
function rebuildGhosts() {
  ghostM = {}; ghostC = {};
  for (const e of ENT) {
    if (!ghostM[e.m]) ghostM[e.m] = { id: e.m, name: e.mn || "Usunięta osoba", slot: e.ms, order: 1e15 };
    if (!e.once && !ghostC[e.c]) ghostC[e.c] = { id: e.c, name: e.cn || "Usunięta czynność", icon: e.ci, order: 1e15 };
  }
}

/* ---------- wybór ikonki ---------- */
function pickerHtml(sel, action, id) {
  return ICON_LIST.map(([k, label]) => '<button type="button" class="ipk" role="radio" aria-checked="' + (k === sel) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '" data-action="' + action + '" data-icon="' + k + '"' + (id ? ' data-id="' + esc(id) + '"' : "") + ">" + iconSvg(k) + "</button>").join("");
}
function markPicker(container, sel) {
  container.querySelectorAll(".ipk").forEach(b => b.setAttribute("aria-checked", String(b.dataset.icon === sel)));
}

/* ---------- widok: wspólne ---------- */
function renderHeader() {
  const s = new Intl.DateTimeFormat("pl-PL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("#today-label").textContent = s.charAt(0).toUpperCase() + s.slice(1);
  $("#ver").textContent = "wersja " + BUILD;
}
function renderFam() {
  $("#fam-label").textContent = famName ? "Rodzina: " + famName : "";
  $("#fam-info").textContent = famName
    ? "Domownicy logują się nazwą „" + famName + "” i Waszym 4-cyfrowym PIN-em."
    : "Domownicy logują się nazwą rodziny i Waszym 4-cyfrowym PIN-em.";
}
function renderTabs() {
  for (const t of ["zglos", "wyniki"]) {
    $("#tab-" + t).hidden = t !== tab;
    $("#tab-btn-" + t).setAttribute("aria-selected", String(t === tab));
  }
}
function renderSegs() {
  document.querySelectorAll('[data-action="when"]').forEach(b => b.setAttribute("aria-checked", String(b.dataset.when === when)));
  document.querySelectorAll('[data-action="range"]').forEach(b => b.setAttribute("aria-checked", String(Number(b.dataset.range) === range)));
}

function entryRow(e) {
  const m = memberOf(e.m);
  let h = '<li class="hrow">' + avatar(m) + '<div class="htext"><div class="hmain"><span class="ic xs">' + iconSvg(entryIcon(e)) + "</span><b>" + esc(entryName(e)) + "</b>" +
    (e.once ? '<span class="tag">jednorazowa</span>' : "") + '</div><div class="hmeta">' + esc(m.name) + " · " + hhmm(e.t) + "</div>";
  if (editNote === e.id) {
    h += '<form class="note-form" data-form="note" data-id="' + esc(e.id) + '" autocomplete="off"><input maxlength="200" aria-label="Opis czynności" placeholder="Opis czynności" value="' + esc(e.d) + '">' +
      '<div class="row"><button class="btn primary sm" type="submit">Zapisz opis</button><button type="button" class="btn ghost sm" data-action="note-cancel">Anuluj</button></div></form>';
  } else if (e.d) h += '<p class="note">' + esc(e.d) + "</p>";
  h += '</div><div class="hact"><button type="button" class="act" data-action="note" data-id="' + esc(e.id) + '">' + (e.d ? "Edytuj" : "Opis") + "</button>" +
    '<button type="button" class="act del" data-action="del" data-id="' + esc(e.id) + '">Usuń</button></div></li>';
  return h;
}

/* ---------- widok: Zgłoś ---------- */
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
    el.innerHTML = members.map(m => '<button type="button" class="chip' + (m.id === selected ? " on" : "") + '" data-action="pick" data-id="' + esc(m.id) + '" aria-pressed="' + (m.id === selected) + '" style="' + cvar(m.slot) + '">' + avatar(m) + "<span>" + esc(m.name) + "</span></button>").join("");
  }
  $("#who-hint").hidden = !(members.length > 1 && !selected);
}

function renderTiles(force) {
  const el = $("#tiles");
  if (!force && busy(el)) return;
  if (!loaded.chores) { el.innerHTML = '<p class="muted span">Wczytywanie czynności…</p>'; tilesSig = ""; return; }
  const dis = !selected;
  const sig = JSON.stringify([chores.map(c => [c.id, c.name, choreIcon(c)]), dis, addingChore]);
  if (sig !== tilesSig) {
    tilesSig = sig;
    let html = "";
    if (!chores.length) html += '<p class="muted span">Nie ma jeszcze żadnej czynności. Dodaj ją kafelkiem „Inna czynność” albo w Ustawieniach.</p>';
    html += chores.map(c => '<button type="button" class="tile" data-action="log" data-id="' + esc(c.id) + '"' + (dis ? " disabled" : "") + ">" +
      '<span class="ic">' + iconSvg(choreIcon(c)) + '</span><span class="tname' + (c.name.length > 30 ? " long" : "") + '">' + esc(c.name) + "</span>" +
      '<span class="badge" hidden></span><span class="tick">' + TICK_SVG + "</span></button>").join("");
    html += addingChore
      ? '<form class="tile tile-form" data-form="tile-chore" autocomplete="off">' +
        '<label class="tname" for="tile-chore">Inna czynność</label>' +
        '<input id="tile-chore" maxlength="80" placeholder="Np. Mycie samochodu">' +
        '<div class="icon-pick" id="tile-icons" role="radiogroup" aria-label="Ikonka">' + pickerHtml(newIcon, "tile-icon") + "</div>" +
        '<label class="check"><input type="checkbox" id="tile-once"><span>Jednorazowa<small>Nie dodawaj jej do listy czynności</small></span></label>' +
        '<div class="row"><button class="btn primary sm" type="submit">Zgłoś</button><button type="button" class="btn ghost sm" data-action="cancel-chore">Anuluj</button></div></form>'
      : '<button type="button" class="tile add" data-action="add-chore"><span class="ic">+</span><span class="tname">Inna czynność</span></button>';
    el.innerHTML = html;
  }
  const counts = countBy(entriesIn([todayK]), "c");
  el.querySelectorAll(".tile[data-id]").forEach(b => {
    const n = counts[b.dataset.id] || 0, bd = b.querySelector(".badge");
    bd.textContent = n ? "dziś " + n + "×" : ""; bd.hidden = !n;
    if (b.dataset.id === flashId && Date.now() - flashAt < 300 && !b.classList.contains("flash")) b.classList.add("flash");
  });
}

function renderRecent() {
  const el = $("#recent");
  if (busy(el)) return;
  if (!ready()) { el.innerHTML = '<p class="loading">Wczytywanie…</p>'; return; }
  const es = entriesIn([todayK]);
  $("#recent-meta").textContent = es.length ? es.length + " " + wpis(es.length) : "";
  el.innerHTML = es.length ? '<ul class="list">' + es.map(entryRow).join("") + "</ul>"
    : '<p class="loading">Dziś jeszcze nic nie zgłoszono. Wybierz osobę i dotknij czynności.</p>';
}

/* ---------- widok: Wyniki ---------- */
function renderToday() {
  const el = $("#today-list");
  if (!ready()) { el.innerHTML = '<p class="loading">Wczytywanie…</p>'; return; }
  const es = entriesIn([todayK]);
  $("#today-total").textContent = es.length ? "razem " + es.length + " " + czynnosc(es.length) : "";
  const series = seriesFor(es);
  if (!series.length) { el.innerHTML = '<p class="loading">Gdy dodasz domowników, zobaczysz tu, kto co dziś zrobił.</p>'; return; }
  const rows = series.map(m => ({ m, mine: es.filter(e => e.m === m.id) })).sort((a, b) => b.mine.length - a.mine.length || byOrder(a.m, b.m));
  el.innerHTML = '<ul class="list">' + rows.map(r => {
    const n = r.mine.length;
    const done = n ? r.mine.slice().sort((a, b) => a.t - b.t).map(e => '<span class="done">' + esc(entryName(e)) + "<time>" + hhmm(e.t) + "</time></span>").join("") : '<span class="muted">jeszcze nic</span>';
    return '<li class="trow"><div class="who-cell">' + avatar(r.m) + '<span class="nm">' + esc(r.m.name) + "</span></div>" +
      '<div class="cnt-cell">' + (n ? tally(n, r.m.slot) : "") + '<span class="big" aria-label="' + n + " " + czynnosc(n) + '">' + n + "</span></div>" +
      '<div class="done-list">' + done + "</div></li>";
  }).join("") + "</ul>";
}

function renderRanking(keys, es, series) {
  const el = $("#ranking");
  $("#rank-meta").textContent = es.length ? "razem " + es.length : "";
  if (!series.length) { el.innerHTML = '<p class="loading">Tu pojawi się, kto ile razy i co robił.</p>'; return; }
  const rows = series.map(m => { const mine = es.filter(e => e.m === m.id); return { m, n: mine.length, mine }; }).sort((a, b) => b.n - a.n || byOrder(a.m, b.m));
  const max = Math.max(1, ...rows.map(r => r.n));
  el.innerHTML = rows.map(r => {
    const by = {}; for (const e of r.mine) { const k = entryName(e); by[k] = (by[k] || 0) + 1; }
    const all = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const parts = all.slice(0, 4).map(([name, n]) => esc(name) + " " + n + "×").join(" · ") + (all.length > 4 ? " · i " + (all.length - 4) + " " + (all.length - 4 === 1 ? "inna" : "inne") : "");
    return '<div class="bar-row"><div class="who-cell">' + avatar(r.m) + '<span class="nm">' + esc(r.m.name) + "</span></div>" +
      '<div class="track" role="img" aria-label="' + esc(r.m.name) + ": " + r.n + " " + czynnosc(r.n) + '"><span class="fill" style="' + cvar(r.m.slot) + ";width:" + (r.n / max * 100).toFixed(1) + '%"></span></div>' +
      '<span class="num">' + r.n + '</span><p class="breakdown">' + (parts || "brak wpisów") + "</p></div>";
  }).join("");
}

function renderShare(es, series) {
  const el = $("#share-card");
  const rows = series.map(m => ({ m, n: es.filter(e => e.m === m.id).length })).filter(r => r.n > 0);
  if (!es.length) { el.innerHTML = '<p class="chart-sub">Brak wpisów w tym okresie.</p>'; return; }
  const total = es.length;
  const pct = n => Math.round(n / total * 100);
  if (rows.length === 1) {
    el.innerHTML = '<p class="chart-sub">Wszystkie ' + total + " " + czynnosc(total) + " w tym okresie zrobił(a)</p>" +
      '<div class="who-cell">' + avatar(rows[0].m) + '<span class="nm" style="font-size:20px">' + esc(rows[0].m.name) + "</span></div>";
    return;
  }
  el.innerHTML = '<p class="chart-sub">Część wszystkich ' + total + " " + czynnosc(total) + " w wybranym okresie</p>" +
    '<div class="share" id="share-bar" tabindex="0" role="img" aria-label="' + esc(rows.map(r => r.m.name + " " + pct(r.n) + "%").join(", ")) + '">' +
    rows.map(r => '<span class="sg" style="' + cvar(r.m.slot) + ";flex-grow:" + r.n + '"></span>').join("") + "</div>" +
    '<ul class="list share-list">' + series.map(m => { const n = es.filter(e => e.m === m.id).length;
      return '<li><i style="' + cvar(m.slot) + '"></i><b>' + pct(n) + "%</b><span>" + esc(m.name) + '</span><span class="muted">· ' + n + "</span></li>"; }).join("") + "</ul>";
  const bar = $("#share-bar");
  const tipRows = () => ({ title: "Udział w " + total + " " + czynnosc(total), rows: series.map(m => { const n = es.filter(e => e.m === m.id).length; return { slot: m.slot, label: m.name, value: n + " (" + pct(n) + "%)" }; }) });
  bindTip(bar, tipRows);
}

// skala osi: okrągłe wartości, najwyżej 4 podziałki
function niceScale(max) {
  for (const step of [1, 2, 5, 10, 20, 50, 100, 200, 500]) { const top = Math.ceil(max / step) * step; if (top / step <= 4) return { top, step }; }
  return { top: max, step: max };
}
function roundTop(x, y, w, h, r) {
  r = Math.min(r, h, w / 2);
  return "M" + x + "," + (y + h) + "V" + (y + r) + "A" + r + "," + r + " 0 0 1 " + (x + r) + "," + y + "H" + (x + w - r) + "A" + r + "," + r + " 0 0 1 " + (x + w) + "," + (y + r) + "V" + (y + h) + "Z";
}
function renderDaily(keys, es, series) {
  const box = $("#chart-daily"), leg = $("#daily-legend");
  leg.innerHTML = series.map(m => '<span class="lg"><i style="' + cvar(m.slot) + '"></i>' + esc(m.name) + "</span>").join("");
  if ($("#tab-wyniki").hidden) return;
  const W = Math.max(260, box.clientWidth || 320), H = 224;
  const padL = 26, padR = 4, padT = 20, padB = 34;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const per = keys.map(k => { const day = es.filter(e => e.day === k); return { k, total: day.length, by: countBy(day, "m") }; });
  const maxT = Math.max(1, ...per.map(p => p.total));
  const { top, step } = niceScale(maxT);
  const y = v => padT + plotH - (v / top) * plotH;
  const band = plotW / keys.length, bw = Math.min(24, Math.max(4, band * 0.62));
  let s = '<svg viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Liczba czynności dzień po dniu">';
  for (let v = step; v <= top; v += step) s += '<line class="gl" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(v) + '" y2="' + y(v) + '"/>';
  for (let v = 0; v <= top; v += step) s += '<text class="ax" x="' + (padL - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + "</text>";
  const maxIdx = per.reduce((bi, p, i) => p.total > per[bi].total ? i : bi, 0);
  per.forEach((p, i) => {
    const x = padL + band * i + (band - bw) / 2;
    let yCur = y(0), first = true, segs = [];
    for (const m of series) {
      const v = p.by[m.id] || 0; if (!v) continue;
      const h = (v / top) * plotH;
      segs.push({ m, top: yCur - h, bottom: yCur - (first ? 0 : 2) });
      yCur -= h; first = false;
    }
    s += '<g class="col" data-i="' + i + '">';
    segs.forEach((g, j) => {
      const hh = g.bottom - g.top; if (hh <= 0.5) return;
      const fill = 'style="fill:var(--s' + g.m.slot + ')"';
      s += j === segs.length - 1 ? '<path d="' + roundTop(x, g.top, bw, hh, 4) + '" ' + fill + "/>" : '<rect x="' + x + '" y="' + g.top + '" width="' + bw + '" height="' + hh + '" ' + fill + "/>";
    });
    if (p.total && (range === 7 || i === maxIdx)) s += '<text class="cap" x="' + (x + bw / 2) + '" y="' + (y(p.total) - 6) + '" text-anchor="middle">' + p.total + "</text>";
    s += "</g>";
    const d = dateOf(p.k), isToday = p.k === todayK;
    const showLabel = range === 7 || isToday || (keys.length - 1 - i) % 7 === 0;
    if (showLabel) {
      const cx = padL + band * i + band / 2;
      if (range === 7) s += '<text class="ax' + (isToday ? " today" : "") + '" x="' + cx + '" y="' + (H - padB + 15) + '" text-anchor="middle">' + (isToday ? "Dziś" : DAY_ABBR[d.getDay()]) + "</text>";
      s += '<text class="ax' + (isToday ? " today" : "") + '" x="' + cx + '" y="' + (H - padB + (range === 7 ? 29 : 15)) + '" text-anchor="middle">' + fmtDM(p.k) + "</text>";
    }
  });
  s += '<line class="base" x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
  per.forEach((p, i) => { s += '<rect class="hit" tabindex="0" data-i="' + i + '" x="' + (padL + band * i) + '" y="' + padT + '" width="' + band + '" height="' + plotH + '"/>'; });
  s += "</svg>";
  box.innerHTML = s;
  const svg = box.querySelector("svg");
  box.querySelectorAll(".hit").forEach(hit => {
    const i = Number(hit.dataset.i), p = per[i];
    const lbl = p.k === todayK ? "Dziś, " + fmtDM(p.k) : new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(dateOf(p.k)) + ", " + fmtDM(p.k);
    bindTip(hit, () => ({ title: lbl + " · razem " + p.total, rows: series.map(m => ({ slot: m.slot, label: m.name, value: String(p.by[m.id] || 0) })) }),
      on => { svg.classList.toggle("dim", on); svg.querySelectorAll(".col").forEach(c => c.classList.toggle("hot", on && Number(c.dataset.i) === i)); });
  });
}

function renderChoreChart(es, series) {
  const el = $("#chores-chart"), leg = $("#chores-legend");
  leg.innerHTML = series.map(m => '<span class="lg"><i style="' + cvar(m.slot) + '"></i>' + esc(m.name) + "</span>").join("");
  const groups = {};
  for (const e of es) {
    const key = e.once ? ONCE : e.c;
    (groups[key] ||= { key, name: e.once ? "Jednorazowe" : entryName(e), icon: e.once ? "check" : entryIcon(e), list: [] }).list.push(e);
  }
  const rows = Object.values(groups).sort((a, b) => b.list.length - a.list.length || a.name.localeCompare(b.name, "pl"));
  if (!rows.length) { el.innerHTML = '<p class="chart-sub">Brak wpisów w tym okresie.</p>'; return; }
  const max = Math.max(...rows.map(r => r.list.length));
  el.innerHTML = rows.map((r, i) => {
    const by = countBy(r.list, "m");
    const segs = series.filter(m => by[m.id]).map(m => '<span class="sg" style="' + cvar(m.slot) + ";flex-grow:" + by[m.id] + '"></span>').join("");
    return '<div class="cb" tabindex="0" data-i="' + i + '"><div class="cb-name"><span class="ic sm">' + iconSvg(r.icon) + "</span><span>" + esc(r.name) + "</span></div>" +
      '<div class="cb-bar"><div class="cb-stack" style="width:calc((100% - 3rem) * ' + (r.list.length / max).toFixed(4) + ')">' + segs + '</div><span class="cb-val">' + r.list.length + "</span></div></div>";
  }).join("");
  el.querySelectorAll(".cb").forEach(node => {
    const r = rows[Number(node.dataset.i)], by = countBy(r.list, "m");
    bindTip(node, () => ({ title: r.name + " · razem " + r.list.length, rows: series.filter(m => by[m.id]).map(m => ({ slot: m.slot, label: m.name, value: String(by[m.id]) })) }));
  });
}

function dayLabel(k) {
  const d = dateOf(k);
  if (k === todayK) return 'Dziś<span class="dd">' + fmtDM(k) + "</span>";
  if (k === keyOf(dayAgo(1))) return 'Wczoraj<span class="dd">' + fmtDM(k) + "</span>";
  return DAY_ABBR[d.getDay()] + '<span class="dd">' + fmtDM(k) + "</span>";
}
function cell(n, slot, max) {
  if (!n) return '<td><span class="zero">·</span></td>';
  const p = Math.round(18 + 62 * (n / max));
  return '<td><span class="cnt' + (p >= 52 ? " s" : "") + '" style="' + cvar(slot) + ";--p:" + p + '%">' + n + "</span></td>";
}
function renderTable(keys, es, series) {
  const tbl = $("#week-table");
  if (!series.length) { tbl.innerHTML = ""; return; }
  const byDay = {}, byCh = {};
  for (const m of series) { byDay[m.id] = countBy(es.filter(e => e.m === m.id), "day"); }
  const groups = {};
  for (const e of es) { const key = e.once ? ONCE : e.c; (groups[key] ||= { key, name: e.once ? "Jednorazowe" : entryName(e), icon: e.once ? "check" : entryIcon(e), list: [] }).list.push(e); }
  for (const c of chores) if (!groups[c.id]) groups[c.id] = { key: c.id, name: c.name, icon: choreIcon(c), list: [] };
  const cRows = Object.values(groups).sort((a, b) => b.list.length - a.list.length || a.name.localeCompare(b.name, "pl"));
  cRows.forEach(r => { byCh[r.key] = countBy(r.list, "m"); });
  const dayMax = Math.max(1, ...series.flatMap(m => keys.map(k => byDay[m.id][k] || 0)));
  const chMax = Math.max(1, ...cRows.flatMap(r => series.map(m => byCh[r.key][m.id] || 0)));
  const span = series.length + 2, zero = '<span class="zero">·</span>';
  let h = '<thead><tr><th scope="col"></th>' + series.map(m => '<th scope="col" class="mh">' + avatar(m, "sm") + '<span class="mhn">' + esc(m.name) + "</span></th>").join("") + '<th scope="col" class="tot">Razem</th></tr></thead>';
  h += '<tbody><tr class="grp"><th colspan="' + span + '" scope="colgroup">Dzień po dniu</th></tr>';
  for (const k of keys.slice().reverse()) {
    const tot = es.filter(e => e.day === k).length;
    h += "<tr" + (k === todayK ? ' class="is-today"' : "") + '><th scope="row">' + dayLabel(k) + "</th>" + series.map(m => cell(byDay[m.id][k] || 0, m.slot, dayMax)).join("") + '<td class="tot">' + (tot || zero) + "</td></tr>";
  }
  h += '<tr class="sum"><th scope="row">Razem</th>' + series.map(m => "<td>" + es.filter(e => e.m === m.id).length + "</td>").join("") + '<td class="tot">' + es.length + "</td></tr></tbody>";
  if (cRows.length) {
    h += '<tbody><tr class="grp"><th colspan="' + span + '" scope="colgroup">Kto co robił</th></tr>';
    for (const r of cRows) h += '<tr><th scope="row"><span class="cname"><span class="ic sm">' + iconSvg(r.icon) + "</span>" + esc(r.name) + "</span></th>" + series.map(m => cell(byCh[r.key][m.id] || 0, m.slot, chMax)).join("") + '<td class="tot">' + (r.list.length || zero) + "</td></tr>";
    h += "</tbody>";
  }
  tbl.innerHTML = h;
}

function renderHistory(keys, es) {
  const el = $("#history");
  if (busy(el)) return;
  $("#hist-meta").textContent = es.length ? es.length + " " + wpis(es.length) : "";
  if (!es.length) { el.innerHTML = '<p class="loading">Brak wpisów w tym okresie.</p>'; return; }
  const LIMIT = 20, list = showAllHist ? es : es.slice(0, LIMIT), groups = [];
  for (const e of list) { let g = groups[groups.length - 1]; if (!g || g.day !== e.day) { g = { day: e.day, items: [] }; groups.push(g); } g.items.push(e); }
  let h = "";
  for (const g of groups) {
    const lbl = g.day === todayK ? "Dziś" : (g.day === keyOf(dayAgo(1)) ? "Wczoraj" : new Intl.DateTimeFormat("pl-PL", { weekday: "long" }).format(dateOf(g.day)));
    h += '<p class="hday">' + esc(lbl) + " · " + fmtDM(g.day) + '</p><ul class="list">' + g.items.map(entryRow).join("") + "</ul>";
  }
  if (es.length > LIMIT) h += '<button type="button" class="btn ghost sm more" data-action="more-hist">' + (showAllHist ? "Pokaż mniej" : "Pokaż wszystkie (" + es.length + ")") + "</button>";
  el.innerHTML = h;
}

function renderResults() {
  const keys = keysFor(range);
  $("#range-label").textContent = fmtDM(keys[0]) + " – " + fmtDM(keys[keys.length - 1]);
  renderToday();
  if (!ready()) return;
  const es = entriesIn(keys), series = seriesFor(es);
  renderRanking(keys, es, series);
  renderShare(es, series);
  renderDaily(keys, es, series);
  renderChoreChart(es, series);
  renderTable(keys, es, series);
  renderHistory(keys, es);
}

/* ---------- podpowiedź (tooltip) ---------- */
const tipEl = $("#tip");
let tipOwner = null;
function showTip(target, data) {
  tipEl.textContent = "";
  const t = document.createElement("div"); t.className = "tip-t"; t.textContent = data.title; tipEl.appendChild(t);
  for (const r of data.rows) {
    const row = document.createElement("div"); row.className = "tip-r";
    const i = document.createElement("i"); i.setAttribute("style", cvar(r.slot));
    const b = document.createElement("b"); b.textContent = r.value;
    const sp = document.createElement("span"); sp.textContent = r.label;
    row.append(i, b, sp); tipEl.appendChild(row);
  }
  tipEl.hidden = false;
  const rc = target.getBoundingClientRect(), tw = tipEl.offsetWidth, th = tipEl.offsetHeight;
  let left = Math.min(Math.max(8, rc.left + rc.width / 2 - tw / 2), window.innerWidth - tw - 8);
  let top = rc.top - th - 8; if (top < 8) top = Math.min(rc.bottom + 8, window.innerHeight - th - 8);
  tipEl.style.left = left + "px"; tipEl.style.top = top + "px";
}
function hideTip() { tipEl.hidden = true; if (tipOwner && tipOwner.off) tipOwner.off(); tipOwner = null; }
function bindTip(node, getData, highlight) {
  const on = () => { if (tipOwner && tipOwner.node !== node) hideTip(); tipOwner = { node, off: () => highlight && highlight(false) }; if (highlight) highlight(true); showTip(node, getData()); };
  node.addEventListener("pointerenter", on);
  node.addEventListener("pointerdown", on);
  node.addEventListener("focus", on);
  node.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") hideTip(); });
  node.addEventListener("blur", hideTip);
}
document.addEventListener("pointerdown", e => { if (tipOwner && !tipOwner.node.contains(e.target)) hideTip(); }, true);
window.addEventListener("scroll", () => { if (!tipEl.hidden) hideTip(); }, { passive: true });
let resizeT = null;
window.addEventListener("resize", () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (famId && tab === "wyniki" && ready()) { const keys = keysFor(range), es = entriesIn(keys); renderDaily(keys, es, seriesFor(es)); } }, 150); });

/* ---------- Ustawienia ---------- */
function memberRow(m) {
  if (editMember === m.id) {
    return '<li class="mrow"><form class="edit-form" data-form="rename-m" data-id="' + esc(m.id) + '" autocomplete="off">' + avatar(m) +
      '<input maxlength="30" aria-label="Nowe imię: ' + esc(m.name) + '" value="' + esc(m.name) + '">' +
      '<div class="row"><button class="btn primary sm" type="submit">Zapisz</button><button type="button" class="btn ghost sm" data-action="rename-cancel">Anuluj</button></div></form></li>';
  }
  return '<li class="mrow">' + avatar(m) + '<span class="nm">' + esc(m.name) + "</span>" +
    '<button type="button" class="btn ghost sm" data-action="rename-m" data-id="' + esc(m.id) + '">Zmień imię</button>' +
    '<button type="button" class="btn ghost sm" data-action="del-m" data-id="' + esc(m.id) + '">Usuń</button></li>';
}
function renderManage() {
  const ml = $("#m-list"), cl = $("#c-list");
  if (!busy(ml)) {
    if (!loaded.members) ml.innerHTML = '<li class="mrow muted">Wczytywanie…</li>';
    else ml.innerHTML = (members.length ? "" : '<li class="mrow muted">Nikogo jeszcze nie ma.</li>') + members.map(memberRow).join("");
  }
  if (!loaded.chores) cl.innerHTML = '<li class="mrow muted">Wczytywanie…</li>';
  else cl.innerHTML = (chores.length ? "" : '<li class="mrow muted">Brak czynności.</li>') +
    chores.map(c => '<li class="mrow"><button type="button" class="icbtn" data-action="chg-icon" data-id="' + esc(c.id) + '" aria-expanded="' + (iconEdit === c.id) + '" aria-label="Zmień ikonkę: ' + esc(c.name) + '">' + iconSvg(choreIcon(c)) + '</button><span class="nm">' + esc(c.name) + '</span><button type="button" class="btn ghost sm" data-action="del-c" data-id="' + esc(c.id) + '">Usuń</button></li>' +
      (iconEdit === c.id ? '<li class="pick-row"><div class="icon-pick" role="radiogroup" aria-label="Ikonka: ' + esc(c.name) + '">' + pickerHtml(choreIcon(c), "set-icon", c.id) + "</div></li>" : "")).join("");
  const used = new Set(members.map(m => m.slot));
  if (swatch == null || used.has(swatch)) { const free = [...Array(SLOTS).keys()].find(s => !used.has(s)); swatch = free != null ? free : (swatch != null ? swatch : 0); }
  $("#swatches").innerHTML = [...Array(SLOTS).keys()].map(s => '<button type="button" class="sw" role="radio" aria-checked="' + (s === swatch) + '" aria-label="Kolor ' + (s + 1) + '" data-action="swatch" data-slot="' + s + '" style="' + cvar(s) + '"></button>').join("");
  const ci = $("#c-icons"); if (!ci.children.length) ci.innerHTML = pickerHtml(mIcon, "m-icon"); else markPicker(ci, mIcon);
  const have = new Set(chores.map(c => norm(c.name)));
  const sug = SUGGESTIONS.filter(s => !have.has(norm(s)));
  $("#sugg").innerHTML = sug.map(s => '<button type="button" class="sugg-chip" data-action="sugg" data-name="' + esc(s) + '">+ ' + esc(s) + "</button>").join("");
  $("#sugg-lbl").hidden = !sug.length;
  $("#app-url").textContent = location.origin + location.pathname;
}

function renderAll() {
  renderWho(); renderTiles(); renderRecent(); renderResults(); renderManage();
}

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
  if (e && e.code === "permission-denied") toast("Baza odmówiła zapisu. Sprawdź, czy w Firestore są wklejone najnowsze reguły.", null, "err");
  else toast("Nie udało się zapisać. Spróbuj jeszcze raz.", null, "err");
}

/* ---------- zapis ---------- */
// zapisuje wykonanie: chore = {id, name, icon} albo jednorazowa {once:true, name, icon}
function logEntry(chore) {
  if (!selected) { toast("Najpierw wybierz, kto to zrobił.", null, "err"); return false; }
  const m = memberOf(selected);
  const d = new Date();
  if (when === "yesterday") d.setDate(d.getDate() - 1);
  const day = keyOf(d), id = newId();
  const note = cleanNote($("#note").value);
  const data = { m: m.id, mn: m.name, ms: m.slot, c: chore.once ? ONCE : chore.id, cn: chore.name, ci: chore.icon || guessIcon(chore.name), day, t: d.getTime() };
  if (chore.once) data.once = true;
  if (note) data.d = note;
  if (!chore.once) {
    flashId = chore.id; flashAt = Date.now();
    const btn = document.querySelector('#tiles .tile[data-id="' + CSS.escape(chore.id) + '"]');
    if (btn) { btn.classList.remove("flash"); void btn.offsetWidth; btn.classList.add("flash"); }
  }
  $("#note").value = "";
  const ref = fdoc("entries", id);
  toast(m.name + ": " + chore.name + (when === "yesterday" ? " (wczoraj)" : ""), { label: "Cofnij", fn: () => {
    deleteDoc(ref).then(() => toast("Cofnięto wpis.")).catch(handleErr);
  } });
  setDoc(ref, data).catch(handleErr);
  return true;
}

async function addMember(raw) {
  const name = clean(raw, 30);
  if (!name) return false;
  if (members.some(m => norm(m.name) === norm(name))) { toast(name + " już jest na liście."); return false; }
  const used = new Set(members.map(m => m.slot));
  const slot = (swatch != null && !used.has(swatch)) ? swatch : ([...Array(SLOTS).keys()].find(s => !used.has(s)) ?? (members.length % SLOTS));
  setDoc(fdoc("members", newId()), { name, slot, order: Date.now() }).catch(handleErr);
  toast("Dodano: " + name);
  return true;
}
function renameMember(id, raw) {
  const name = clean(raw, 30), m = members.find(x => x.id === id);
  if (!m) return true;
  if (!name) { toast("Imię nie może być puste.", null, "err"); return false; }
  if (members.some(x => x.id !== id && norm(x.name) === norm(name))) { toast(name + " już jest na liście.", null, "err"); return false; }
  if (name !== m.name) { updateDoc(fdoc("members", id), { name }).then(() => toast("Zmieniono imię na: " + name)).catch(handleErr); }
  return true;
}
function addChore(raw, icon) {
  const name = clean(raw, 80);
  if (!name) return null;
  const existing = chores.find(c => norm(c.name) === norm(name));
  if (existing) return existing;
  const ch = { id: newId(), name, icon: icon || guessIcon(name) };
  setDoc(fdoc("chores", ch.id), { name, icon: ch.icon, order: Date.now() }).catch(handleErr);
  return ch;
}

// drugie dotknięcie w ciągu 3 s potwierdza akcję
function confirmThen(btn, label, fn) {
  if (btn.dataset.confirm) { resetConfirm(btn); fn(); return; }
  btn.dataset.confirm = String(Date.now()); btn.dataset.label = btn.textContent;
  btn.textContent = label; btn.classList.add("warn");
  const stamp = btn.dataset.confirm;
  setTimeout(() => { if (btn.isConnected && btn.dataset.confirm === stamp) resetConfirm(btn); }, 3000);
}
function resetConfirm(btn) {
  if (btn.dataset.label) btn.textContent = btn.dataset.label;
  delete btn.dataset.confirm; delete btn.dataset.label; btn.classList.remove("warn");
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
  if ($("#manage").hidden) return;
  $("#manage").hidden = true; iconEdit = null; editMember = null;
  document.documentElement.style.overflow = "";
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

function setTab(t) {
  tab = t; lsSet("dd.tab", t); hideTip();
  try { history.replaceState(null, "", "#" + t); } catch (e) {}
  renderTabs();
  if (t === "wyniki") renderResults();
  window.scrollTo({ top: 0 });
}
function logout() { closeManage(); signOut(auth); }

/* ---------- zdarzenia ---------- */
document.addEventListener("click", e => {
  const b = e.target.closest("[data-action]");
  if (!b) return;
  const a = b.dataset.action, id = b.dataset.id;
  if (a === "pick") { selected = id; lsSet("dd.member." + famId, selected); renderWho(); renderTiles(); }
  else if (a === "tab") { setTab(b.dataset.tab); }
  else if (a === "when") { when = b.dataset.when; renderSegs(); }
  else if (a === "range") { range = Number(b.dataset.range) === 30 ? 30 : 7; lsSet("dd.range", String(range)); showAllHist = false; renderSegs(); renderResults(); }
  else if (a === "log") { const c = chores.find(x => x.id === id); if (c) logEntry({ id: c.id, name: c.name, icon: choreIcon(c) }); }
  else if (a === "add-chore") { addingChore = true; newIcon = "check"; newIconManual = false; renderTiles(true); const i = $("#tile-chore"); if (i) i.focus(); }
  else if (a === "cancel-chore") { addingChore = false; renderTiles(true); }
  else if (a === "tile-icon") { newIcon = b.dataset.icon; newIconManual = true; markPicker($("#tile-icons"), newIcon); }
  else if (a === "m-icon") { mIcon = b.dataset.icon; mIconManual = true; markPicker($("#c-icons"), mIcon); }
  else if (a === "chg-icon") { iconEdit = iconEdit === id ? null : id; renderManage(); }
  else if (a === "set-icon") { const ic = b.dataset.icon; iconEdit = null; updateDoc(fdoc("chores", id), { icon: ic }).catch(handleErr); renderManage(); }
  else if (a === "rename-m") { editMember = id; renderManage(); const i = $('#m-list form[data-form="rename-m"] input'); if (i) { i.focus(); i.select(); } }
  else if (a === "rename-cancel") { editMember = null; if (document.activeElement) document.activeElement.blur(); renderManage(); }
  else if (a === "open-manage") { openManage(); }
  else if (a === "close-manage") { closeManage(); }
  else if (a === "toast-act") { const f = toastAction; toastAction = null; $("#toast").hidden = true; if (f) f(); }
  else if (a === "del") { confirmThen(b, "Na pewno?", () => { deleteDoc(fdoc("entries", id)).then(() => toast("Usunięto wpis.")).catch(handleErr); }); }
  else if (a === "note") { editNote = id; renderRecent(); renderResults(); const f = $("#tab-" + tab).querySelector('form[data-form="note"][data-id="' + CSS.escape(id) + '"] input'); if (f) f.focus(); }
  else if (a === "note-cancel") { editNote = null; if (document.activeElement) document.activeElement.blur(); renderRecent(); renderResults(); }
  else if (a === "more-hist") { showAllHist = !showAllHist; renderResults(); }
  else if (a === "swatch") { swatch = Number(b.dataset.slot); renderManage(); }
  else if (a === "del-m") { confirmThen(b, "Na pewno?", () => { deleteDoc(fdoc("members", id)).catch(handleErr); }); }
  else if (a === "del-c") { confirmThen(b, "Na pewno?", () => { deleteDoc(fdoc("chores", id)).catch(handleErr); }); }
  else if (a === "sugg") { const name = b.dataset.name; if (addChore(name)) toast("Dodano czynność: " + name); }
  else if (a === "copy-url") { copyUrl(b); }
  else if (a === "logout") { confirmThen(b, "Na pewno?", logout); }
  else if (a === "login-mode") { setLoginMode(b.dataset.mode); }
  else if (a === "legacy-out") { signOut(auth); }
});

document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "tile-chore" && !newIconManual) { newIcon = guessIcon(t.value); const p = $("#tile-icons"); if (p) markPicker(p, newIcon); }
  if (t.id === "c-name" && !mIconManual) { mIcon = guessIcon(t.value); markPicker($("#c-icons"), mIcon); }
  if (t.classList && t.classList.contains("pin")) {
    const v = t.value.replace(/\D/g, "").slice(0, 4);
    if (v !== t.value) t.value = v;
    // logowanie: po wpisaniu 4. cyfry od razu wchodzimy
    if (t.id === "pin" && loginMode === "login" && v.length === 4 && clean($("#fam-name").value, 30)) $("#login-form").requestSubmit();
  }
});

document.addEventListener("submit", async e => {
  const f = e.target.closest("form[data-form]");
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form, input = f.querySelector("input"), val = input ? input.value : "";
  if (kind === "member" || kind === "quick-member") {
    if (await addMember(val) && input) input.value = "";
    if (kind === "quick-member" && input) input.blur();
  } else if (kind === "rename-m") {
    if (renameMember(f.dataset.id, val)) { editMember = null; if (input) input.blur(); renderManage(); }
  } else if (kind === "chore") {
    const name = clean(val, 80); if (!name) return;
    if (chores.some(c => norm(c.name) === norm(name))) { toast("„" + name + "” już jest na liście."); return; }
    addChore(name, mIcon); toast("Dodano czynność: " + name);
    input.value = ""; mIcon = "check"; mIconManual = false; markPicker($("#c-icons"), mIcon);
  } else if (kind === "tile-chore") {
    const name = clean(val, 80);
    if (!name) { toast("Wpisz, co zostało zrobione.", null, "err"); return; }
    if (!selected) { toast("Najpierw wybierz, kto to zrobił.", null, "err"); return; }
    const once = $("#tile-once").checked;
    const ch = once ? { once: true, name, icon: newIcon } : addChore(name, newIcon);
    if (input) input.blur();
    if (logEntry(ch)) { addingChore = false; renderTiles(true); }
  } else if (kind === "note") {
    const id = f.dataset.id, d = cleanNote(val);
    if (input) input.blur();
    editNote = null;
    updateDoc(fdoc("entries", id), { d }).then(() => toast(d ? "Zapisano opis." : "Usunięto opis.")).catch(handleErr);
    renderRecent(); renderResults();
  } else if (kind === "pin") {
    changePin(f);
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (!tipEl.hidden) hideTip(); else if (!$("#manage").hidden) closeManage(); }
});
window.addEventListener("hashchange", () => { const t = location.hash.slice(1); if ((t === "zglos" || t === "wyniki") && t !== tab) setTab(t); });

async function copyUrl(btn) {
  const url = location.origin + location.pathname;
  try { await navigator.clipboard.writeText(url); btn.textContent = "Skopiowano"; setTimeout(() => { btn.textContent = "Kopiuj"; }, 2000); }
  catch (e) { const r = document.createRange(); r.selectNodeContents($("#app-url")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Zaznaczyłem link, skopiuj go ręcznie."); }
}

/* ---------- logowanie rodzin ---------- */
const PL_ERR = {
  "auth/invalid-credential": "Zła nazwa rodziny albo PIN.", "auth/invalid-login-credentials": "Zła nazwa rodziny albo PIN.",
  "auth/wrong-password": "Zła nazwa rodziny albo PIN.", "auth/user-not-found": "Zła nazwa rodziny albo PIN.",
  "auth/email-already-in-use": "Rodzina o tej nazwie już istnieje. Wybierz inną nazwę albo się zaloguj.",
  "app/name-taken": "Ta nazwa rodziny jest już zajęta. Wybierz inną.",
  "auth/too-many-requests": "Za dużo prób. Spróbuj za kilka minut.",
  "auth/network-request-failed": "Brak internetu. Sprawdź połączenie.",
  "auth/operation-not-allowed": "Logowanie jest wyłączone w Firebase (Authentication → E-mail/hasło).",
  "permission-denied": "Baza nie przyjęła danych. Wklej w Firebase nowe reguły (Firestore → Rules → Publish) i spróbuj jeszcze raz."
};
const MODES = {
  login: { h: "Zaloguj rodzinę", d: "Wpisz nazwę rodziny i jej 4-cyfrowy PIN. Ten telefon zapamięta logowanie.", f: ["name", "pin"], btn: "Zaloguj",
    links: [["create", "Nowa rodzina? Załóż ją"], ["legacy", "Używaliście wcześniej hasła rodziny? Przenieś dane"]] },
  create: { h: "Nowa rodzina", d: "Wybierz nazwę rodziny i 4-cyfrowy PIN. Podasz je domownikom, żeby zalogowali się na swoich telefonach.", f: ["name", "pin", "pin2"], btn: "Załóż rodzinę",
    links: [["login", "Masz już rodzinę? Zaloguj się"]] },
  legacy: { h: "Przenieś dane", d: "Wpisz hasło rodziny z poprzedniej wersji aplikacji.", f: ["old"], btn: "Dalej",
    links: [["login", "Wróć do logowania"]] },
  migrate: { h: "Ustawcie nazwę i PIN", d: "Aplikacja obsługuje teraz wiele rodzin. Wybierzcie nazwę rodziny i 4-cyfrowy PIN, a przeniosę do niej Waszych domowników, czynności i historię.", f: ["name", "pin", "pin2"], btn: "Przenieś dane i zaloguj",
    links: [["legacy-out", "Wyloguj"]] },
  wait: { h: "Chwileczkę…", d: "Sprawdzam dane rodziny.", f: [], btn: null, links: [] }
};
let loginMode = "login", loginNote = "", working = false;

function setLoginMode(mode) {
  loginMode = mode;
  const M = MODES[mode];
  $("#login-h").textContent = M.h;
  $("#login-desc").textContent = (mode === "login" && loginNote) ? loginNote : M.d;
  for (const [k, sel] of [["old", "#f-old"], ["name", "#f-name"], ["pin", "#f-pin"], ["pin2", "#f-pin2"]]) $(sel).hidden = !M.f.includes(k);
  $("#pin").autocomplete = mode === "login" ? "current-password" : "new-password";
  const btn = $("#login-btn"); btn.hidden = !M.btn; btn.textContent = M.btn || ""; btn.disabled = false;
  $("#login-links").innerHTML = M.links.map(([m, label]) => m === "legacy-out"
    ? '<button type="button" class="linkbtn" data-action="legacy-out">' + esc(label) + "</button>"
    : '<button type="button" class="linkbtn' + (m === "legacy" ? " small" : "") + '" data-action="login-mode" data-mode="' + m + '">' + esc(label) + "</button>").join("");
  $("#login-err").hidden = true;
  if (M.f.includes("name") && !$("#fam-name").value) $("#fam-name").value = lsGet("dd.family") || "";
  $("#pin").value = ""; $("#pin2").value = ""; $("#old-pass").value = "";
}
function loginError(msg) { const err = $("#login-err"); err.textContent = msg; err.hidden = false; }
function showLogin(mode) {
  $("#app").hidden = true; $("#login").hidden = false;
  setLoginMode(mode);
}

$("#login-form").addEventListener("submit", async e => {
  e.preventDefault();
  if (working) return;
  const btn = $("#login-btn");
  $("#login-err").hidden = true;
  const name = clean($("#fam-name").value, 30), pin = $("#pin").value, pin2 = $("#pin2").value;
  const M = MODES[loginMode];
  if (M.f.includes("name") && slugOf(name).length < 2) return loginError("Nazwa rodziny musi mieć co najmniej 2 litery lub cyfry.");
  if (M.f.includes("pin") && !PIN_RE.test(pin)) return loginError("PIN musi mieć dokładnie 4 cyfry.");
  if (M.f.includes("pin2") && pin !== pin2) return loginError("PIN-y się różnią.");
  working = true; btn.disabled = true;
  const label = btn.textContent;
  try {
    if (loginMode === "login") {
      lsSet("dd.family", name);
      await signInWithEmailAndPassword(auth, famEmail(slugOf(name)), pinPass(pin));
    } else if (loginMode === "create") {
      btn.textContent = "Zakładam…";
      await createFamily(name, pin);
    } else if (loginMode === "legacy") {
      await signInWithEmailAndPassword(auth, LEGACY_EMAIL, $("#old-pass").value);
    } else if (loginMode === "migrate") {
      btn.textContent = "Przenoszę dane…";
      await migrate(name, pin);
    }
  } catch (ex) {
    console.warn(ex);
    const code = ex && ex.code;
    if (loginMode === "legacy" && /credential|password|user-not-found/.test(code || "")) loginError("Złe hasło.");
    else loginError(PL_ERR[code] || ("Błąd: " + (ex && ex.message || ex)));
    if (btn.isConnected && !btn.hidden) { btn.disabled = false; btn.textContent = label; }
  } finally { working = false; }
});

// dzieli zapisy na partie (Firestore przyjmuje do 500 zmian naraz)
function batcher(store) {
  let b = writeBatch(store), n = 0; const done = [];
  return {
    set(ref, data) { b.set(ref, data); if (++n >= 400) { done.push(b.commit()); b = writeBatch(store); n = 0; } },
    async flush() { if (n) done.push(b.commit()); await Promise.all(done); }
  };
}
// dopisuje zestaw startowy do listy czynności; ta sama nazwa (bez względu na polskie znaki) dostaje tylko poprawną nazwę i ikonkę
function withStarter(list) {
  const out = list.map(c => ({ id: c.id, data: Object.assign({}, c.data) }));
  const byName = new Map(out.map(c => [norm(c.data.name), c]));
  const base = Date.now();
  SEED.forEach(([id, name, icon], i) => {
    const same = byName.get(norm(name));
    if (same) { same.data.name = name; same.data.icon = icon; }
    else if (!out.some(c => c.id === id)) out.push({ id, data: { name, icon, order: base + i } });
  });
  return out;
}

async function createFamily(name, pin) {
  const slug = slugOf(name);
  lsSet("dd.family", name);
  const cred = await createUserWithEmailAndPassword(auth, famEmail(slug), pinPass(pin));
  const fid = cred.user.uid, w = batcher(fs);
  w.set(doc(fs, "families", fid), { name, slug, createdAt: Date.now() });
  withStarter([]).forEach(c => w.set(doc(fs, "families", fid, "chores", c.id), c.data));
  await w.flush();
}

// Przeniesienie danych z poprzedniej wersji (jedno wspólne konto) do nowej rodziny.
async function migrate(name, pin) {
  const slug = slugOf(name), email = famEmail(slug), pw = pinPass(pin);
  const readAll = async c => (await getDocsFromServer(collection(fs, c))).docs.map(d => ({ id: d.id, data: d.data() }));
  const [mem, cho, ent] = await Promise.all([readAll("members"), readAll("chores"), readAll("entries")]);
  const met = await readAll("meta").catch(() => []);
  // konto rodziny zakładamy w osobnej instancji, żeby stare konto zostało zalogowane do końca przenosin
  const sec = initializeApp(firebaseConfig, "przenosiny-" + Date.now());
  try {
    const sAuth = initializeAuth(sec, { persistence: inMemoryPersistence }), sFs = getFirestore(sec);
    let cred;
    try { cred = await createUserWithEmailAndPassword(sAuth, email, pw); }
    catch (ex) {
      if (!ex || ex.code !== "auth/email-already-in-use") throw ex;
      // przerwane wcześniej przenosiny: ta sama nazwa i PIN → kończymy je
      try { cred = await signInWithEmailAndPassword(sAuth, email, pw); } catch (e2) { throw { code: "app/name-taken" }; }
      const f = await getDoc(doc(sFs, "families", cred.user.uid));
      if (f.exists() && f.data().legacy !== true) throw { code: "app/name-taken" };
    }
    const fid = cred.user.uid;
    await setDoc(doc(sFs, "families", fid), { name, slug, createdAt: Date.now(), legacy: true, complete: false }, { merge: true });
    const w = batcher(sFs);
    mem.forEach(x => w.set(doc(sFs, "families", fid, "members", x.id), x.data));
    withStarter(cho).forEach(x => w.set(doc(sFs, "families", fid, "chores", x.id), x.data));
    ent.forEach(x => w.set(doc(sFs, "families", fid, "entries", x.id), x.data));
    met.filter(x => x.id !== "migrated").forEach(x => w.set(doc(sFs, "families", fid, "meta", x.id), x.data));
    await w.flush();
    await updateDoc(doc(sFs, "families", fid), { complete: true });
    // znacznik w starej bazie: inne telefony zalogowane starym hasłem dowiedzą się, gdzie są dane
    await setDoc(doc(fs, "meta", "migrated"), { name, slug, at: Date.now() });
    await signOut(sAuth);
  } finally { deleteApp(sec).catch(() => {}); }
  lsSet("dd.family", name);
  migrating = true;
  try { await signOut(auth); await signInWithEmailAndPassword(auth, email, pw); }
  finally { migrating = false; }
}

// telefon zalogowany jeszcze starym hasłem
async function showLegacy() {
  showLogin("wait");
  try {
    const m = await getDocFromServer(doc(fs, "meta", "migrated"));
    if (m.exists()) {
      const nm = clean(m.data().name, 30);
      lsSet("dd.family", nm);
      loginNote = "Wasze dane są już w rodzinie „" + nm + "”. Zalogujcie się jej nazwą i PIN-em.";
      $("#fam-name").value = nm;
      await signOut(auth);
      return;
    }
  } catch (e) { console.warn("sprawdzanie przenosin:", e); }
  if (auth.currentUser && auth.currentUser.email === LEGACY_EMAIL) setLoginMode("migrate");
}

async function changePin(form) {
  const oldP = $("#old-pin").value, newP = $("#new-pin").value, u = auth.currentUser;
  if (!PIN_RE.test(newP)) { toast("Nowy PIN musi mieć dokładnie 4 cyfry.", null, "err"); return; }
  if (!u) return;
  try {
    await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, pinPass(oldP)));
    await updatePassword(u, pinPass(newP));
    form.reset();
    toast("PIN rodziny zmieniony.");
  } catch (ex) {
    const code = ex && ex.code;
    toast(/credential|password/.test(code || "") ? "Obecny PIN jest nieprawidłowy." : (PL_ERR[code] || "Nie udało się zmienić PIN-u."), null, "err");
  }
}

/* ---------- dane na żywo ---------- */
function subErr(e) {
  console.warn(e);
  showNotice(e && e.code === "permission-denied"
    ? "Baza odmówiła dostępu. Sprawdź, czy w Firebase są wklejone najnowsze reguły, albo zaloguj się ponownie."
    : "Połączenie z bazą zostało przerwane. Odśwież stronę.");
}
function subEntries() {
  if (unsubEntries) unsubEntries();
  unsubEntries = onSnapshot(query(fcol("entries"), where("day", ">=", keysFor(WINDOW_DAYS)[0])), s => {
    ENT = s.docs.map(parseEntry).filter(Boolean).sort((a, b) => b.t - a.t);
    rebuildGhosts(); loaded.entries = true; renderAll();
  }, subErr);
}
function subscribe() {
  unsubs.push(onSnapshot(doc(fs, "families", famId), s => {
    const x = s.exists() ? s.data() : null;
    famName = x && typeof x.name === "string" ? clean(x.name, 30) : "";
    if (famName) lsSet("dd.family", famName);
    renderFam();
  }, subErr));
  unsubs.push(onSnapshot(fcol("members"), s => { members = s.docs.map(parseMember).filter(Boolean).sort(byOrder); loaded.members = true; renderAll(); }, subErr));
  unsubs.push(onSnapshot(fcol("chores"), s => { chores = s.docs.map(parseChore).filter(Boolean).sort(byOrder); loaded.chores = true; renderAll(); }, subErr));
  subEntries();
}
function unsubscribeAll() {
  unsubs.forEach(u => u()); unsubs = [];
  if (unsubEntries) { unsubEntries(); unsubEntries = null; }
  members = []; chores = []; ENT = []; ghostM = {}; ghostC = {};
  loaded.members = loaded.chores = loaded.entries = false; tilesSig = "";
}

function startSession(user) {
  if (famId === user.uid) return;
  endSession();
  famId = user.uid; famName = ""; loginNote = "";
  selected = lsGet("dd.member." + famId);
  editNote = null; editMember = null; iconEdit = null; addingChore = false; showAllHist = false;
  $("#login").hidden = true; $("#app").hidden = false;
  showNotice("");
  renderHeader(); renderSegs(); renderTabs(); renderFam(); renderAll(); subscribe();
}
function endSession() {
  if (!famId) return;
  unsubscribeAll(); closeManage(); hideTip();
  famId = null; famName = ""; selected = null;
  $("#app").hidden = true;
}

function checkDay() {
  const k = keyOf(new Date());
  if (k !== todayK) { todayK = k; renderHeader(); if (famId) { subEntries(); renderAll(); } }
}
setInterval(checkDay, 30000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) { checkDay(); checkUpdate(); } });

let migrating = false;
onAuthStateChanged(auth, user => {
  if (user && isFamEmail(user.email)) { startSession(user); return; }
  endSession();
  if (user && user.email === LEGACY_EMAIL) { showLegacy(); return; }
  if (user) { signOut(auth); return; }
  if (migrating) { showLogin("wait"); return; }
  showLogin(["create", "legacy"].includes(loginMode) && !loginNote ? loginMode : "login");
});
