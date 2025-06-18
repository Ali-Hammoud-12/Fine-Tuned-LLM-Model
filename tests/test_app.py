import pytest
import os
import io
import boto3
import backend
import backend.app
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Set Google credentials if loaded from string
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
AWS_Access_Key = os.getenv("AWS_ACCESS_KEY")
AWS_Secret_Access_Key = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET", "ali-lara-masterthesis-processing-bucket-12")

assert os.environ["GOOGLE_APPLICATION_CREDENTIALS"], "Google service account credential path not set!"
assert AWS_Access_Key and AWS_Secret_Access_Key, "AWS access keys are not set in environment variables!"

@pytest.fixture
def client():
    app_instance = backend.app.create_app()
    with app_instance.test_client() as client:
        yield client

def test_chat(client):
    """
    Tests /tuning-chat endpoint using Vertex AI.
    """
    message = "How does LIU ensure equal access to education?"
    response = client.post(f'/tuning-chat?msg={message}')

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"
    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "response" in data, f"Response content missing: {data}"

    response_text = data["response"].lower()
    assert response_text, "Response body is empty"
    
    # Accept multiple possible correct answers about equal access
    valid_keywords = [
    "financial aid",
    "support services",
    "discrimination",
    "equal access",
    "equal opportunity",
    "socioeconomic",
    "inclusion",
    "affirmative action",
    "regardless of sex",
    "educational opportunities"
    ]

    assert any(keyword in response_text for keyword in valid_keywords), \
        f"Response doesn't mention equal access concepts: {response_text}"
def test_upload_direct_s3(client):
    dummy_file = (io.BytesIO(b"dummy file content"), "test_upload.txt")
    data = {"file": dummy_file}

    response = client.post(
        "/upload_direct_s3",
        data=data,
        content_type="multipart/form-data"
    )

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    resp_data = response.get_json()
    assert "message" in resp_data, "Response missing 'message'"
    assert "s3_key" in resp_data, "Response missing 's3_key'"
    assert resp_data["message"] == "File uploaded successfully", "Unexpected upload message"

    s3 = boto3.client(
        "s3",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_Access_Key,
        aws_secret_access_key=AWS_Secret_Access_Key
    )
    s3_key = resp_data["s3_key"]

    try:
        s3_object = s3.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
        file_content = s3_object["Body"].read()
        assert file_content == b"dummy file content", "Uploaded file content does not match"

    finally:
        try:
            s3.delete_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            print(f"Successfully deleted test file: {s3_key}")
        except Exception as e:
            print(f"Warning: Failed to delete test file {s3_key}: {e}")
