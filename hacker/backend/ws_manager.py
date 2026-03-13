"""
ws_manager.py — WebSocket connection manager for SENTINEL.

Maintains two separate pools:
  • students  — keyed by session_id (str)
  • admins    — keyed by admin_id  (str)

`broadcast_to_admins` fans out a JSON message to every connected auditor
so dashboards update in real-time.
"""

from fastapi import WebSocket


class ConnectionManager:
    """Manages active WebSocket connections, split by role."""

    def __init__(self) -> None:
        # {user_id: WebSocket}
        self.active_students: dict[str, WebSocket] = {}
        self.active_admins: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, role: str, user_id: str) -> None:
        """Accept the socket and register it under the correct pool."""
        await websocket.accept()
        if role == "admin":
            self.active_admins[user_id] = websocket
        else:
            self.active_students[user_id] = websocket

    def disconnect(self, role: str, user_id: str) -> None:
        """Remove a socket from its pool (no await needed)."""
        if role == "admin":
            self.active_admins.pop(user_id, None)
        else:
            self.active_students.pop(user_id, None)

    async def broadcast_to_admins(self, message: dict) -> None:
        """
        Send a JSON payload to every connected admin dashboard.
        Stale connections are silently removed.
        """
        stale: list[str] = []
        for admin_id, ws in self.active_admins.items():
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(admin_id)
        # Clean up any disconnected sockets discovered during broadcast
        for aid in stale:
            self.active_admins.pop(aid, None)


# Global singleton shared across the application
manager = ConnectionManager()
