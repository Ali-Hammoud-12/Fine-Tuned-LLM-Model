from flask import Blueprint, jsonify, request
import openai
from utils.services import generate_chat_response

chat_bp = Blueprint('chat', __name__)
conversation_history = []

@chat_bp.route("/chat", methods=["POST"])
def chat():
    userText = request.args.get('msg')
    """
    Handles chat requests, validates the API key, and generates a chat response.

    Args:
        None

    Returns:
        Response: A JSON response containing the generated chat response.
    """
    if userText:
        try:
            response = generate_chat_response(userText, conversation_history)
            return str(response), 200
        except openai.error.OpenAIError as e:
            return f"Error: {e}"
    else:
        return "Error: No message received from the user"
