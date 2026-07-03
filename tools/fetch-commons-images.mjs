import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

const OUT_DIR = new URL("../assets/products/", import.meta.url);
const PHOTO_JS = new URL("../assets/product-photos.js", import.meta.url);
const CREDITS_HTML = new URL("../assets/image-attributions.html", import.meta.url);
const API = "https://commons.wikimedia.org/w/api.php";
const startIndex = Number(process.argv[2] || 0);

const productQueries = [
  ["grouper fish seafood", "Epinephelus market fish"],
  ["pomfret fish seafood", "Pampus fish market"],
  ["Modiolus clam seafood", "horse mussel seafood"],
  ["striped clam seafood", "clam seafood market"],
  ["blood cockle seafood", "Anadara granosa"],
  ["Babylonia areolata snail seafood", "Babylon snail seafood"],
  ["Babylonia areolata seafood", "sea snail seafood"],
  ["sea cucumber seafood", "Holothuria seafood"],
  ["sea snail seafood", "black sea snail"],
  ["sea grapes caulerpa lentillifera", "Caulerpa lentillifera"],
  ["abalone seafood", "Haliotis seafood"],
  ["live abalone seafood", "abalone shellfish"],
  ["Panulirus ornatus lobster", "spiny lobster seafood"],
  ["crayfish seafood", "crawfish seafood"],
  ["live crayfish seafood", "Procambarus clarkii"],
  ["geoduck clam seafood", "Panopea generosa"],
  ["turbot fish seafood", "flatfish seafood"],
  ["red grouper fish seafood", "Epinephelus morio"],
  ["crab claws seafood", "crab claw market"],
  ["sea grapes caulerpa lentillifera pack", "Caulerpa lentillifera"],
  ["green mussel seafood", "Perna viridis"],
  ["jellyfish seafood", "edible jellyfish"],
  ["jellyfish seafood", "edible jellyfish"],
  ["oyster meat seafood", "shucked oysters"],
  ["oyster meat seafood", "oyster seafood"],
  ["shucked oysters seafood", "oyster meat"],
  ["venus clam seafood", "white clam seafood"],
  ["white clam seafood", "clam seafood"],
  ["striped clam seafood", "clam seafood market"],
  ["purple clam seafood", "clam seafood"],
  ["sea clam seafood", "clam shellfish market"],
  ["large clam seafood", "venus clam seafood"],
  ["horse mussel seafood", "Atrina pectinata"],
  ["scallop adductor seafood", "scallop meat seafood"],
  ["Japanese scallop seafood", "Mizuhopecten yessoensis"],
  ["live scallop seafood", "Japanese scallop"],
  ["razor clam seafood", "Ensis razor clam"],
  ["baby octopus seafood", "octopus seafood"],
  ["live octopus seafood", "octopus market"],
  ["small squid seafood", "squid seafood"],
  ["egg squid seafood", "squid roe seafood"],
  ["cuttlefish seafood", "cleaned cuttlefish"],
  ["bigfin reef squid seafood", "squid seafood"],
  ["bigfin reef squid seafood", "squid seafood"],
  ["fresh squid seafood", "squid market"],
  ["tube squid seafood", "squid seafood"],
  ["cobia fish seafood", "Rachycentron canadum"],
  ["red tilapia fish", "tilapia seafood"],
  ["snakehead fish market", "ca loc fish", "Vietnam snakehead fish"],
  ["Swikee frog legs", "frog legs cuisine", "frog legs food"],
  ["mud crab seafood", "Scylla serrata"],
  ["three spot crab seafood", "Portunus sanguinolentus"],
  ["flower crab seafood", "Portunus pelagicus"],
  ["brown crab seafood", "Cancer pagurus"],
  ["black tiger shrimp seafood", "Penaeus monodon"],
  ["mantis shrimp seafood", "Squilla mantis"],
  ["white shrimp seafood", "Litopenaeus vannamei"],
  ["black tiger shrimp market", "tiger prawn seafood", "shrimp market"],
  ["black tiger shrimp market", "tiger prawn seafood", "shrimp market"],
  ["giant river prawn seafood", "Macrobrachium rosenbergii"],
  ["live giant river prawn seafood", "Macrobrachium rosenbergii"],
];

const usedTitles = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fileSlug(index, title) {
  return `${String(index + 1).padStart(2, "0")}-${title
    .replace(/^File:/i, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70)}`;
}

async function commons(params) {
  const url = new URL(API);
  url.search = new URLSearchParams({
    format: "json",
    origin: "*",
    ...params,
  });
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "AkeSeafoodWebsite/1.0 (local asset preparation)" },
      });
      if (response.ok) {
        await sleep(2000);
        return response.json();
      }
      if (response.status !== 429 || attempt === 4) throw new Error(`Commons API failed: ${response.status}`);
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await sleep(10000 * (attempt + 1));
  }
}

async function searchFiles(query) {
  const data = await commons({
    action: "query",
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "18",
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "900",
  });

  return Object.values(data.query?.pages || {})
    .filter((page) => page.imageinfo?.[0])
    .map((page) => ({ title: page.title, ...page.imageinfo[0] }))
    .filter((item) => /^image\/(jpeg|png|webp)$/i.test(item.mime || ""))
    .filter((item) => !/\b(no.?commercial|non.?commercial|fair use)\b/i.test(JSON.stringify(item.extmetadata || {})));
}

