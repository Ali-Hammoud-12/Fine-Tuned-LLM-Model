from flask import Blueprint, request, jsonify
from chatbot.utils.aws_services import upload_file_to_S3, generate_presigned_url

Custom_document_tuning_bp = Blueprint('Custom_Document', __name__)

@Custom_document_tuning_bp.route("/upload_direct_s3", methods=["POST"])
def upload_direct_s3():
    """
    Endpoint to directly upload a file to S3.

    This endpoint receives a file from the client via a POST request and
    uploads it to the S3 bucket under the 'uploads/' prefix using the
    upload_file_to_S3 function.

    Returns:
        A JSON response containing a success message and the S3 key if successful,
        or an error message if the upload fails.
    """
    return upload_file_to_S3()

@Custom_document_tuning_bp.route("/get_presigned_url", methods=["POST"])
def get_presigned_url():
    """
    Endpoint to generate a presigned URL for S3 uploads.

    This endpoint expects a JSON payload with 'filename' and 'content_type'.
    It then uses the generate_presigned_url function to create a presigned URL
    for a PUT operation, allowing the client to upload the file directly to S3.

    Returns:
        A JSON response containing the presigned URL and the S3 key, or an error message.
    """
    data = request.get_json()
    if not data or "filename" not in data or "content_type" not in data:
        return jsonify({"error": "Missing filename or content type"}), 400

    filename = data["filename"]
    content_type = data["content_type"]

    presigned_url, s3_key = generate_presigned_url(filename, content_type)
    if not presigned_url:
        return jsonify({"error": "Could not generate presigned URL"}), 500

    return jsonify({"url": presigned_url, "s3_key": s3_key})
