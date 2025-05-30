from channels.generic.websocket import AsyncWebsocketConsumer

import json

ROOMS = {}  # {room_id: {user_id: channel_name}}

class SignalingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        self.room = None
        self.user = None

    async def disconnect(self, close_code):
        if self.room and self.user:
            ROOMS[self.room].pop(self.user, None)

    async def receive(self, text_data):
        data = json.loads(text_data)
        type = data.get("type")

        if type == "join_room":
            self.room = data["room"]
            self.user = data["user_id"]
            ROOMS.setdefault(self.room, {})[self.user] = self.channel_name
            await self.send(text_data=json.dumps({"type": "joined", "room": self.room}))

        elif type in ["send_offer", "send_answer", "ice_candidate"]:
            target = data["target"]
            message = data
            if self.room in ROOMS and target in ROOMS[self.room]:
                await self.channel_layer.send(
                    ROOMS[self.room][target],
                    {
                        "type": "mcp.forward",
                        "message": message
                    }
                )

    async def mcp_forward(self, event):
        await self.send(text_data=json.dumps(event["message"]))
