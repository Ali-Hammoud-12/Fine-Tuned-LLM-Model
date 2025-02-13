from flask import Blueprint, jsonify, request
import os
from app.utils.services import generate_chat_response
from app.utils.services import load_training_data

chat_bp = Blueprint('chat', __name__)
# Optionally, you could load historical conversation data:
# conversation_history = load_training_data()
conversation_history = []

@chat_bp.route("/chat", methods=["POST"])
def chat():
    userText = request.args.get('msg')
    """
    Handles chat requests, validates the input message, and generates a chat response using Gemini API.

    Returns:
        Response: A JSON response containing the generated chat response or an error message.
    """
    if userText:
        try:
            response = generate_chat_response(userText, conversation_history)
            return str(response), 200
        except Exception as e:
            return f"Error: {e}", 500
    else:
        return "Error: No message received from the user", 400
