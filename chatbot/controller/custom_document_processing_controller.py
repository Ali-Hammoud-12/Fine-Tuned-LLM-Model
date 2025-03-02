from flask import Blueprint, Flask, request, jsonify, send_from_directory
from chatbot.utils.aws_services import upload_file_to_S3  # function from your services.py

tuning_bp = Blueprint('Custom_Document', __name__)

# Endpoint for directly uploading a file to S3.
@tuning_bp.route("/upload_direct", methods=["POST"])
def upload_direct():
    return upload_file_to_S3()
