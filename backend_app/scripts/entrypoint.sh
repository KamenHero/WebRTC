#!/bin/bash

pip install --upgrade pip 

pip install -r requirements.txt

pip uninstall channels -y

pip install channels

daphne -b 0.0.0.0 -p 8000 backend_app.asgi:application
