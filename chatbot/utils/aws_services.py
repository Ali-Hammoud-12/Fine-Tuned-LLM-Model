import os
import uuid
import boto3
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename

app = Flask(__name__)

# AWS Configuration using environment variables
S3_BUCKET = os.getenv("S3_BUCKET", "ali-lara-masterthesis-processing-bucket-12")
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
AWS_Access_Key = os.getenv("AWS_ACCESS_KEY")
AWS_Secret_Access_Key = os.getenv("AWS_SECRET_ACCESS_KEY")
INPUT_PREFIX = "uploads/"
OUTPUT_PREFIX = "processed/"

# Initialize the S3 client with the specified AWS credentials and region.
s3_client = boto3.client(
    "s3", 
    region_name=AWS_REGION, 
    aws_access_key_id=AWS_Access_Key, 
    aws_secret_access_key=AWS_Secret_Access_Key
)

def generate_presigned_url(filename, filetype):
    """
    Generates a presigned URL for a direct S3 upload.

    This function creates a unique filename by appending a UUID to the sanitized
    original filename and prefixes it with the INPUT_PREFIX. Then, it generates a 
    presigned URL for a PUT operation to upload the file to S3.

    Args:
        filename (str): The original name of the file.
        filetype (str): The MIME type of the file.

    Returns:
        tuple: A tuple containing the presigned URL (str) and the S3 key (str),
               or (None, None) if an error occurs.
    """
    # Create a unique and secure filename.
    unique_filename = f"{uuid.uuid4().hex}_{secure_filename(filename)}"
    # Construct the S3 key by prefixing the unique filename with the INPUT_PREFIX.
    s3_key = f"{INPUT_PREFIX}{unique_filename}"

    try:
        # Generate a presigned URL for the S3 PUT operation (expires in 300 seconds).
        presigned_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET, 
                "Key": s3_key, 
                "ContentType": filetype
            },
            ExpiresIn=300,
        )
        return presigned_url, s3_key
    except Exception as e:
        app.logger.error(f"Error generating presigned URL: {e}")
        return None, None

def upload_file_to_S3():
    """
    Uploads a file directly to S3 under the 'uploads/' prefix.

    This function extracts the file from the incoming Flask request, validates its presence,
    creates a unique filename, and uploads it to the S3 bucket using the S3 client.

    Returns:
        A Flask JSON response containing a success message and the S3 key if the upload succeeds,
        or an error message if the upload fails.
    """
    # Ensure a file is part of the request.
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    # Validate that a file was selected.
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    # Generate a unique, secure filename.
    unique_filename = f"{uuid.uuid4().hex}_{secure_filename(file.filename)}"
    # Construct the S3 key using the defined uploads prefix.
    s3_key = f"{INPUT_PREFIX}{unique_filename}"

    try:
        # Upload the file to S3 with the specified content type.
        s3_client.upload_fileobj(
            Fileobj=file,
            Bucket=S3_BUCKET,
            Key=s3_key,
            ExtraArgs={"ContentType": file.content_type},
        )
        return jsonify({"message": "File uploaded successfully", "s3_key": s3_key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
