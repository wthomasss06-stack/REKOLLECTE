# Le runtime Python natif de Render ne permet pas d'installer de paquets
# système (apt-get) — confirmé par Render eux-mêmes : "Native Environments...
# permissions... preventing apt-get and OS-level package installs."
# La lecture OCR côté serveur (apps/checkins/ocr_utils.py) a besoin du binaire
# tesseract-ocr, donc ce service doit être déployé en Docker sur Render
# (Render supporte Docker nativement — changer le type de service dans le
# dashboard : Settings > Runtime > Docker, en pointant sur ce Dockerfile).
FROM python:3.12-slim

# tesseract-ocr : moteur OCR ; tesseract-ocr-fra : données de langue française
# (les CNI/passeports traités ici sont très majoritairement en français).
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    tesseract-ocr-fra \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --no-input || true

EXPOSE 10000
CMD ["sh", "-c", "python manage.py migrate && gunicorn core.wsgi:application --bind 0.0.0.0:$PORT"]
