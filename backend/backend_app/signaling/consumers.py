import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
import uuid
from asyncio import Lock

class ChatConsumer(AsyncWebsocketConsumer):
    # Class variable to track connected users across all instances
    connected_users = {}  # Format: {username: channel_name}
    connected_users_lock = Lock()
    
    async def connect(self):
        self.room_name = "general_chat"
        self.room_group_name = f"chat_{self.room_name}"
        self.username = None  # Will be set when user joins
        
        await self.accept()

    async def disconnect(self, close_code):
        if self.username:
            # Acquire lock when removing users
            async with self.connected_users_lock:
                if self.username in self.connected_users:
                    del self.connected_users[self.username]
            
            # Notify others about user leaving
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'system_message',
                    'message': f"{self.username} left the chat",
                    'sender': 'System',
                    'timestamp': self.get_timestamp()
                }
            )
        
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == "join_channel":
                await self.handle_join(data)
            elif message_type == "send_message":
                await self.handle_message(data)
            else:
                raise ValueError("Invalid message type")
                
        except Exception as e:
            await self.send_error(str(e))

    async def handle_join(self, data):
        username = data.get('user_info', {}).get('name', '').strip()
        
        if not username:
            await self.send_error("Username cannot be empty")
            await self.close()
            return
            
        # Acquire lock when checking/adding users
        async with self.connected_users_lock:
            if username in self.connected_users:
                await self.send_error(f"Username '{username}' is already taken. Please choose another name.")
                await self.close()
                return
                
            self.connected_users[username] = self.channel_name
        
        self.username = username
        self.connected_users[username] = self.channel_name
        
        # Add to room group only after successful username validation
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Broadcast join notification to everyone except the new user
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'system_message',
                'message': f"{username} joined the chat",
                'sender': 'System',
                'timestamp': self.get_timestamp()
            }
        )
        
        # Send welcome message only to the new user
        await self.send(json.dumps({
            'type': 'join_success',
            'message': f"Welcome to the chat, {username}!",
            'sender': 'System',
            'timestamp': self.get_timestamp(),
            'username': username
        }))

    async def handle_message(self, data):
        """Handle regular chat messages"""
        # Verify user has joined with a valid username first
        if not self.username or self.username not in self.connected_users:
            await self.send_error("You must join the chat before sending messages")
            return
            
        message = data.get('content', '').strip()
        if not message:
            return
            
        # Broadcast message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender': self.username,
                'timestamp': self.get_timestamp()
            }
        )

    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(json.dumps({
            'type': 'error',
            'message': error_message,
            'timestamp': self.get_timestamp()
        }))

    async def chat_message(self, event):
        """Handle receiving a chat message"""
        # Don't send the message back to the sender
        if event['sender'] == self.username:
            return
            
        await self.send(json.dumps({
            'type': 'new_message',
            'content': event['message'],
            'sender': {'name': event['sender']},
            'timestamp': event['timestamp']
        }))

    async def system_message(self, event):
        """Handle system notifications"""
        await self.send(json.dumps({
            'type': 'system_notification',
            'content': event['message'],
            'sender': {'name': event['sender']},
            'timestamp': event['timestamp']
        }))

    def get_timestamp(self):
        return datetime.now().strftime('%H:%M')