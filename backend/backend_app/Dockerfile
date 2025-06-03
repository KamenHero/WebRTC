FROM python:3.11-slim

WORKDIR /backend_app

COPY requirements.txt /backend_app

RUN pip install --upgrade pip \
  && pip install -r requirements.txt

ENTRYPOINT ["daphne", "backend_app.asgi:application"]