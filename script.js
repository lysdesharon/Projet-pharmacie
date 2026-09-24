
const state = {
  pharmacies: [],
  filter: "toutes",
  search: "",
  commune: "",
  lastUpdate: null,
};

const els = {
  clock: document.getElementById("clock"),
  heroGrid: document.getElementById("heroGrid"),
  tabs: document.getElementById("tabs"),
  search: document.getElementById("search"),
  communeFilter: document.getElementById("communeFilter"),
  listGrid: document.getElementById("listGrid"),
  listCount: document.getElementById("listCount"),
  listEmpty: document.getElementById("listEmpty"),
  lastUpdate: document.getElementById("lastUpdate"),
};

init();

async function init() {
  startClock();
  try {
    const res = await fetch("pharmacies.json");
    if (!res.ok) throw new Error("Réponse HTTP " + res.status);
    const data = await res.json();
    state.pharmacies = data.pharmacies || [];
    state.lastUpdate = data.derniere_mise_a_jour || null;
  } catch (err) {
    showLoadError();
    return;
  }

  els.lastUpdate.textContent = state.lastUpdate || "—";
  buildCommuneOptions();
  bindControls();
  renderHero();
  renderList();
}

/* ---------- Horloge ---------- */
function startClock() {
  const update = () => {
    const now = new Date();
    const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    const jour = jours[now.getDay()];
    const heure = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    els.clock.textContent = `${jour} · ${heure}`;
  };
  update();
  setInterval(update, 30 * 1000);
}

function showLoadError() {
  els.heroGrid.innerHTML = `
    <div class="hero-card">
      <p class="hero-card__empty">
        Impossible de charger <code>pharmacies.json</code>. Si vous avez ouvert
        <code>index.html</code> directement depuis le disque, ouvrez plutôt le
        dossier avec un petit serveur local — par exemple
        <code>python3 -m http.server</code> — puis rechargez la page.
      </p>
    </div>`;
}

/* ---------- Rotation des gardes ---------- */
// Nombre de jours écoulés depuis une date de référence : sert d'index
// stable et croissant pour faire tourner la garde entre les pharmacies
// d'un même arrondissement.
function dayIndex(date) {
  return Math.floor(date.getTime() / 86400000);
}

// Renvoie le dimanche courant si "date" est un dimanche, sinon le
// prochain dimanche à venir.
function upcomingSunday(date) {
  const d = new Date(date);
  const diff = (7 - d.getDay()) % 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSunday(date) {
  return date.getDay() === 0;
}

// Regroupe les pharmacies éligibles à un type de garde par arrondissement,
// puis choisit celle en service pour "date" via une rotation déterministe.
function pharmaciesDeGarde(type, date) {
  const eligible = state.pharmacies.filter((p) => p.types_garde.includes(type));
  const parArrondissement = {};
  eligible.forEach((p) => {
    (parArrondissement[p.arrondissement] ||= []).push(p);
  });

  const step = type === "nuit" ? dayIndex(date) : Math.floor(dayIndex(date) / 7);
  const resultat = [];
  Object.keys(parArrondissement)
    .sort()
    .forEach((arr) => {
      const liste = parArrondissement[arr].slice().sort((a, b) => a.id.localeCompare(b.id));
      const pharmacie = liste[step % liste.length];
      resultat.push(pharmacie);
    });
  return resultat;
}

/* ---------- Rendu du bandeau "en ce moment" ---------- */
function renderHero() {
  const now = new Date();
  const nuitDuJour = pharmaciesDeGarde("nuit", now);
  const dimanche = upcomingSunday(now);
  const gardesDimanche = pharmaciesDeGarde("dimanche", dimanche);
  const dimancheEstAujourdhui = isSunday(now);

  const dimancheLabel = dimancheEstAujourdhui
    ? "Garde du dimanche — aujourd'hui"
    : `Garde du dimanche — ${formatDate(dimanche)}`;

  els.heroGrid.innerHTML = `
    ${heroCard("nuit", "Garde de nuit — cette nuit", nuitDuJour)}
    ${heroCard("dimanche", dimancheLabel, gardesDimanche)}
  `;
}

function heroCard(type, titre, pharmacies) {
  if (!pharmacies.length) {
    return `
      <div class="hero-card hero-card--${type}">
        <p class="hero-card__eyebrow"><span class="hero-card__dot"></span>${titre}</p>
        <p class="hero-card__empty">Aucune pharmacie enregistrée pour cette garde pour le moment.</p>
      </div>`;
  }
  // On met en avant la première pharmacie du groupe ; les autres
  // arrondissements couverts sont listés juste en dessous.
  const principale = pharmacies[0];
  const autres = pharmacies.slice(1);

  return `
    <div class="hero-card hero-card--${type}">
      <p class="hero-card__eyebrow"><span class="hero-card__dot"></span>${titre}</p>
      <h2 class="hero-card__name">${principale.nom}</h2>
      <p class="hero-card__meta"><strong>${principale.arrondissement}</strong> · ${principale.adresse}</p>
      <div class="hero-card__actions">
        ${callButton(principale, "btn--primary")}
        ${mapButton(principale, "btn--ghost")}
      </div>
      ${autres.length ? autresArrondissements(autres) : ""}
    </div>`;
}

function autresArrondissements(autres) {
  const items = autres.map((p) => `${p.arrondissement} : ${p.nom}`).join(" · ");
  return `<p class="hero-card__meta" style="margin-top:12px;">Aussi de garde — ${items}</p>`;
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/* ---------- Contrôles (recherche / filtres) ---------- */
function buildCommuneOptions() {
  const communes = [...new Set(state.pharmacies.map((p) => p.arrondissement))].sort();
  communes.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    els.communeFilter.appendChild(opt);
  });
}

