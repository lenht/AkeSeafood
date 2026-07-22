let currentLang = localStorage.getItem("akeSeafoodLang") || "en";
let activeCategory = "all";

const selectedItems = new Set();
const expandedCategories = new Set();

let products = [];
let categories = [];
let translations = {};

const catalogGrid = document.querySelector("#catalogGrid");
const categoryTabs = document.querySelector("#categoryTabs");
const searchInput = document.querySelector("#searchInput");
const selectedSummary = document.querySelector("#selectedSummary");
const formStatus = document.querySelector("#formStatus");
const quoteForm = document.querySelector("#quoteForm");
const sendRequestButton = document.querySelector("#sendRequestButton");


// ============================================================
// DATA LOADING
// ============================================================

async function loadData() {
  try {
    const [productsResponse, categoriesResponse, translationsResponse] =
      await Promise.all([
        fetch("./data/products.json"),
        fetch("./data/categories.json"),
        fetch("./data/translations.json"),
      ]);

    if (!productsResponse.ok) {
      throw new Error("Could not load products.json");
    }

    if (!categoriesResponse.ok) {
      throw new Error("Could not load categories.json");
    }

    if (!translationsResponse.ok) {
      throw new Error("Could not load translations.json");
    }

    products = await productsResponse.json();
    categories = await categoriesResponse.json();
    translations = await translationsResponse.json();

    console.log("Products loaded:", products.length);
    console.log("Categories loaded:", categories.length);
    console.log("Translations loaded:", translations);

    applyTranslations();

  } catch (error) {
    console.error("Failed to load application data:", error);

    if (catalogGrid) {
      catalogGrid.innerHTML = `
        <p class="empty-card">
          Unable to load the product catalogue.
        </p>
      `;
    }
  }
}


// ============================================================
// TRANSLATIONS
// ============================================================

function t(key) {
  return (
    translations[currentLang]?.[key] ||
    translations.en?.[key] ||
    key
  );
}


// ============================================================
// CATEGORY TRANSLATION
// ============================================================

function categoryName(categoryId) {
  if (categoryId === "all") {
    return t("all");
  }

  const category = categories.find(
    (item) => item.id === categoryId
  );

  return (
    category?.[currentLang] ||
    category?.en ||
    categoryId
  );
}


// ============================================================
// PRODUCT NAMES
// ============================================================

function itemName(product) {
  return (
    product[currentLang] ||
    product.en ||
    product.name?.[currentLang] ||
    product.name?.en ||
    "Seafood product"
  );
}


function secondaryNames(product) {
  const seen = new Set([
    itemName(product),
  ]);

  return [
    {
      lang: "zh",
      name: product.zh,
    },
    {
      lang: "vi",
      name: product.vi,
    },
    {
      lang: "en",
      name: product.en,
    },
  ].filter((entry) => {
    if (!entry.name || seen.has(entry.name)) {
      return false;
    }

    seen.add(entry.name);
    return true;
  });
}


// ============================================================
// TEXT HELPERS
// ============================================================

function normalizeSearchText(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}


function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


// ============================================================
// PRODUCT IMAGE
// ============================================================

