from flask import Blueprint, redirect

home_bp = Blueprint('home', __name__)

@home_bp.route("/")
def index():
    """
    Redirects to the Next.js frontend home page.
    """
    return redirect("http://localhost:3000/"), 302  # Adjust the URL if your frontend runs elsewhere
