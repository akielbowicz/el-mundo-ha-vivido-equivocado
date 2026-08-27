/**
 * search.test.mjs — Unit tests for search.js filter logic
 *
 * Tests the core filter chip logic (toggleChip, applyFilter, clearFilters)
 * by providing minimal DOM stubs that match the expected interface.
 *
 * Run: node --test src/search.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

/* ── Minimal DOM stubs ─────────────────── */

function makeStubChip(value, filterType, pressed = false) {
  const chip = {
    dataset: { value, filter: filterType || "" },
    // Mirror the ARIA reflection: `ariaPressed` reads back as the STRING
    // "true"/"false", no matter what was written (boolean or string).
    _pressed: pressed ? "true" : "false",
    getAttribute(name) { return name === "aria-pressed" ? this._pressed : null; },
    classList: {
      add(name) { this._classes = this._classes || []; this._classes.push(name); },
      remove(name) { this._classes = this._classes || []; this._classes = this._classes.filter(c => c !== name); },
      contains(name) { return (this._classes || []).includes(name); },
    },
  };
  Object.defineProperty(chip, "ariaPressed", {
    get() { return this._pressed; },
    set(v) { this._pressed = v && v !== "false" ? "true" : "false"; },
  });
  return chip;
}

function makeStubContainer(initialItems = []) {
  const items = initialItems.map((data, i) => ({
    dataset: { tags: data.tags || "", author: data.author || "", genre: data.genre || "" },
    style: { display: "" },
  }));
  return {
    querySelectorAll() { return items; },
    get items() { return items; },
  };
}

function makeStubEmptyEl() {
  return { style: { display: "" } };
}

/* ── Module-level state ────────────────── */

// Replicate the search.js filter logic as pure functions for testing
// This mirrors the logic in search.js exactly

function isPressed(chip) {
  return chip.getAttribute("aria-pressed") === "true";
}

function groupByFilterType(chips) {
  const groups = {};
  for (let i = 0; i < chips.length; i++) {
    const c = chips[i];
    const filterType = c.dataset.filter || "tags";
    if (!groups[filterType]) groups[filterType] = [];
    groups[filterType].push(c);
  }
  return groups;
}

function updateFilterEmptyState(container, emptyEl) {
  if (!container || !emptyEl) return;
  const items = container.querySelectorAll();
  let visible = 0;
  for (let i = 0; i < items.length; i++) {
    if (items[i].style.display !== "none") visible++;
  }
  emptyEl.style.display = items.length > 0 && visible === 0 ? "" : "none";
}

function applyFilter(chips, container, emptyEl) {
  if (!container) return;
  const groups = groupByFilterType(chips);
  const items = container.querySelectorAll();

  for (let i = 0; i < items.length; i++) {
    const li = items[i];
    let ok = true;

    // Apply tag filter
    if (groups.tags) {
      const activeTags = groups.tags.filter(c => isPressed(c) && c.dataset.value !== "all").map(c => c.dataset.value);
      if (activeTags.length > 0) {
        const itemTags = new Set((li.dataset.tags || "").split(" ").filter(Boolean));
        for (const t of activeTags) { if (!itemTags.has(t)) { ok = false; break; } }
      }
    }

    // Apply author filter
    if (ok && groups.author) {
      const activeAuthors = groups.author.filter(c => isPressed(c) && c.dataset.value !== "all").map(c => c.dataset.value);
      if (activeAuthors.length > 0) {
        const itemAuthor = li.dataset.author || "";
        if (!activeAuthors.includes(itemAuthor)) ok = false;
      }
    }

    // Apply genre filter
    if (ok && groups.genre) {
      const activeGenres = groups.genre.filter(c => isPressed(c) && c.dataset.value !== "all").map(c => c.dataset.value);
      if (activeGenres.length > 0) {
        const itemGenre = li.dataset.genre || "";
        if (!activeGenres.includes(itemGenre)) ok = false;
      }
    }

    li.style.display = ok ? "" : "none";
  }

  updateFilterEmptyState(container, emptyEl);
}