function productImage(product, index = 0) {

  // ----------------------------------------------------------
  // 1. Real image from products.json
  // ----------------------------------------------------------

  if (product.image) {
    return `assets/products/${product.image}`;
  }


  // ----------------------------------------------------------
  // 2. Determine fallback visual type
  // ----------------------------------------------------------

  const type = product.visualType || "fish";


  // ----------------------------------------------------------
  // 3. Generate deterministic variation
  // ----------------------------------------------------------

  const hue =
    (index * 37 + type.length * 19) % 360;

  const accent =
    `hsl(${hue} 58% 54%)`;

  const accentTwo =
    `hsl(${(hue + 42) % 360} 70% 64%)`;

  const dark = "#12323f";
  const ice = "#effaf7";

  const seed =
    10 + (index % 7) * 3;


  // ----------------------------------------------------------
  // 4. SVG product bodies
  // ----------------------------------------------------------

  const bodies = {

    fish: `
      <path d="M76 78c30-31 78-34 118-8 15 10 26 24 34 39-13 23-40 38-72 40-31 2-61-8-80-29-16 13-34 20-53 20 9-17 15-34 16-51-2-18-8-35-16-51 19 0 37 13 53 40Z" fill="${accent}"/>
      <path d="M106 82c26-18 65-18 94 4 9 7 16 15 22 25-28 13-66 14-101 1-10-4-20-8-29-13 4-7 8-12 14-17Z" fill="${ice}" opacity=".72"/>
      <circle cx="194" cy="96" r="6" fill="${dark}"/>
      <path d="M135 123c24 10 49 9 72-3" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity=".26"/>
    `,

    shell: `
      <path d="M76 130c10-47 42-78 80-78s70 31 80 78c-20 16-47 25-80 25s-60-9-80-25Z" fill="${accent}"/>
      <path d="M96 127c10-31 31-51 60-62 29 11 50 31 60 62-18 10-38 15-60 15s-42-5-60-15Z" fill="${ice}" opacity=".78"/>
      <path d="M156 64v75M126 77c10 22 17 43 19 64M186 77c-10 22-17 43-19 64M106 101c18 14 34 28 46 42M206 101c-18 14-34 28-46 42" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity=".22"/>
    `,

    snail: `
      <path d="M91 126c7-41 36-72 72-72 32 0 58 24 63 55 17 2 31 11 39 25-16 12-39 19-66 19H89c-11 0-20-5-25-14 8-8 17-12 27-13Z" fill="${accent}"/>
      <circle cx="159" cy="104" r="43" fill="${accentTwo}"/>
      <path d="M159 78c19 0 32 15 32 31 0 20-17 35-37 31-17-3-27-17-25-31 2-15 15-25 30-25 12 0 21 9 21 20 0 10-8 18-18 18" fill="none" stroke="${ice}" stroke-width="8" stroke-linecap="round"/>
      <path d="M223 108c13-14 27-19 42-15M225 115c17-4 31-1 43 9" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity=".28"/>
    `,

    abalone: `
      <path d="M74 121c17-42 62-70 110-59 35 8 59 32 67 63-23 25-65 38-106 29-32-7-57-19-71-33Z" fill="${accent}"/>
      <path d="M96 119c19-25 50-40 83-33 19 4 35 15 45 30-18 14-48 21-78 15-18-4-35-8-50-12Z" fill="${ice}" opacity=".76"/>
      <circle cx="204" cy="94" r="5" fill="${dark}" opacity=".35"/>
      <circle cx="219" cy="107" r="5" fill="${dark}" opacity=".35"/>
      <circle cx="230" cy="122" r="5" fill="${dark}" opacity=".35"/>
    `,

    lobster: `
      <path d="M144 55c26 5 43 29 43 58 0 36-18 59-43 59s-43-23-43-59c0-29 17-53 43-58Z" fill="${accent}"/>
      <path d="M144 58v112M112 86h64M105 113h78M111 140h66" stroke="${ice}" stroke-width="5" stroke-linecap="round" opacity=".64"/>
      <path d="M103 78C82 59 62 55 46 66c17 5 28 18 34 37M185 78c21-19 41-23 57-12-17 5-28 18-34 37" fill="none" stroke="${accent}" stroke-width="13" stroke-linecap="round"/>
      <path d="M111 169c-16 11-31 15-46 12M177 169c16 11 31 15 46 12" stroke="${dark}" stroke-width="7" stroke-linecap="round" opacity=".25"/>
    `,

    crab: `
      <ellipse cx="152" cy="118" rx="62" ry="42" fill="${accent}"/>
      <path d="M100 105C79 82 56 76 37 87c15 7 24 20 27 39M204 105c21-23 44-29 63-18-15 7-24 20-27 39" fill="none" stroke="${accent}" stroke-width="14" stroke-linecap="round"/>
      <path d="M100 136c-22 4-41 13-57 27M204 136c22 4 41 13 57 27M114 150c-10 13-24 22-42 27M190 150c10 13 24 22 42 27" stroke="${dark}" stroke-width="6" stroke-linecap="round" opacity=".26"/>
      <circle cx="132" cy="98" r="6" fill="${dark}"/>
      <circle cx="172" cy="98" r="6" fill="${dark}"/>
    `,

    shrimp: `
      <path d="M82 116c8-42 53-70 98-57 34 10 55 36 55 66-33 8-70 6-101-9 13 20 35 32 64 37-32 19-74 10-98-18-8-4-14-10-18-19Z" fill="${accent}"/>
      <path d="M122 72c-4 21-1 41 10 60M151 64c-2 25 3 46 17 64M180 65c2 22 11 41 27 56" stroke="${ice}" stroke-width="6" stroke-linecap="round" opacity=".58"/>
      <path d="M226 94c18-16 34-22 49-18M230 107c18-3 32 1 43 12" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity=".32"/>
      <circle cx="209" cy="89" r="5" fill="${dark}"/>
    `,

    squid: `
      <path d="M151 51c31 24 48 52 48 85-16 12-32 18-48 18s-32-6-48-18c0-33 17-61 48-85Z" fill="${accent}"/>
      <path d="M128 88c10-11 24-18 46-20-5-7-13-13-23-20-10 10-17 23-23 40Z" fill="${ice}" opacity=".62"/>
      <path d="M121 145c-24 17-43 26-58 27M139 150c-15 24-31 38-48 43M159 150c10 24 24 39 42 45M180 145c23 17 42 26 58 27" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
      <circle cx="137" cy="112" r="5" fill="${dark}"/>
      <circle cx="164" cy="112" r="5" fill="${dark}"/>
    `,

    seaweed: `
      <path d="M86 153c23-23 26-54 12-92M136 160c-7-44 1-78 24-103M193 154c-20-35-18-67 5-96" fill="none" stroke="${accent}" stroke-width="10" stroke-linecap="round"/>
      ${Array.from({ length: 22 }, (_, i) => {
        const x = 80 + ((i * 37 + seed) % 140);
        const y = 60 + ((i * 23 + seed) % 95);
        const r = 6 + (i % 4);

        return `
          <circle
            cx="${x}"
            cy="${y}"
            r="${r}"
            fill="${i % 2 ? accentTwo : accent}"
            opacity=".9"
          />
        `;
      }).join("")}
    `,

    jellyfish: `
      <path d="M87 119c5-41 33-68 69-68s64 27 69 68c-16 15-39 23-69 23s-53-8-69-23Z" fill="${accent}" opacity=".9"/>
      <path d="M104 116c8-25 26-41 52-48 26 7 44 23 52 48-14 8-32 12-52 12s-38-4-52-12Z" fill="${ice}" opacity=".55"/>
      <path d="M111 143c-13 22-11 39 7 50M140 145c-5 25-1 42 12 51M171 145c5 25 1 42-12 51M201 143c13 22 11 39-7 50" stroke="${accent}" stroke-width="7" stroke-linecap="round" fill="none"/>
    `,

    cucumber: `
      <path d="M77 123c20-43 69-70 115-55 28 9 49 30 61 59-22 33-69 49-116 35-28-8-49-21-60-39Z" fill="${accent}"/>
      ${Array.from({ length: 18 }, (_, i) => {
        const x = 100 + ((i * 29 + seed) % 125);
        const y = 86 + ((i * 17 + seed) % 55);

        return `
          <path
            d="M${x} ${y}l${i % 2 ? 8 : -8} ${i % 3 ? 8 : -7}"
            stroke="${ice}"
            stroke-width="5"
            stroke-linecap="round"
            opacity=".72"
          />
        `;
      }).join("")}
    `,

    frog: `
      <ellipse cx="154" cy="124" rx="58" ry="42" fill="${accent}"/>
      <circle cx="118" cy="82" r="22" fill="${accent}"/>
      <circle cx="190" cy="82" r="22" fill="${accent}"/>
      <circle cx="118" cy="82" r="6" fill="${dark}"/>
      <circle cx="190" cy="82" r="6" fill="${dark}"/>
      <path d="M114 142c25 14 54 14 80 0M102 143c-20 7-36 19-50 36M206 143c20 7 36 19 50 36" stroke="${dark}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".24"/>
    `,
  };


  // ----------------------------------------------------------
  // 5. Fallback to fish if visualType is invalid
  // ----------------------------------------------------------

  const body =
    bodies[type] ||
    bodies.fish;


  // ----------------------------------------------------------
  // 6. Product name for SVG accessibility
  // ----------------------------------------------------------

  const productName =
    product.en ||
    product.name?.en ||
    "Seafood product";


  // ----------------------------------------------------------
  // 7. Generate SVG
  // ----------------------------------------------------------

  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 320 220"
      role="img"
      aria-label="${escapeHtml(productName)}"
    >

      <defs>

        <linearGradient
          id="bg"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0"
            stop-color="#e8fbf7"
          />

          <stop
            offset=".58"
            stop-color="#dff3f3"
          />

          <stop
            offset="1"
            stop-color="#f8fcfb"
          />
        </linearGradient>

        <filter
          id="shadow"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="10"
            flood-color="#0a3342"
            flood-opacity=".18"
          />
        </filter>

      </defs>


      <rect
        width="320"
        height="220"
        rx="22"
        fill="url(#bg)"
      />


      <path
        d="M-18 159c57-33 109-33 156 0 52 36 113 33 200-9v85H-18Z"
        fill="#ffffff"
        opacity=".72"
      />


      <g
        fill="none"
        stroke="#0e8e9e"
        stroke-width="2"
        opacity=".12"
      >
        <path d="M23 48c26-14 52-14 78 0s52 14 78 0 52-14 78 0"/>
        <path d="M13 180c31-16 62-16 93 0s62 16 93 0 62-16 93 0"/>
      </g>


      <g filter="url(#shadow)">
        ${body}
      </g>


      <circle
        cx="${42 + seed}"
        cy="${44 + (index % 5) * 6}"
        r="7"
        fill="#ffffff"
        opacity=".68"
      />


      <circle
        cx="${260 - seed}"
        cy="${58 + (index % 4) * 8}"
        r="4"
        fill="#ffffff"
        opacity=".62"
      />

    </svg>
  `;


  return (
    `data:image/svg+xml;charset=UTF-8,` +
    encodeURIComponent(svg)
  );
}


// ============================================================
// APPLY TRANSLATIONS
// ============================================================

function applyTranslations() {

  document.documentElement.lang =
    currentLang === "zh"
      ? "zh-CN"
      : currentLang;


  // Static UI text

  document
    .querySelectorAll("[data-i18n]")
    .forEach((node) => {

      node.textContent =
        t(node.dataset.i18n);

    });


  // Placeholder translations

  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach((node) => {

      node.placeholder =
        t(node.dataset.i18nPlaceholder);

    });


  // Active language button

  document
    .querySelectorAll(".lang-button")
    .forEach((button) => {

      button.classList.toggle(
        "is-active",
        button.dataset.lang === currentLang
      );

    });


  // Re-render dynamic UI

  renderCategories();
  renderCatalog();
  updateSelectedSummary();
}


// ============================================================
// RENDER CATEGORY TABS
// ============================================================

function renderCategories() {

  if (!categoryTabs) {
    return;
  }


  const allButton = `
    <button
      type="button"
      class="${activeCategory === "all" ? "is-active" : ""}"
      data-category="all"
    >
      ${escapeHtml(t("all"))}
    </button>
  `;


  const categoryButtons =
    categories
      .map((category) => {

        const isActive =
          category.id === activeCategory;

        return `
          <button
            type="button"
            class="${isActive ? "is-active" : ""}"
            data-category="${escapeHtml(category.id)}"
          >
            ${escapeHtml(categoryName(category.id))}
          </button>
        `;

      })
      .join("");


  categoryTabs.innerHTML =
    allButton +
    categoryButtons;
}


// ============================================================
// RENDER PRODUCT CARD
// ============================================================

function renderProductCard(product) {

  const id =
    product.id;

  const isSelected =
    selectedItems.has(id);


  return `
    <article
      class="product-card ${isSelected ? "is-selected" : ""}"
      data-product="${escapeHtml(id)}"
      tabindex="0"
      role="button"
      aria-pressed="${isSelected}"
    >

      <div class="product-image-wrap">

        <img
          class="product-image"
          src="${productImage(
            product,
            products.indexOf(product)
          )}"
          alt="${escapeHtml(itemName(product))}"
          loading="lazy"
        />

      </div>


      <div class="product-copy">

        <h3>
          ${escapeHtml(itemName(product))}
        </h3>

        <p>
          ${secondaryNames(product)
            .map(
              (entry) =>
                `<span class="name-${entry.lang}">
                  ${escapeHtml(entry.name)}
                </span>`
            )
            .join(" · ")}
        </p>

      </div>


      <div class="product-meta">

        <span class="pill">
          ${escapeHtml(categoryName(product.cat))}
        </span>


        <button
          class="select-item ${isSelected ? "is-selected" : ""}"
          type="button"
          data-product="${escapeHtml(id)}"
        >
          ${escapeHtml(
            isSelected
              ? t("selected")
              : t("select")
          )}
        </button>

      </div>

    </article>
  `;
}


// ============================================================
// PANEL PREVIEW COUNT
// ============================================================

function panelPreviewCount() {

  if (
    window.matchMedia(
      "(max-width: 560px)"
    ).matches
  ) {
    return 1;
  }

  if (
    window.matchMedia(
      "(max-width: 880px)"
    ).matches
  ) {
    return 2;
  }

  if (
    window.matchMedia(
      "(max-width: 1120px)"
    ).matches
  ) {
    return 3;
  }

  return 4;
}


// ============================================================
// RENDER CATEGORY PANEL
// ============================================================

function renderCategoryPanel(category, items) {
  const isExpanded = expandedCategories.has(category);

  // When viewing a single category, show all products automatically.
  const showingSingleCategory =
    activeCategory !== "all" && activeCategory === category;

  const previewCount = panelPreviewCount();

  const visibleItems = showingSingleCategory || isExpanded
    ? items
    : items.slice(0, previewCount);

  const hasToggle =
    !showingSingleCategory && items.length > previewCount;

  return `
    <section class="category-panel" data-category-panel="${category}">
      <div class="category-panel-header">
        <div>
          <h3>${escapeHtml(categoryName(category))}</h3>
          <span>
            ${items.length} ${escapeHtml(t("itemCount"))}
          </span>
        </div>

        ${
          hasToggle
            ? `
              <button
                class="panel-toggle"
                type="button"
                data-panel-toggle="${category}"
                aria-expanded="${isExpanded}"
              >
                ${isExpanded
                  ? escapeHtml(t("less"))
                  : escapeHtml(t("more"))}
              </button>
            `
            : ""
        }
      </div>

      <div class="category-panel-grid">
        ${visibleItems.map(renderProductCard).join("")}
      </div>
    </section>
  `;
}


// ============================================================
// RENDER CATALOG
// ============================================================

function renderCatalog() {

  if (!catalogGrid) {
    return;
  }


  const query =
    normalizeSearchText(
      searchInput?.value?.trim() || ""
    );


  const filtered =
    products.filter((product) => {

      const matchesCategory =
        activeCategory === "all" ||
        product.cat === activeCategory;


      const haystack =
        normalizeSearchText(
          [
            product.en,
            product.vi,
            product.zh,
          ]
            .filter(Boolean)
            .join(" ")
        );


      return (
        matchesCategory &&
        haystack.includes(query)
      );

    });


  if (!filtered.length) {

    catalogGrid.innerHTML = `
      <p class="empty-card">
        ${escapeHtml(t("noResults"))}
      </p>
    `;

    return;
  }


  // categories.json controls category order

  const visibleCategories =
    categories.filter(
      (category) =>
        activeCategory === "all" ||
        activeCategory === category.id
    );


  catalogGrid.innerHTML =
    visibleCategories
      .map((category) => {

        const items =
          filtered.filter(
            (product) =>
              product.cat === category.id
          );


        return items.length
          ? renderCategoryPanel(
              category.id,
              items
            )
          : "";

      })
      .join("");
}


// ============================================================
// SELECTED PRODUCTS SUMMARY
// ============================================================

function updateSelectedSummary() {

  if (!selectedItems.size) {

    selectedSummary.textContent =
      t("selectedEmpty");

    return;
  }


  selectedSummary.textContent =
    Array.from(selectedItems)
      .map((id) => {

        const product =
          products.find(
            (item) =>
              item.id === id
          );

        return product
          ? itemName(product)
          : "";

      })
      .filter(Boolean)
      .join("\n");
}


// ============================================================
// LANGUAGE SWITCHING
// ============================================================

document
  .querySelectorAll(".lang-button")
  .forEach((button) => {

    button.addEventListener(
      "click",
      () => {

        currentLang =
          button.dataset.lang;

        localStorage.setItem(
          "akeSeafoodLang",
          currentLang
        );

        applyTranslations();

      }
    );

  });


// ============================================================
// CATEGORY SWITCHING
// ============================================================

categoryTabs.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "button[data-category]"
      );

    if (!button) {
      return;
    }


    activeCategory =
      button.dataset.category;


    renderCategories();
    renderCatalog();

  }
);


// ============================================================
// CATEGORY PANEL EXPAND / COLLAPSE
// ============================================================

catalogGrid.addEventListener(
  "click",
  (event) => {

    const toggle =
      event.target.closest(
        "button[data-panel-toggle]"
      );

    if (!toggle) {
      return;
    }


    const category =
      toggle.dataset.panelToggle;


    if (
      expandedCategories.has(
        category
      )
    ) {

      expandedCategories.delete(
        category
      );

    } else {

      expandedCategories.add(
        category
      );

    }


    renderCatalog();

  }
);


// ============================================================
// UPDATE PRODUCT CARD SELECTION
// ============================================================

function updateProductCardSelection(id) {

  const card =
    catalogGrid.querySelector(
      `.product-card[data-product="${CSS.escape(String(id))}"]`
    );


  if (!card) {
    return;
  }


  const isSelected =
    selectedItems.has(id);

  const button =
    card.querySelector(
      ".select-item"
    );


  card.classList.toggle(
    "is-selected",
    isSelected
  );


  card.setAttribute(
    "aria-pressed",
    String(isSelected)
  );


  if (button) {

    button.classList.toggle(
      "is-selected",
      isSelected
    );


    button.textContent =
      isSelected
        ? t("selected")
        : t("select");

  }
}


// ============================================================
// TOGGLE PRODUCT
// ============================================================

function toggleProduct(id) {

  if (
    selectedItems.has(id)
  ) {

    selectedItems.delete(id);

  } else {

    selectedItems.add(id);

  }


  updateProductCardSelection(id);
  updateSelectedSummary();
}


// ============================================================
// PRODUCT CARD CLICK HANDLING
// ============================================================

catalogGrid.addEventListener(
  "click",
  (event) => {

    const card =
      event.target.closest(
        ".product-card[data-product]"
      );

    if (!card) {
      return;
    }


    const id =
      card.dataset.product;


    toggleProduct(id);

  }
);


// ============================================================
// KEYBOARD ACCESSIBILITY
// ============================================================

catalogGrid.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }


    const card =
      event.target.closest(
        ".product-card[data-product]"
      );


    if (!card) {
      return;
    }


    event.preventDefault();


    const id =
      card.dataset.product;


    toggleProduct(id);

  }
);


// ============================================================
// SEARCH
// ============================================================

searchInput.addEventListener(
  "input",
  renderCatalog
);


// ============================================================
// RESPONSIVE RE-RENDER
// ============================================================

window.addEventListener(
  "resize",
  renderCatalog
);


// ============================================================
// QUOTE REQUEST
// ============================================================

function prepareQuoteRequest(
  formElement
) {

  const form =
    new FormData(formElement);


  const contactLines = [

    form.get("zalo") &&
      `Zalo: ${form.get("zalo")}`,

    form.get("wechat") &&
      `WeChat: ${form.get("wechat")}`,

    form.get("email") &&
      `Email: ${form.get("email")}`,

  ].filter(Boolean);


  if (!contactLines.length) {

    formStatus.textContent =
      t("contactNeeded");

    return null;

  }


  const customerName =
    String(
      form.get("name") || ""
    ).trim();


  const customerEmail =
    String(
      form.get("email") || ""
    ).trim();


  const requestDetails =
    String(
      form.get("message") || ""
    ).trim();


  const selected =
    Array.from(selectedItems)
      .map((id) => {

        const product =
          products.find(
            (item) =>
              item.id === id
          );


        if (!product) {
          return null;
        }


        return (
          `${product.zh} / ` +
          `${product.vi} / ` +
          `${product.en}`
        );

      })
      .filter(Boolean);


  const selectedList =
    selected.length
      ? selected
          .map(
            (item, index) =>
              `${index + 1}. ${item}`
          )
          .join("\n")
      : "No items selected.";


  const preparedMessage = [

    "New seafood quote request",

    "",

    "CUSTOMER",

    `Name: ${
      customerName ||
      "Not provided"
    }`,

    `Website language: ${
      currentLang.toUpperCase()
    }`,

    "",

    "CONTACT",

    ...contactLines,

    "",

    "SELECTED SEAFOOD",

    selectedList,

    "",

    "REQUEST DETAILS",

    requestDetails ||
      "No extra notes.",

  ].join("\n");


  navigator.clipboard
    ?.writeText(
      preparedMessage
    )
    .catch(() => {});


  const formspreeEndpoint =
    formElement.action;


  formElement.elements
    .namedItem(
      "_subject"
    ).value =
      `New seafood quote request${
        customerName
          ? ` from ${customerName}`
          : ""
      }`;


  formElement.elements
    .namedItem(
      "_replyto"
    ).value =
      customerEmail;


  formElement.elements
    .namedItem(
      "Selected seafood"
    ).value =
      selectedList;


  formElement.elements
    .namedItem(
      "Full request"
    ).value =
      preparedMessage;


  return {

    customerName,

    customerEmail,

    form,

    formspreeEndpoint,

    preparedMessage,

    requestDetails,

    selectedList,

  };

}


// ============================================================
// FORM SUBMISSION
// ============================================================

quoteForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const formElement =
      event.currentTarget;


    const prepared =
      prepareQuoteRequest(
        formElement
      );


    if (!prepared) {
      return;
    }


    if (
      !prepared.formspreeEndpoint
    ) {

      formStatus.textContent =
        `${t("formspreeSetup")}