async function firstUsableImage(queries) {
  for (const query of [...queries, "seafood market", "fresh seafood"]) {
    const candidates = await searchFiles(query);
    const candidate = candidates.find((item) => !usedTitles.has(item.title)) || candidates[0];
    if (candidate) {
      usedTitles.add(candidate.title);
      return { ...candidate, query };
    }
  }
  throw new Error(`No image found for ${queries.join(" / ")}`);
}

async function downloadImage(image, index) {
  const sourceUrl = image.thumburl || image.url;
  let response;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      response = await fetch(sourceUrl, {
        headers: { "User-Agent": "AkeSeafoodWebsite/1.0 (local asset preparation)" },
      });
      if (response.ok) break;
      if (response.status !== 429 || attempt === 4) throw new Error(`Download failed: ${response.status} ${sourceUrl}`);
    } catch (error) {
      if (attempt === 4) throw error;
    }
    await sleep(10000 * (attempt + 1));
  }

  const mime = response.headers.get("content-type") || image.mime || "image/jpeg";
  const ext = mime.includes("png") ? ".png" : mime.includes("webp") ? ".webp" : extname(new URL(sourceUrl).pathname) || ".jpg";
  const filename = `${fileSlug(index, image.title)}${ext.replace(/\.jpeg$/i, ".jpg")}`;
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(new URL(filename, OUT_DIR), bytes);
  await sleep(1200);
  return `assets/products/${filename}`;
}

function commonsFilePage(title) {
  return `https://commons.wikimedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function licenseUrl(meta) {
  return meta?.LicenseUrl?.value || meta?.License?.value || "";
}

function creditFor(image, index, path) {
  const meta = image.extmetadata || {};
  return {
    index,
    path,
    title: image.title,
    source: commonsFilePage(image.title),
    author: clean(meta.Artist?.value || meta.Credit?.value || "Wikimedia Commons contributor"),
    license: clean(meta.LicenseShortName?.value || meta.UsageTerms?.value || "Free license"),
    licenseUrl: licenseUrl(meta),
    query: image.query,
  };
}

function renderPhotoJs(credits) {
  const photos = credits.map((item) => ({
    src: item.path,
    source: item.source,
    author: item.author,
    license: item.license,
    licenseUrl: item.licenseUrl,
  }));

  return `// Generated by tools/fetch-commons-images.mjs. Do not edit by hand.\nwindow.productPhotos = ${JSON.stringify(photos, null, 2)};\n`;
}

function renderCredits(credits) {
  const rows = credits
    .map(
      (item) => `<tr>
        <td>${item.index + 1}</td>
        <td><a href="${item.source}">${clean(item.title.replace(/^File:/, ""))}</a></td>
        <td>${item.author}</td>
        <td>${item.licenseUrl ? `<a href="${item.licenseUrl}">${item.license}</a>` : item.license}</td>
      </tr>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Image Credits - Ake Seafood</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; color: #17364a; background: #f6fbfa; }
      main { width: min(1100px, calc(100% - 32px)); margin: 40px auto; }
      h1 { margin: 0 0 8px; }
      p { color: #5d7280; }
      table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #dbe9e6; }
      th, td { padding: 10px 12px; border-bottom: 1px solid #dbe9e6; text-align: left; vertical-align: top; }
      th { background: #e8f6f3; font-size: .85rem; text-transform: uppercase; letter-spacing: .06em; }
      a { color: #0f7892; }
    </style>
  </head>
  <body>
    <main>
      <h1>Image Credits</h1>
      <p>Product photos are sourced from Wikimedia Commons and stored locally for this website layout. Follow each source link for the complete license record.</p>
      <table>
        <thead><tr><th>#</th><th>Photo</th><th>Author/Credit</th><th>License</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </main>
  </body>
</html>
`;
}

await mkdir(OUT_DIR, { recursive: true });

async function existingCredits(limit) {
  if (!limit) return [];
  const text = await readFile(PHOTO_JS, "utf8");
  const match = text.match(/window\.productPhotos = (\[[\s\S]*\]);/);
  if (!match) return [];
  return JSON.parse(match[1])
    .slice(0, limit)
    .map((item, index) => ({
      index,
      path: item.src,
      title: item.source?.split("/").pop()?.replace(/_/g, " ") || item.src,
      source: item.source,
      author: item.author,
      license: item.license,
      licenseUrl: item.licenseUrl,
      query: "previously fetched",
    }));
}

const credits = await existingCredits(startIndex);
for (let index = startIndex; index < productQueries.length; index += 1) {
  const image = await firstUsableImage(productQueries[index]);
  const path = await downloadImage(image, index);
  credits.push(creditFor(image, index, path));
  await writeFile(PHOTO_JS, renderPhotoJs(credits));
  await writeFile(CREDITS_HTML, renderCredits(credits));
  console.log(`${index + 1}/${productQueries.length}: ${path}`);
}

await writeFile(PHOTO_JS, renderPhotoJs(credits));
await writeFile(CREDITS_HTML, renderCredits(credits));
console.log(`Wrote ${credits.length} photos and attribution records.`);