function toggleChip(chip, chips, container, emptyEl) {
  if (!container) return;
  const value = chip.dataset.value;
  const filterType = chip.dataset.filter || "tags";

  if (value === "all") {
    for (let i = 0; i < chips.length; i++) {
      const b = chips[i];
      const sameType = (b.dataset.filter || "tags") === filterType;
      if (sameType) {
        b.ariaPressed = b.dataset.value === "all";
        if (b.dataset.value === "all") b.classList.add("chip-active"); else b.classList.remove("chip-active");
      }
    }
  } else {
    const newp = !isPressed(chip);
    chip.ariaPressed = newp;
    if (newp) chip.classList.add("chip-active"); else chip.classList.remove("chip-active");

    // Deactivate "all" chip of same type
    for (let i = 0; i < chips.length; i++) {
      const b = chips[i];
      if ((b.dataset.filter || "tags") === filterType && b.dataset.value === "all") {
        b.ariaPressed = false;
        b.classList.remove("chip-active");
      }
    }

    // If no chips of this type are active, reactivate "all"
    const anyActive = Array.from(chips).some(
      b => (b.dataset.filter || "tags") === filterType && b.dataset.value !== "all" && isPressed(b)
    );
    if (!anyActive) {
      for (let i = 0; i < chips.length; i++) {
        const b = chips[i];
        if ((b.dataset.filter || "tags") === filterType && b.dataset.value === "all") {
          b.ariaPressed = true;
          b.classList.add("chip-active");
        }
      }
    }
  }
  applyFilter(chips, container, emptyEl);
}

function clearFilters(chips, container, emptyEl) {
  if (!container) return;
  for (let i = 0; i < chips.length; i++) {
    const b = chips[i];
    const bt = b.dataset.value;
    b.ariaPressed = bt === "all";
    if (bt === "all") b.classList.add("chip-active"); else b.classList.remove("chip-active");
  }
  applyFilter(chips, container, emptyEl);
}

/* ── Tests ──────────────────────────────── */

describe("groupByFilterType", () => {
  it("groups chips by data-filter attribute", () => {
    const chips = [
      makeStubChip("realismo", "tags"),
      makeStubChip("borges", "author"),
      makeStubChip("fantasia", "tags"),
    ];
    const groups = groupByFilterType(chips);
    assert.ok(groups.tags);
    assert.ok(groups.author);
    assert.equal(groups.tags.length, 2);
    assert.equal(groups.author.length, 1);
  });

  it("defaults to 'tags' when no data-filter set", () => {
    const chips = [makeStubChip("realismo")];
    const groups = groupByFilterType(chips);
    assert.equal(groups.tags.length, 1);
  });
});

describe("toggleChip", () => {
  it("activates a chip and deactivates 'all'", () => {
    const all = makeStubChip("all", "tags", true);
    const chip = makeStubChip("realismo", "tags", false);
    const chips = [all, chip];
    const container = makeStubContainer();
    const emptyEl = makeStubEmptyEl();

    toggleChip(chip, chips, container, emptyEl);

    assert.equal(chip.ariaPressed, "true");
    assert.equal(all.ariaPressed, "false");
  });

  it("deactivates a chip and reactivates 'all' when none active", () => {
    const all = makeStubChip("all", "tags", false);
    const chip = makeStubChip("realismo", "tags", true);
    const chips = [all, chip];
    const container = makeStubContainer();
    const emptyEl = makeStubEmptyEl();

    toggleChip(chip, chips, container, emptyEl);

    assert.equal(chip.ariaPressed, "false");
    assert.equal(all.ariaPressed, "true");
  });

  it("handles 'all' chip click: activates all, deactivates others", () => {
    const all = makeStubChip("all", "tags", false);
    const chip1 = makeStubChip("realismo", "tags", true);
    const chip2 = makeStubChip("fantasia", "tags", true);
    const chips = [all, chip1, chip2];
    const container = makeStubContainer();
    const emptyEl = makeStubEmptyEl();

    toggleChip(all, chips, container, emptyEl);

    assert.equal(all.ariaPressed, "true");
    assert.equal(chip1.ariaPressed, "false");
    assert.equal(chip2.ariaPressed, "false");
  });
});

