FROM python:3.10-slim

WORKDIR /app

# Installer les dépendances système minimales
RUN apt-get update && \
    apt-get install -y --no-install-recommends git curl && \
    rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier uniquement le code nécessaire
COPY api ./api
COPY matching ./matching
COPY viz ./viz
COPY surveys_bd.sqlite ./surveys_bd.sqlite
#COPY models ./models

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