${t("requestReady")}

${prepared.preparedMessage}`;

      return;

    }


    const requestPayload =
      new FormData();


    requestPayload.append(
      "Customer name",
      prepared.customerName ||
        "Not provided"
    );


    requestPayload.append(
      "Zalo",
      prepared.form.get("zalo") ||
        "Not provided"
    );


    requestPayload.append(
      "WeChat",
      prepared.form.get("wechat") ||
        "Not provided"
    );


    requestPayload.append(
      "Customer email",
      prepared.customerEmail ||
        "Not provided"
    );


    requestPayload.append(
      "Website language",
      currentLang.toUpperCase()
    );


    requestPayload.append(
      "Selected seafood",
      prepared.selectedList
    );


    requestPayload.append(
      "Request details",
      prepared.requestDetails ||
        "No extra notes."
    );


    requestPayload.append(
      "Full request",
      prepared.preparedMessage
    );


    requestPayload.append(
      "_subject",
      `New seafood quote request${
        prepared.customerName
          ? ` from ${prepared.customerName}`
          : ""
      }`
    );


    if (
      prepared.customerEmail
    ) {

      requestPayload.append(
        "_replyto",
        prepared.customerEmail
      );

    }


    try {

      sendRequestButton.disabled =
        true;


      formStatus.textContent =
        t("requestSending");


      const response =
        await fetch(
          prepared.formspreeEndpoint,
          {
            method: "POST",
            body: requestPayload,
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      if (!response.ok) {
        throw new Error(
          "Formspree request failed"
        );
      }


      formStatus.textContent =
        t("requestSent");


      formElement.reset();


      selectedItems.clear();


      renderCatalog();


      updateSelectedSummary();


    } catch (error) {

      console.error(
        error
      );


      formStatus.textContent =
        `${t("requestError")}

${prepared.preparedMessage}`;

    } finally {

      sendRequestButton.disabled =
        false;

    }

  }
);


// ============================================================
// START APPLICATION
// ============================================================

loadData();
