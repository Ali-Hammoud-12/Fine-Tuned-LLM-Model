from flask import Blueprint, jsonify, request
import os
import openai
from openai import OpenAIError
from utils.services import generate_chat_response
from utils.services import load_training_data

chat_bp = Blueprint('chat', __name__)
openai.api_key = os.getenv("OPENAI_API_KEY")
conversation_history = load_training_data()

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
        except OpenAIError as e:
            return f"Error: {e}"
    else:
        return "Error: No message received from the user"
