import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const HEROES_FILE = path.join(ROOT_DIR, 'src', 'data', 'all131Heroes.ts');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'heroes');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Read all hero IDs and names from all131Heroes.ts
const content = fs.readFileSync(HEROES_FILE, 'utf8');
const idMatches = [...content.matchAll(/"id":\s*"([^"]+)",\s*"name":\s*"([^"]+)"/g)];

const heroes = idMatches.map(m => ({ id: m[1].toLowerCase(), name: m[2] }));
console.log(`Found ${heroes.length} heroes in dataset.`);

// Special name mappings for Arena of Valor Wiki
const WIKI_NAME_MAP = {
  "d'arcy": "D'Arcy",
  "darcy": "D'Arcy",
  "kil'groth": "Kil'Groth",
  "kilgroth": "Kil'Groth",
  "lu bu": "Lu Bu",
  "lubu": "Lu Bu",
  "diao chan": "Diaochan",
  "diaochan": "Diaochan",
  "stuart": "The Joker",
  "joker": "The Joker",
  "kaine": "Batman",
  "batman": "Batman",
  "mortos": "Arthur",
  "bijan": "Bijan",
  "ming": "Ming",
  "biron": "Biron",
  "erin": "Erin",
  "charlotte": "Charlotte",
  "billow": "Billow",
  "doria": "Doria",
  "hecate": "Hecate",
  "dolores": "Dolores",
  "terri": "Terri",
  "teeri": "Terri",
  "bonnie": "Bonnie",
  "rouie": "Rouie",
  "keera": "Keera",
  "ata": "Ata",
  "paine": "Paine",
  "laville": "Laville",
  "zata": "Zata",
  "allain": "Allain",
  "sinestrea": "Sinestrea",
  "dexter": "Dextra",
  "dextra": "Dextra",
  "lorion": "Lorion",
  "bright": "Bright",
  "aoi": "Aoi",
  "iggy": "Iggy",
  "tachi": "Tachi",
  "aya": "Aya",
  "yue": "Yue",
  "yan": "Yan",
  "helen": "Helen",
  "khepri": "Khepri",
};

function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(httpsGet(res.headers.location, headers));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

async function queryWikiBatch(titles) {
  const encTitles = encodeURIComponent(titles.join('|'));
  const apiUrl = `https://arenaofvalor.fandom.com/api.php?action=query&titles=${encTitles}&prop=pageimages&format=json&pithumbsize=240`;
  try {
    const raw = await httpsGet(apiUrl, { 'User-Agent': 'Mozilla/5.0' });
    const json = JSON.parse(raw.toString('utf8'));
    return json.query?.pages || {};
  } catch (err) {
    console.error(`API Error for batch:`, err.message);
    return {};
  }
}

async function downloadImage(url, destPath) {
  try {
    const buffer = await httpsGet(url, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://arenaofvalor.fandom.com/',
    });
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    return false;
  }
}

async function main() {
  const titleToHeroMap = new Map();

  for (const hero of heroes) {
    const wikiTitle = WIKI_NAME_MAP[hero.id] || hero.name;
    titleToHeroMap.set(wikiTitle.toLowerCase(), hero);
    titleToHeroMap.set(hero.name.toLowerCase(), hero);
  }

  const allTitles = [...new Set(heroes.map(h => WIKI_NAME_MAP[h.id] || h.name))];
  const BATCH_SIZE = 40;
  const foundImages = new Map();

  for (let i = 0; i < allTitles.length; i += BATCH_SIZE) {
    const batch = allTitles.slice(i, i + BATCH_SIZE);
    const pages = await queryWikiBatch(batch);

    for (const page of Object.values(pages)) {
      if (page.thumbnail?.source) {
        const titleKey = page.title.toLowerCase();
        foundImages.set(titleKey, page.thumbnail.source);
      }
    }
  }

  console.log(`Found direct thumbnail matches for ${foundImages.size} titles.`);

  let downloadedCount = 0;
  for (const hero of heroes) {
    const targetFile = path.join(OUTPUT_DIR, `${hero.id}.jpg`);
    if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 1000) {
      downloadedCount++;
      continue;
    }

    const wikiTitle = (WIKI_NAME_MAP[hero.id] || hero.name).toLowerCase();
    const imgUrl = foundImages.get(wikiTitle) || foundImages.get(hero.name.toLowerCase());

    if (imgUrl) {
      const ok = await downloadImage(imgUrl, targetFile);
      if (ok) {
        downloadedCount++;
        console.log(`✓ [${downloadedCount}/${heroes.length}] Downloaded ${hero.name} (${hero.id})`);
      }
    }
  }

  console.log(`Done batch download. Total ready: ${downloadedCount}/${heroes.length}`);
}

main().catch(console.error);