function bindControls() {
  els.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    [...els.tabs.children].forEach((t) => {
      t.classList.toggle("is-active", t === btn);
      t.setAttribute("aria-selected", t === btn ? "true" : "false");
    });
    state.filter = btn.dataset.filter;
    renderList();
  });

  els.search.addEventListener("input", () => {
    state.search = els.search.value.trim().toLowerCase();
    renderList();
  });

  els.communeFilter.addEventListener("change", () => {
    state.commune = els.communeFilter.value;
    renderList();
  });
}

/* ---------- Rendu de la liste complète ---------- */
function renderList() {
  let items = state.pharmacies.slice();

  if (state.filter !== "toutes") {
    items = items.filter((p) => p.types_garde.includes(state.filter));
  }
  if (state.commune) {
    items = items.filter((p) => p.arrondissement === state.commune);
  }
  if (state.search) {
    items = items.filter((p) =>
      [p.nom, p.arrondissement, p.quartier, p.adresse].join(" ").toLowerCase().includes(state.search)
    );
  }

  items.sort((a, b) => a.arrondissement.localeCompare(b.arrondissement) || a.nom.localeCompare(b.nom));

  els.listCount.textContent = `${items.length} pharmacie${items.length > 1 ? "s" : ""}`;
  els.listEmpty.hidden = items.length !== 0;
  els.listGrid.innerHTML = items.map(cardHTML).join("");
}

function cardHTML(p) {
  const badges = p.types_garde
    .map((t) => `<span class="badge badge--${t}">${t === "nuit" ? "Nuit" : "Dimanche"}</span>`)
    .join("");

  return `
    <article class="card">
      <div class="card__top">
        <h3 class="card__name">${p.nom}</h3>
        <div class="card__badges">${badges}</div>
      </div>
      <p class="card__address">${p.adresse}</p>
      <p class="card__commune">${p.arrondissement}${p.quartier ? " · " + p.quartier : ""}</p>
      <p class="card__phone">${p.telephone}${p.telephone_2 ? " · " + p.telephone_2 : ""}</p>
      <div class="card__actions">
        ${callButton(p, "btn--primary")}
        ${mapButton(p, "btn--ghost")}
      </div>
    </article>`;
}

/* ---------- Boutons d'action ---------- */
function callButton(p, cls) {
  return `
    <a class="btn ${cls}" href="tel:${p.telephone.replace(/\s+/g, "")}">
      <svg viewBox="0 0 24 24"><path d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L14 13l5 2v4a2 2 0 0 1-2 2A15 15 0 0 1 4 6a2 2 0 0 1 2-2z"/></svg>
      Appeler
    </a>`;
}

function mapButton(p, cls) {
  const q = encodeURIComponent(`${p.nom}, ${p.adresse}, ${p.arrondissement}, Brazzaville`);
  return `
    <a class="btn ${cls}" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">
      <svg viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
      Itinéraire
    </a>`;
}
