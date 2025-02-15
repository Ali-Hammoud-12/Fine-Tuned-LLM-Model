from flask import Blueprint, Response, jsonify, request
import os
from IPython.display import HTML, Markdown
from chatbot.utils.services import generate_chat_response
from chatbot.utils.services import load_training_data

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
            return response,200
        except Exception as e:
            print(f"Error: {e}")
            return f"Error: {e}", 500
    else:
        return "No message received from the user", 400
