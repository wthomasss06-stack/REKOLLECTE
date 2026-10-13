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

# Le service ne tourne plus en root : une faille applicative (ex. dans Tesseract ou Pillow, qui traitent des images
# envoyées par des visiteurs anonymes) n'ouvre alors pas tout le conteneur.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

EXPOSE 10000
# 1 worker + 4 threads : le plan gratuit de Render n'a que 512 Mo et ~0,1 CPU. Les threads permettent à la sonde
# /health/ (réveil, keep-alive) de répondre pendant qu'une lecture OCR tourne ; un seul process garde aussi le cache
# mémoire cohérent (rejeu OAuth, limiteurs de débit). `--timeout 90` couvre une lecture OCR lente sur CPU partagé.
CMD ["sh", "-c", "python manage.py migrate --no-input && exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 4 --timeout 90 --access-logfile -"]
