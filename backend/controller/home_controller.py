import os
from flask import Blueprint, redirect

home_bp = Blueprint('home', __name__)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

@home_bp.route("/")
def index():
    """
    Redirects to the Next.js frontend home page.
    """
    return redirect(f"{FRONTEND_ORIGIN}/"), 200  # Adjust the URL if your frontend runs elsewhere
