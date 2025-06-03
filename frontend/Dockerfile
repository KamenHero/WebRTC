FROM node:22-bullseye

WORKDIR /frontend


RUN mkdir -p ./scripts

COPY scripts/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

ENTRYPOINT ["/frontend/scripts/entrypoint.sh"]