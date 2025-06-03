FROM python:3.11-slim-bullseye

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /backend_app

RUN mkdir -p ./scripts

COPY scripts/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/backend_app/scripts/entrypoint.sh"]

# RUN pip install --upgrade pip \
#   && pip install -r requirements.txt


# ENTRYPOINT ["sleep", "infinity"]
