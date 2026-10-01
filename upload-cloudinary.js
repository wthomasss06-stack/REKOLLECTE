const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Chargement local uniquement : les secrets restent dans .env.local / .env et ne sont
// jamais écrits dans le manifeste ni dans les logs.
const envPaths = [
  path.join(__dirname, '.env.local'),
  path.join(__dirname, '.env'),
];

for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) continue;
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalsIdx = trimmed.indexOf('=');
    if (equalsIdx === -1) return;
    const key = trimmed.slice(0, equalsIdx).trim();
    if (process.env[key] === undefined) {
      process.env[key] = trimmed.slice(equalsIdx + 1).trim();
    }
  });
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  const missing = [
    ['CLOUDINARY_CLOUD_NAME', cloudName],
    ['CLOUDINARY_API_KEY', apiKey],
    ['CLOUDINARY_API_SECRET', apiSecret],
  ].filter(([, value]) => !value).map(([name]) => name);
  console.error(`❌ Variable(s) manquante(s) : ${missing.join(', ')}`);
  console.error("Définissez-les dans cette même fenêtre PowerShell avant de lancer le script.");
  process.exit(1);
}

const BASE_FOLDER = 'akatech';
const fallbackImagesDir = path.join(__dirname, 'ecomm');
const projectPublicDir = path.join(__dirname, 'frontend', 'public');
const legacyDefaultImagesDir = path.join(__dirname, 'public', 'images');
const defaultImagesDir = fs.existsSync(projectPublicDir)
  ? projectPublicDir
  : (fs.existsSync(legacyDefaultImagesDir) ? legacyDefaultImagesDir : fallbackImagesDir);
const imagesDir = process.env.CLOUDINARY_SOURCE_DIR
  ? path.resolve(__dirname, process.env.CLOUDINARY_SOURCE_DIR)
  : defaultImagesDir;
const manifestPath = path.join(__dirname, '.cloudinary-manifest.json');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.avif', '.bmp']);
const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');
const VIDEO_EXTENSIONS = new Set(['.webm', '.mp4', '.mov', '.m4v', '.avi']);

function loadManifest() {
  if (FORCE) return {};
  try { return JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { return {}; }
}

function fileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function getFilesRecursively(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const filePath = path.join(dir, entry.name);
    return entry.isDirectory() ? getFilesRecursively(filePath) : [filePath];
  });
}

/**
 * Identifiant Cloudinary déterministe : le nom logique du média est son chemin
 * public sans extension. Ainsi, un nouveau WebP remplace le média précédent
 * portant le même nom de projet, même si son extension change.
 */
function publicIdFor(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/').normalize('NFC');
  const extension = path.posix.extname(normalized);
  return `${BASE_FOLDER}/${extension ? normalized.slice(0, -extension.length) : normalized}`;
}

function resourceTypeFor(relativePath) {
  return VIDEO_EXTENSIONS.has(path.extname(relativePath).toLowerCase()) ? 'video' : 'image';
}

const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

async function uploadFile(filePath, relativePath) {
  const publicId = publicIdFor(relativePath);
  const resourceType = resourceTypeFor(relativePath);

  if (DRY_RUN) return { secure_url: '[dry-run]', public_id: publicId, resource_type: resourceType };

  const res = await cloudinary.uploader.upload(filePath, {
    public_id: publicId,
    resource_type: resourceType,
    overwrite: true,
    invalidate: true,
    use_filename: false,
    unique_filename: false,
  });

  return res;
}

async function uploadAll() {
  if (!fs.existsSync(imagesDir)) {
    throw new Error(`Le dossier source n'existe pas. Attendu: ${defaultImagesDir} ou ${fallbackImagesDir}`);
  }
  const manifest = loadManifest();
  const files = getFilesRecursively(imagesDir).filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  const seenPaths = new Set();

  console.log(`🚀 Synchronisation de ${files.length} médias vers Cloudinary${DRY_RUN ? ' (dry-run)' : ''}${FORCE ? ' (force)' : ''}`);

  for (const filePath of files) {
    const relativePath = path.relative(imagesDir, filePath).replace(/\\/g, '/');
    const publicId = publicIdFor(relativePath);
    const hash = fileHash(filePath);
    seenPaths.add(relativePath);
    const previous = manifest[relativePath];
    const previousHash = typeof previous === 'string' ? previous : previous?.hash;

    if (!FORCE && previousHash === hash) {
      skipped++;
      continue;
    }

    try {
      console.log(`⏳ ${relativePath} → ${publicId}`);
      const result = await uploadFile(filePath, relativePath);
      manifest[relativePath] = {
        hash,
        publicId,
        resourceType: resourceTypeFor(relativePath),
        updatedAt: new Date().toISOString(),
      };
      console.log(`  ✅ ${result.secure_url}`);
      uploaded++;
    } catch (error) {
      console.error(`  ❌ ${relativePath}: ${error.message}`);
      failed++;
    }
  }

  for (const knownPath of Object.keys(manifest)) {
    if (!seenPaths.has(knownPath)) delete manifest[knownPath];
  }
  if (!DRY_RUN) fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nTerminé — envoyés: ${uploaded}, inchangés: ${skipped}, échecs: ${failed}`);
  if (failed) process.exitCode = 1;
}

uploadAll().catch(error => { console.error(`❌ ${error.message}`); process.exitCode = 1; });
