import os
import uuid
import boto3
from flask import Flask, request, jsonify

app = Flask(__name__)

# AWS Config
S3_BUCKET = os.getenv("S3_BUCKET", "ali-lara-masterthesis-processing-bucket-12")
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
INPUT_PREFIX = "uploads/"
OUTPUT_PREFIX = "processed/"

s3_client = boto3.client("s3", region_name=AWS_REGION)

def generate_presigned_url(filename, filetype):
    """Generates a presigned URL for direct S3 upload"""
    s3_key = f"{INPUT_PREFIX}{uuid.uuid4()}_{filename}"
    
    presigned_url = s3_client.generate_presigned_url(
        "put_object",
        Params={"Bucket": S3_BUCKET, "Key": s3_key, "ContentType": filetype},
        ExpiresIn=60,
    )
    return presigned_url, s3_key

def upload_file_to_S3():
    """ Directly uploads the file to S3 under the 'uploads/' prefix """
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    s3_key = f"{INPUT_PREFIX}{uuid.uuid4()}_{file.filename}"

    try:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=s3_key,
            Body=file,
            ContentType=file.content_type
        )
        return jsonify({"message": "File uploaded directly to S3", "s3_key": s3_key})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
