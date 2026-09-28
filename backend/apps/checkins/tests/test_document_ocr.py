import base64
import io

from django.core.cache import cache
from PIL import Image, ImageDraw

from apps.checkins.ocr_utils import TESSERACT_AVAILABLE


def _synthetic_cni_data_url() -> str:
    image = Image.new("RGB", (700, 320), "white")
    draw = ImageDraw.Draw(image)
    for i, line in enumerate(["NOM: KOUASSI", "PRENOMS: JEAN MARC", "N CI002936809"]):
        draw.text((20, 20 + i * 40), line, fill="black")
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG")
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def test_ocr_rejects_unknown_qr_token(db, api_client):
    response = api_client.post("/api/v1/public/forms/token-inconnu/ocr/", {"image": "data:image/jpeg;base64,abc"}, format="json")
    assert response.status_code == 404


def test_ocr_rejects_missing_image(db, api_client, organization):
    response = api_client.post(f"/api/v1/public/forms/{organization.qr_secure_token}/ocr/", {}, format="json")
    assert response.status_code == 400


def test_ocr_extracts_fields_from_synthetic_document(db, api_client, organization):
    """Bout-en-bout : image générée en mémoire → OCR serveur → champs extraits.
    Si Tesseract n'est pas installé dans l'environnement de test, on vérifie
    seulement la dégradation propre plutôt que de faire échouer le test."""
    payload = {"image": _synthetic_cni_data_url(), "fields": ["last_name", "first_names", "document_number"]}
    response = api_client.post(f"/api/v1/public/forms/{organization.qr_secure_token}/ocr/", payload, format="json")

    assert response.status_code == 200
    assert response.data["available"] is TESSERACT_AVAILABLE
    if TESSERACT_AVAILABLE:
        assert response.data["extracted"].get("last_name") == "KOUASSI"
        assert response.data["extracted"].get("document_number") == "CI002936809"


def test_ocr_is_throttled_more_strictly_than_other_public_endpoints(db, api_client, organization):
    """6/min : bien plus strict que les 60/min par défaut, car chaque appel
    fait tourner Tesseract côté serveur (coût CPU)."""
    cache.clear()  # le cache de throttle (LocMemCache) n'est pas réinitialisé entre les tests
    payload = {"image": "data:image/jpeg;base64," + base64.b64encode(b"not-an-image").decode()}
    responses = [api_client.post(f"/api/v1/public/forms/{organization.qr_secure_token}/ocr/", payload, format="json") for _ in range(7)]
    assert responses[-1].status_code == 429
    cache.clear()  # ne pas laisser ce throttle affecter les tests suivants du fichier


def test_ocr_rejects_malformed_base64_without_crashing(db, api_client, organization):
    payload = {"image": "data:image/jpeg;base64,not-valid-base64!!!"}
    response = api_client.post(f"/api/v1/public/forms/{organization.qr_secure_token}/ocr/", payload, format="json")
    assert response.status_code == 200
    assert response.data["available"] is False
    assert response.data["extracted"] == {}
