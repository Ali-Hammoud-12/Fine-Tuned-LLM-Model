from flask import Blueprint, jsonify, render_template, request

home_bp = Blueprint('home', __name__)

@home_bp.route("/")
def index():
    """
    Handles the root route of the application, validates the API key,
    and returns "Hello World!".

    Args:
        None

    Returns:
        Response: A JSON response with a greeting message or an error message.
    """
    return render_template("index.html"),200
