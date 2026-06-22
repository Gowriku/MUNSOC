from fastapi import WebSocket
from typing import Dict, List
import json


class ConnectionManager:
    def __init__(self):
        # committee_id -> list of websockets
        self.committee_connections: Dict[str, List[WebSocket]] = {}
        # user_id -> websocket (for personal notifications)
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str, committee_id: str = None):
        await websocket.accept()
        self.user_connections[user_id] = websocket
        if committee_id:
            if committee_id not in self.committee_connections:
                self.committee_connections[committee_id] = []
            self.committee_connections[committee_id].append(websocket)

    def disconnect(self, user_id: str, committee_id: str = None):
        ws = self.user_connections.pop(user_id, None)
        if ws and committee_id and committee_id in self.committee_connections:
            self.committee_connections[committee_id] = [
                c for c in self.committee_connections[committee_id] if c != ws
            ]

    async def broadcast_to_committee(self, committee_id: str, message: dict):
        connections = self.committee_connections.get(committee_id, [])
        dead = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        # Clean up dead connections
        self.committee_connections[committee_id] = [
            c for c in connections if c not in dead
        ]

    async def broadcast_to_all(self, message: dict):
        dead = []
        for user_id, ws in self.user_connections.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(user_id)
        for uid in dead:
            self.user_connections.pop(uid, None)

    async def send_to_user(self, user_id: str, message: dict):
        ws = self.user_connections.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.user_connections.pop(user_id, None)


manager = ConnectionManager()