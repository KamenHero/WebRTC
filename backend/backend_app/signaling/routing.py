from django.urls import re_path
from signaling.consumers import SignalingConsumer  # adjust if in a different app

websocket_urlpatterns = [
    re_path(r'ws/signaling/', SignalingConsumer.as_asgi()),
]