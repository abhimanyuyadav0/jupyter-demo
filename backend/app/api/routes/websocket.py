"""
WebSocket routes for real-time features
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
import json
import logging
from datetime import datetime

from app.core.websocket_manager import WebSocketManager
from app.core.database import get_db_manager, DatabaseManager

logger = logging.getLogger(__name__)

router = APIRouter()

# WebSocket manager instance
websocket_manager = WebSocketManager()

@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    db_manager: DatabaseManager = Depends(get_db_manager)
):
    """
    Main WebSocket endpoint for real-time communication
    """
    await websocket_manager.connect(websocket)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                message_type = message.get("type")
                
                if message_type == "start_stream":
                    # Start real-time data streaming
                    await websocket_manager.start_data_stream(websocket)
                    await websocket_manager.send_json_message({
                        "type": "stream_started",
                        "message": "Real-time data streaming started"
                    }, websocket)
                
                elif message_type == "stop_stream":
                    # Stop real-time data streaming
                    await websocket_manager.stop_data_stream(websocket)
                    await websocket_manager.send_json_message({
                        "type": "stream_stopped", 
                        "message": "Real-time data streaming stopped"
                    }, websocket)
                
                elif message_type == "execute_query":
                    # Execute query and send results via WebSocket
                    query = message.get("query", "")
                    if query and db_manager.is_connected:
                        result = await db_manager.execute_query(query)
                        await websocket_manager.send_query_result(websocket, result)
                    else:
                        await websocket_manager.send_json_message({
                            "type": "error",
                            "message": "Database not connected or invalid query"
                        }, websocket)
                
                elif message_type == "ping":
                    # Respond to ping for connection health check
                    await websocket_manager.send_json_message({
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }, websocket)
                
                else:
                    # Echo unknown message types
                    await websocket_manager.send_json_message({
                        "type": "echo",
                        "original_message": message
                    }, websocket)
                    
            except json.JSONDecodeError:
                # Handle plain text messages
                await websocket_manager.send_personal_message(f"Echo: {data}", websocket)
                
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
        websocket_manager.disconnect(websocket)
