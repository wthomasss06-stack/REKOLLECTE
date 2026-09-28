"""OCR serveur pour le scan de pièce d'identité (CNI, passeport).

Remplace l'ancienne lecture 100% navigateur (tesseract.js/WASM) : sur un
téléphone d'entrée de gamme en 4G, télécharger le moteur WASM + les données de
langue puis faire tourner l'inférence sur le CPU du visiteur dépassait
régulièrement les 35 secondes de délai (voir le rapport de fusion). Ici,
Tesseract tourne côté serveur — plus rapide et plus fiable, au prix d'un aller-
retour réseau pour envoyer la photo.

Dépendances système : tesseract-ocr + tesseract-ocr-fra (voir backend/Dockerfile
— le runtime Python natif de Render ne permet pas d'installer de paquets
système, d'où le passage à un déploiement Docker pour ce service).
Dépendances Python : pytesseract, Pillow (voir requirements.txt).

Si Tesseract n'est pas disponible sur l'environnement d'exécution, les
fonctions renvoient un résultat vide plutôt que de faire planter la requête —
le formulaire retombe alors sur la saisie manuelle, jamais sur une erreur 500.
"""
import base64
import binascii
import logging
import re
import unicodedata
from io import BytesIO

logger = logging.getLogger(__name__)

try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter, UnidentifiedImageError
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("[OCR] pytesseract ou Pillow non disponible — lecture OCR désactivée côté serveur")

# Champs extractibles, alignés sur ExtractKey côté frontend (DocumentScanner.tsx).
OCR_FIELDS = ("last_name", "first_names", "document_number", "birth_date", "nationality", "expiry_date")

# Numéro CNI ivoirienne : CI (ou C1/CT — confusions OCR fréquentes) + 9 chiffres.
_RE_CNI_NUMERO = re.compile(r"C[I1T][- ]?\d[- ]?\d{3}[- ]?\d{3}[- ]?\d{2}", re.IGNORECASE)
_RE_PASSPORT_NUMERO = re.compile(r"\b[A-Z]{1,2}\d{6,9}\b")
_RE_NOM = re.compile(r"(?:NOM(?:S)?\s*[:\-]?\s*)([A-ZÉÈÊËÀÂÙÛÜÎÏÔŒÆ][A-ZÉÈÊËÀÂÙÛÜÎÏÔŒÆ '-]{1,39})", re.IGNORECASE)
_RE_PRENOMS = re.compile(r"(?:PR[EÉ]NOM(?:S)?\s*[:\-]?\s*)([A-ZÉÈÊËÀÂÙÛÜÎÏÔŒÆ][A-ZÉÈÊËÀÂÙÛÜÎÏÔŒÆ '-]{1,59})", re.IGNORECASE)
_RE_DATE = re.compile(r"\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\b")
_RE_NATIONALITY = re.compile(r"ivoir\w*|c[oô]te d.?ivoire", re.IGNORECASE)


def _preprocess_image(raw_bytes: bytes):
    """Niveaux de gris + contraste + netteté : même recette que la conversion
    canvas côté client, reprise ici pour ne rien perdre en migrant côté
    serveur (voir prepareOcrImage dans DocumentScanner.tsx)."""
    image = Image.open(BytesIO(raw_bytes)).convert("RGB")
    width, height = image.size
    longest_side = max(width, height)
    if longest_side < 1600:
        scale = 1600 / max(longest_side, 1)
        image = image.resize((int(width * scale), int(height * scale)), Image.LANCZOS)
    image = image.convert("L")
    image = ImageEnhance.Contrast(image).enhance(1.6)
    image = image.filter(ImageFilter.SHARPEN)
    return image


