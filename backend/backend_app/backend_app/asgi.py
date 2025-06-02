"""
ASGI config for backend_app project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

# import os
# import django
# from django.core.asgi import get_asgi_application
# from channels.routing import ProtocolTypeRouter, URLRouter
# from channels.auth import AuthMiddlewareStack
# from channels.security.websocket import AllowedHostsOriginValidator
# from signaling.routing import websocket_urlpatterns  # adjust to match your app name

# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend_app.settings")
# django.setup()

# django_asgi_app = get_asgi_application()

# from signaling import routing

# application = ProtocolTypeRouter({
#     "http": get_asgi_application,
#     "websocket":AllowedHostsOriginValidator(
#         AuthMiddlewareStack(URLRouter(websocket_urlpatterns))
#     ),
# })

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from signaling.routing import websocket_urlpatterns

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_app.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": URLRouter(websocket_urlpatterns),
})