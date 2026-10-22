# Image Docker du backend (Render : Settings > Runtime > Docker, en pointant sur ce Dockerfile).
# Plus aucun paquet système propre à l'application n'est requis depuis le retrait de la lecture de pièce
# d'identité : le runtime Python natif de Render reste possible, ce Dockerfile n'est plus obligatoire.
FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --no-input || true

# Le service ne tourne plus en root : une faille applicative n'ouvre alors pas tout le conteneur.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

EXPOSE 10000
# 1 worker + 4 threads : le plan gratuit de Render n'a que 512 Mo et ~0,1 CPU. Les threads permettent à la sonde
# /health/ (réveil, keep-alive) de répondre pendant qu'une requête lente tourne ; un seul process garde aussi le cache
# mémoire cohérent (rejeu OAuth, limiteurs de débit). `--timeout 90` couvre une requête lente sur CPU partagé.
CMD ["sh", "-c", "python manage.py migrate --no-input && exec gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-10000} --workers 1 --threads 4 --timeout 90 --access-logfile -"]
