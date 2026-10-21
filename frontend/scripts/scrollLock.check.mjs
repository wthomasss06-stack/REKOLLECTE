// Vérifie le verrou de défilement partagé (fenêtres qui se ferment dans le désordre).
// Lancer depuis frontend/ :  node --experimental-strip-types scripts/scrollLock.check.mjs
globalThis.document = { body: { style: { overflow: "" } } };
const { lockScroll, releaseStaleScrollLock } = await import("../src/lib/scrollLock.ts");
const ok = (condition, message) => { if (!condition) { console.error("ÉCHEC :", message); process.exit(1); } console.log("ok  -", message); };
const a = lockScroll(); ok(document.body.style.overflow === "hidden", "une fenêtre fige la page");
const b = lockScroll();
a(); ok(document.body.style.overflow === "hidden", "la première se ferme, la page reste figée tant que la seconde est ouverte");
b(); ok(document.body.style.overflow === "", "la dernière se ferme : le défilement est rétabli");
const c = lockScroll(); c(); c(); ok(document.body.style.overflow === "", "libérer deux fois est sans effet");
document.body.style.overflow = "hidden"; releaseStaleScrollLock(); ok(document.body.style.overflow === "", "un verrou orphelin est levé");
const d = lockScroll(); releaseStaleScrollLock(); ok(document.body.style.overflow === "hidden", "un verrou actif n'est pas levé"); d();
console.log("TOUS LES CONTRÔLES PASSENT");
