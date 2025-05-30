FROM python:3.11

WORKDIR backend/backend_app/

RUN daphne backend_app.asgi:application

RUN python3 manage.py runserver

WORKDIR frontend/

RUN npm run dev
