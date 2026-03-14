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
        # {session_id: {admin_id, ...}}
        self.student_admin_links: dict[str, set[str]] = {}

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
            for session_id in list(self.student_admin_links.keys()):
                self.student_admin_links[session_id].discard(user_id)
                if not self.student_admin_links[session_id]:
                    self.student_admin_links.pop(session_id, None)
        else:
            self.active_students.pop(user_id, None)
            self.student_admin_links.pop(user_id, None)

    def link_student_to_admin(self, session_id: str, admin_id: str) -> None:
        """Create or update a directed link from a student session to an admin."""
        if not admin_id:
            return
        if session_id not in self.student_admin_links:
            self.student_admin_links[session_id] = set()
        self.student_admin_links[session_id].add(admin_id)

    def link_student_to_admins(self, session_id: str, admin_ids: list[str]) -> None:
        """Link a student session to many admins at once (N-to-N friendly)."""
        for admin_id in admin_ids:
            normalized = (admin_id or "").strip()
            if normalized:
                self.link_student_to_admin(session_id=session_id, admin_id=normalized)

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

    async def broadcast_to_linked_admins(
        self, session_id: str, message: dict
    ) -> None:
        """
        Send a JSON payload to all connected admins (true N-to-N visibility).

        Historical links are still tracked for metadata/auditing and optional
        future filtering, but delivery defaults to all active administrators.
        """
        await self.broadcast_to_admins(message)


# Global singleton shared across the application
manager = ConnectionManager()
