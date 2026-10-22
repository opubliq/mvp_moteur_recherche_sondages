# Image du pool de sessions custom `opubliq-sondages-pycustom`
# (Azure Container Apps dynamic sessions, CustomContainer). Voir docs/python_sandbox.md.
#
# Build (ACR Tasks, pas de Docker local requis) :
#   az acr build -r opubliqgeomarketingacr -t sondages-pysandbox:<tag> sandbox/
FROM python:3.12-slim-bookworm

# g++ : backend C de PyTensor (PyMC / Bambi) — sans lui, mode Python pur très lent.
RUN apt-get update \
 && apt-get install -y --no-install-recommends g++ \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --no-compile -r /tmp/requirements.txt \
 && rm /tmp/requirements.txt

RUN useradd --create-home --uid 1000 sandbox \
 && mkdir -p /mnt/data /app \
 && chown sandbox:sandbox /mnt/data

ENV HOME=/home/sandbox \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/home/sandbox/.config/matplotlib \
    JAX_PLATFORMS=cpu \
    XLA_FLAGS=--xla_force_host_platform_device_count=2 \
    PYTENSOR_FLAGS=compiledir=/home/sandbox/.pytensor \
    SANDBOX_DATA_DIR=/mnt/data \
    PORT=8080

COPY --chown=root:root server.py kernel.py warmup.py /app/
WORKDIR /app
USER sandbox

# Vérifie les imports + pré-compile le cache PyTensor (couche de l'image).
RUN python /app/warmup.py

EXPOSE 8080
CMD ["python", "/app/server.py"]
