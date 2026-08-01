/* search.mjs — Client-side search and filter chips, pure JS (no squint runtime) */

/* ── Helpers ────────────────────────────── */

function eachLoop(n, f) {
  for (let i = 0; i < n; i++) f(i);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/* ── Render search results ──────────────── */

function renderResults(results, el, index) {
  el.innerHTML = "";
  if (results.length) {
    eachLoop(results.length, j => {
      const ep = results[j];
      const li = document.createElement("li");
      const a = document.createElement("a");
      const sm = document.createElement("small");
      li.role = "option";
      a.href = `/episodios/${ep.slug}/`;
      a.textContent = escapeHtml(ep.title);
      sm.textContent = ep.date;
      li.appendChild(a);
      li.appendChild(sm);
      el.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    const msg = document.createElement("p");
    const sug = document.createElement("ul");
    li.role = "option";
    msg.textContent = "No encontramos episodios con ese término. Probá con:";
    msg.className = "search-empty-msg";
    li.appendChild(msg);
    sug.className = "search-suggestions";
    eachLoop(Math.min(3, index.length), j => {
      const ep = index[j];
      const sli = document.createElement("li");
      const sa = document.createElement("a");
      sa.href = `/episodios/${ep.slug}/`;
      sa.textContent = escapeHtml(ep.title);
      sli.appendChild(sa);
      sug.appendChild(sli);
    });
    li.appendChild(sug);
    el.appendChild(li);
  }
}

/* ── Filter chips ────────────────────────── */

function groupByFilterType(chips) {
  // Partition chips by data-filter (tags, author, genre)
  // Episode chips have no data-filter — treat as "tags"
  const groups = {};
  eachLoop(chips.length, i => {
    const c = chips[i];
    const filterType = c.dataset.filter || "tags";
    if (!groups[filterType]) groups[filterType] = [];
    groups[filterType].push(c);
  });
  return groups;
}

function getActiveTags(chips) {
  const tags = new Set();
  eachLoop(chips.length, i => {
    const b = chips[i];
    if (b.ariaPressed && b.dataset.value !== "all") tags.add(b.dataset.value);
  });
  return tags;
}

function updateFilterEmptyState(container, emptyEl) {
  if (!container || !emptyEl) return;
  const items = container.querySelectorAll("li");
  let visible = 0;
  eachLoop(items.length, i => {
    if (items[i].style.display !== "none") visible++;
  });
  emptyEl.style.display = items.length > 0 && visible === 0 ? "" : "none";
}

function applyFilter(chips, container, emptyEl) {
  if (!container) return;
  const groups = groupByFilterType(chips);
  const items = container.querySelectorAll("li");

  eachLoop(items.length, i => {
    const li = items[i];
    let ok = true;

    // Apply tag filter (data-tags)
    if (groups.tags) {
      const activeTags = groups.tags.filter(c => c.ariaPressed).map(c => c.dataset.value);
      if (activeTags.length > 0) {
        const itemTags = new Set((li.dataset.tags || "").split(" ").filter(Boolean));
        for (const t of activeTags) { if (!itemTags.has(t)) { ok = false; break; } }
      }
    }

    // Apply author filter (data-author)
    if (ok && groups.author) {
      const activeAuthors = groups.author.filter(c => c.ariaPressed).map(c => c.dataset.value);
      if (activeAuthors.length > 0) {
        const itemAuthor = li.dataset.author || "";
        if (!activeAuthors.includes(itemAuthor)) ok = false;
      }
    }

    // Apply genre filter (data-genre)
    if (ok && groups.genre) {
      const activeGenres = groups.genre.filter(c => c.ariaPressed).map(c => c.dataset.value);
      if (activeGenres.length > 0) {
        const itemGenre = li.dataset.genre || "";
        if (!activeGenres.includes(itemGenre)) ok = false;
      }
    }

    li.style.display = ok ? "" : "none";
  });

  updateFilterEmptyState(container, emptyEl);
}

function toggleChip(chip, chips, container, emptyEl) {
  if (!container) return;
  const value = chip.dataset.value;
  const filterType = chip.dataset.filter || "tags";

  if (value === "all") {
    // Deactivate all chips of the same filter type, activate "all"
    eachLoop(chips.length, i => {
      const b = chips[i];
      const sameType = (b.dataset.filter || "tags") === filterType;
      if (sameType) {
        b.ariaPressed = b.dataset.value === "all";
        if (b.dataset.value === "all") b.classList.add("chip-active"); else b.classList.remove("chip-active");
      }
    });
  } else {
    const newp = !chip.ariaPressed;
    chip.ariaPressed = newp;
    if (newp) chip.classList.add("chip-active"); else chip.classList.remove("chip-active");

    // Deactivate "all" chip of same type when a specific chip is active
    eachLoop(chips.length, i => {
      const b = chips[i];
      if ((b.dataset.filter || "tags") === filterType && b.dataset.value === "all") {
        b.ariaPressed = false;
        b.classList.remove("chip-active");
      }
    });

    // If no chips of this type are active, reactivate "all"
    const anyActive = Array.from(chips).some(
      b => (b.dataset.filter || "tags") === filterType && b.dataset.value !== "all" && b.ariaPressed
    );
    if (!anyActive) {
      eachLoop(chips.length, i => {
        const b = chips[i];
        if ((b.dataset.filter || "tags") === filterType && b.dataset.value === "all") {
          b.ariaPressed = true;
          b.classList.add("chip-active");
        }
      });
    }
  }
  applyFilter(chips, container, emptyEl);
}

function clearFilters(chips, container, emptyEl) {
  if (!container) return;
  eachLoop(chips.length, i => {
    const b = chips[i];
    const bt = b.dataset.value;
    b.ariaPressed = bt === "all";
    if (bt === "all") b.classList.add("chip-active"); else b.classList.remove("chip-active");
  });
  applyFilter(chips, container, emptyEl);
}

function initFilters() {
  const chips = document.querySelectorAll(".filter-chips .chip");
  const container = document.querySelector("[data-filter-container]");
  const emptyEl = document.querySelector("[data-filter-empty]");
  const clearBtns = document.querySelectorAll("#clear-filters");
  if (!chips || chips.length === 0 || !container) return;
  eachLoop(chips.length, i => {
    chips[i].addEventListener("click", () => toggleChip(chips[i], chips, container, emptyEl));
  });
  eachLoop(clearBtns.length, i => {
    clearBtns[i].addEventListener("click", () => clearFilters(chips, container, emptyEl));
  });
}

function init(index) {
  const input = document.querySelector("#search-input");
  const results = document.querySelector("#search-results");
  if (!input || !results) { console.info("Search UI elements not found — skipping"); return; }
  results.hidden = true;
  input.addEventListener("input", e => {
    const q = e.target.value;
    if (q.length < 2) { results.hidden = true; return; }
    const lc = q.toLowerCase();
    const matches = Array.from(index).filter(ep =>
      (ep.title || "").toLowerCase().includes(lc) ||
      (ep.description || "").toLowerCase().includes(lc) ||
      (ep.authors || "").toLowerCase().includes(lc) ||
      ((ep.tags || []).join(" ")).toLowerCase().includes(lc)
    ).slice(0, 10);
    results.hidden = false;
    renderResults(matches, results, index);
  });
}

/* ── Expose to window ───────────────────── */

window.__searchInit = init;
window.__searchFilters = initFilters;
console.info("search module ready");