def decode_data_url(data_url: str) -> bytes:
    """Décode une image data:image/...;base64,... envoyée par le navigateur.
    Lève ValueError si le format n'est pas reconnu — jamais utilisé pour
    stocker l'image, uniquement pour la traiter en mémoire (voir DocumentOcrView)."""
    match = re.match(r"^data:image/[a-zA-Z0-9.+-]+;base64,(.+)$", data_url.strip())
    if not match:
        raise ValueError("Format d’image invalide (data URL attendue).")
    try:
        return base64.b64decode(match.group(1), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Image illisible (encodage base64 invalide).") from exc


def extract_text(raw_bytes: bytes) -> str:
    """Extrait le texte brut d'une image avec Tesseract. Chaîne vide si
    l'extraction échoue ou si Tesseract est absent — jamais d'exception qui
    remonterait en 500 côté API publique."""
    if not TESSERACT_AVAILABLE:
        return ""
    try:
        image = _preprocess_image(raw_bytes)
    except UnidentifiedImageError:
        return ""
    except Exception:
        logger.exception("[OCR] Prétraitement image échoué")
        return ""
    try:
        text = pytesseract.image_to_string(image, config="--psm 6 -l fra+eng")
        if len(text.strip()) < 12:
            text = pytesseract.image_to_string(image, config="--psm 11 -l fra+eng")
        return text.upper()
    except pytesseract.TesseractNotFoundError:
        logger.error("[OCR] Binaire tesseract introuvable sur ce serveur — voir backend/Dockerfile.")
        return ""
    except Exception:
        logger.exception("[OCR] Extraction texte échouée")
        return ""


def _clean(value: str | None) -> str:
    if not value:
        return ""
    value = unicodedata.normalize("NFKC", value).strip()
    return re.sub(r"\s{2,}", " ", value)


def extract_fields(text: str, fields: list[str]) -> dict[str, str]:
    """Extraction ciblée CNI/passeport ivoirienne, avec repli générique (comme
    l'ancienne heuristique client) pour les documents étrangers ou mal
    reconnus."""
    result: dict[str, str] = {}
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    dates = _RE_DATE.findall(text)

    if "last_name" in fields:
        match = _RE_NOM.search(text)
        result["last_name"] = _clean(match.group(1)) if match else _clean(next((l for l in lines if re.fullmatch(r"[A-ZÀ-Ÿ '-]{3,40}", l)), ""))
    if "first_names" in fields:
        match = _RE_PRENOMS.search(text)
        result["first_names"] = _clean(match.group(1)) if match else ""
    if "document_number" in fields:
        cni = _RE_CNI_NUMERO.search(text)
        if cni:
            result["document_number"] = cni.group(0).replace(" ", "").replace("-", "").upper()
        else:
            passport = _RE_PASSPORT_NUMERO.search(text)
            result["document_number"] = passport.group(0) if passport else ""
    if "birth_date" in fields:
        result["birth_date"] = dates[0] if dates else ""
    if "expiry_date" in fields:
        result["expiry_date"] = dates[1] if len(dates) > 1 else ""
    if "nationality" in fields:
        match = _RE_NATIONALITY.search(text)
        result["nationality"] = "Ivoirienne" if match else ""

    return {key: value for key, value in result.items() if value}


def run_document_ocr(data_url: str, fields: list[str]) -> dict:
    """Point d'entrée unique utilisé par DocumentOcrView. Ne lève jamais
    d'exception métier — les erreurs se traduisent en `available: False` pour
    que le frontend retombe proprement sur la saisie manuelle."""
    if not TESSERACT_AVAILABLE:
        return {"available": False, "raw_text": "", "extracted": {}}
    try:
        raw_bytes = decode_data_url(data_url)
    except ValueError:
        return {"available": False, "raw_text": "", "extracted": {}}

    text = extract_text(raw_bytes)
    if not text.strip():
        return {"available": True, "raw_text": "", "extracted": {}}

    extracted = extract_fields(text, [f for f in fields if f in OCR_FIELDS])
    return {"available": True, "raw_text": text.strip()[:2000], "extracted": extracted}
