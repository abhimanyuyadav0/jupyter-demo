"""
WebSocket connection manager for real-time features
"""

from fastapi import WebSocket
from typing import List, Dict, Any
import json
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WebSocketManager:
    """Manages WebSocket connections for real-time data streaming"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.streaming_tasks: Dict[WebSocket, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket):
        """Accept and store new WebSocket connection"""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        """Remove WebSocket connection"""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            
        # Cancel streaming task if exists
        if websocket in self.streaming_tasks:
            self.streaming_tasks[websocket].cancel()
            del self.streaming_tasks[websocket]
            
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send message to specific WebSocket connection"""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send message to WebSocket: {str(e)}")
            self.disconnect(websocket)
    
    async def send_json_message(self, data: Dict[Any, Any], websocket: WebSocket):
        """Send JSON data to specific WebSocket connection"""
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as e:
            logger.error(f"Failed to send JSON to WebSocket: {str(e)}")
            self.disconnect(websocket)
    
    async def broadcast(self, message: str):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast to WebSocket: {str(e)}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def broadcast_json(self, data: Dict[Any, Any]):
        """Broadcast JSON data to all connected clients"""
        message = json.dumps(data)
        await self.broadcast(message)
    
    async def start_data_stream(self, websocket: WebSocket, query: str = None):
        """Start streaming real-time data to a WebSocket connection"""
        async def stream_data():
            while websocket in self.active_connections:
                try:
                    # Generate mock real-time data
                    data = {
                        "timestamp": datetime.now().isoformat(),
                        "type": "real_time_data",
                        "data": {
                            "active_users": 45 + (hash(str(datetime.now())) % 20),
                            "transactions": 12 + (hash(str(datetime.now())) % 8),
                            "revenue": round(1500 + (hash(str(datetime.now())) % 500), 2),
                            "cpu_usage": 30 + (hash(str(datetime.now())) % 40),
                            "memory_usage": 60 + (hash(str(datetime.now())) % 30)
                        }
                    }
                    
                    await self.send_json_message(data, websocket)
                    await asyncio.sleep(2)  # Send data every 2 seconds
                    
                except Exception as e:
                    logger.error(f"Error in data stream: {str(e)}")
                    break
        
        # Cancel existing streaming task if any
        if websocket in self.streaming_tasks:
            self.streaming_tasks[websocket].cancel()
        
        # Start new streaming task
        task = asyncio.create_task(stream_data())
        self.streaming_tasks[websocket] = task
        
        logger.info("Started real-time data streaming")
    
    async def stop_data_stream(self, websocket: WebSocket):
        """Stop streaming data to a WebSocket connection"""
        if websocket in self.streaming_tasks:
            self.streaming_tasks[websocket].cancel()
            del self.streaming_tasks[websocket]
            logger.info("Stopped real-time data streaming")
    
    async def send_query_result(self, websocket: WebSocket, result: Dict[Any, Any]):
        """Send query execution result to WebSocket"""
        message = {
            "type": "query_result",
            "timestamp": datetime.now().isoformat(),
            "result": result
        }
        await self.send_json_message(message, websocket)
    
    async def send_analytics_update(self, websocket: WebSocket, analytics: Dict[Any, Any]):
        """Send analytics update to WebSocket"""
        message = {
            "type": "analytics_update",
            "timestamp": datetime.now().isoformat(),
            "analytics": analytics
        }
        await self.send_json_message(message, websocket)