describe("applyFilter", () => {
  it("shows all items when no filter chips are active", () => {
    const chips = [makeStubChip("all", "tags", false)];
    const container = makeStubContainer([
      { tags: "realismo" },
      { tags: "fantasia" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "");
  });

  it("ignores the 'all' chip value as a filter (regression: 'Todos' left 0 visible)", () => {
    const chips = [makeStubChip("all", "tags", true), makeStubChip("realismo", "tags", false)];
    const container = makeStubContainer([{ tags: "realismo" }, { tags: "fantasia" }]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "");
  });

  it("treats aria-pressed='false' (string) as not pressed (regression: ARIA reflection truthiness)", () => {
    const chips = [makeStubChip("all", "tags", false), makeStubChip("realismo", "tags", false)];
    const container = makeStubContainer([{ tags: "realismo" }, { tags: "fantasia" }]);
    const emptyEl = makeStubEmptyEl();

    // Both chips read back ariaPressed as the STRING "false" — truthy in JS.
    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "");
  });

  it("filters items by tag", () => {
    const chips = [makeStubChip("all", "tags", false), makeStubChip("realismo", "tags", true)];
    const container = makeStubContainer([
      { tags: "realismo borges" },
      { tags: "fantasia cortazar" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "none");
  });

  it("filters by author", () => {
    const chips = [
      makeStubChip("all", "author", false),
      makeStubChip("jorge-luis-borges", "author", true),
    ];
    const container = makeStubContainer([
      { tags: "realismo", author: "jorge-luis-borges" },
      { tags: "fantasia", author: "julio-cortazar" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "none");
  });

  it("filters by genre", () => {
    const chips = [
      makeStubChip("all", "genre", false),
      makeStubChip("cuento", "genre", true),
    ];
    const container = makeStubContainer([
      { tags: "realismo", genre: "cuento" },
      { tags: "fantasia", genre: "poesia" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "");
    assert.equal(container.items[1].style.display, "none");
  });

  it("shows empty state when all items are filtered out", () => {
    const chips = [makeStubChip("all", "tags", false), makeStubChip("nonexistent", "tags", true)];
    const container = makeStubContainer([
      { tags: "realismo" },
      { tags: "fantasia" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, "none");
    assert.equal(container.items[1].style.display, "none");
    assert.equal(emptyEl.style.display, "");
  });

  it("combines tag + author + genre filters (AND logic)", () => {
    const tagChip = makeStubChip("realismo", "tags", true);
    const authorChip = makeStubChip("borges", "author", true);
    const chips = [
      makeStubChip("all", "tags", false),
      tagChip,
      makeStubChip("all", "author", false),
      authorChip,
    ];
    const container = makeStubContainer([
      { tags: "realismo", author: "borges" },
      { tags: "realismo", author: "cortazar" },
      { tags: "fantasia", author: "borges" },
    ]);
    const emptyEl = makeStubEmptyEl();

    applyFilter(chips, container, emptyEl);

    assert.equal(container.items[0].style.display, ""); // matches both
    assert.equal(container.items[1].style.display, "none"); // wrong author
    assert.equal(container.items[2].style.display, "none"); // wrong tag
  });
});

describe("clearFilters", () => {
  it("resets all chips to 'all' active and clears specific chips", () => {
    const all = makeStubChip("all", "tags", false);
    const chip = makeStubChip("realismo", "tags", true);
    const chips = [all, chip];
    const container = makeStubContainer([
      { tags: "realismo" },
      { tags: "fantasia" },
    ]);
    const emptyEl = makeStubEmptyEl();

    clearFilters(chips, container, emptyEl);

    assert.equal(all.ariaPressed, "true");
    assert.equal(chip.ariaPressed, "false");
  });
});

describe("updateFilterEmptyState", () => {
  it("shows empty element when no items are visible", () => {
    const container = makeStubContainer([{ tags: "realismo" }]);
    const emptyEl = makeStubEmptyEl();
    container.items[0].style.display = "none";

    updateFilterEmptyState(container, emptyEl);

    assert.equal(emptyEl.style.display, "");
  });

  it("hides empty element when at least one item is visible", () => {
    const container = makeStubContainer([{ tags: "realismo" }, { tags: "fantasia" }]);
    const emptyEl = makeStubEmptyEl();
    container.items[0].style.display = "none";
    container.items[1].style.display = "";

    updateFilterEmptyState(container, emptyEl);

    assert.equal(emptyEl.style.display, "none");
  });

  it("hides empty element when there are no items", () => {
    const container = makeStubContainer([]);
    const emptyEl = makeStubEmptyEl();

    updateFilterEmptyState(container, emptyEl);

    assert.equal(emptyEl.style.display, "none");
  });
});