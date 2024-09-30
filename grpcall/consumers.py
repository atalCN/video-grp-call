import json
from channels.generic.websocket import AsyncWebsocketConsumer

class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'Test-Room'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
            )
        await self.accept()

    async def disconnect(self, close_code):
        # When a user disconnects, remove them from the group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        print('Disconnect.')
        
    # Receive message from WebSocket
    async def receive(self, text_data):
        
        recived_dict = json.loads(text_data)
        # message = recived_dict['message']
        action = recived_dict['action']
        recived_dict['message']['reciever_channel_name'] = self.channel_name
        print('action: ', action)
        print('recived_dict: ',recived_dict)
        
        if action == 'new-offer' or action == 'new-answer':
            
            reciever_channle_name = recived_dict['message']['reciever_channel_name']
            print('offer or answer channel name : ', reciever_channle_name)
            
            recived_dict['message']['reciever_channel_name'] = self.channel_name
            
            await self.channel_layer.send(
                reciever_channle_name,
                {
                    'type': 'send.sdp',
                    'recived_dict': recived_dict
                }
            )
        
        if action == 'new-peer':
            print('peer group name: ', self.room_group_name)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send.sdp',
                    'recived_dict': recived_dict
                }
            )
        
    async def send_sdp(self,event):
        recived_dict = event['recived_dict']
        print('sending recived_dict: ',recived_dict)
        await self.send(text_data=json.dumps(recived_dict))


class VideoChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.username = self.scope['url_route']['kwargs']['username']
        self.room_name = self.scope['url_route']['kwargs']['room']
        self.group_name = f"video_chat_{self.room_name}"

        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        # Accept the WebSocket connection
        await self.accept()

        # Notify the group that a new user has joined
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'webrtc_message',
                'message':{
                    'type': 'user_joined',
                    'username': 'user join the room'
                },
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

        # Notify the group that a user has left
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'webrtc_message',
                'message':{
                    'type': 'user_left',
                    'username': 'user left the room'
                },
            }
            
        )

    # Send WebRTC signaling messages to peers
    async def webrtc_message(self, event):
        message = event['message']

        # Send the message to the WebSocket client
        await self.send(text_data=json.dumps({
            'message': message
        }))
        
    # async def user_joined(self, event):
    #     username = event['username']
    #     # Send message to WebSocket
    #     await self.send(text_data=json.dumps({
    #         'message': f"{username} has joined the room."
    #     }))

    # async def user_left(self, event):
    #     username = event['username']
    #     # Send message to WebSocket
    #     await self.send(text_data=json.dumps({
    #         'message': f"{username} has left the room."
    #     }))


class RoomConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept WebSocket connection
        await self.accept()

        # Notify others in the room that a new peer has joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'peer_joined',
                'message': f'New peer joined {self.room_name}',
                'peer_id': self.channel_name  # Optional: track who joined
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'offer':
            # Forward offer to other peers
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'offer',
                    'offer': data['offer'],
                    'from': self.channel_name
                }
            )
        elif message_type == 'answer':
            # Forward answer to the specific peer
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'answer',
                    'answer': data['answer'],
                    'to': data['to']
                }
            )
        elif message_type == 'ice_candidate':
            # Forward ICE candidate to other peers
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'ice_candidate',
                    'candidate': data['candidate'],
                    'from': self.channel_name
                }
            )

    async def peer_joined(self, event):
        # Broadcast the new peer join event to all peers
        await self.send(text_data=json.dumps({
            'type': 'peer_joined',
            'message': event['message'],
            'peer_id': event['peer_id']  # Optional: identify the new peer
        }))

        # Notify all existing peers to connect to the new user
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'initiate_connection',
                'peer_id': self.channel_name
            }
        )

    async def offer(self, event):
        # Send offer to all peers
        await self.send(text_data=json.dumps({
            'type': 'offer',
            'offer': event['offer'],
            'from': event['from']
        }))

    async def answer(self, event):
        # Send answer to the specific peer
        await self.send(text_data=json.dumps({
            'type': 'answer',
            'answer': event['answer'],
            'to': event['to']
        }))

    async def ice_candidate(self, event):
        # Send ICE candidate to all peers
        await self.send(text_data=json.dumps({
            'type': 'ice_candidate',
            'candidate': event['candidate'],
            'from': event['from']
        }))
