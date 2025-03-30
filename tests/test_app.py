import pytest
import os
import io
import boto3
import chatbot
import chatbot.app

# Retrieve the Gemini API key from environment variables.
gemini_api_key = os.getenv("GEMINI_API_KEY")
AWS_REGION = os.getenv("AWS_REGION", "eu-west-3")
AWS_Access_Key = os.getenv("AWS_ACCESS_KEY")
AWS_Secret_Access_Key = os.getenv("AWS_SECRET_ACCESS_KEY")
S3_BUCKET_NAME = os.getenv("S3_BUCKET", "ali-lara-masterthesis-processing-bucket-12")

assert gemini_api_key is not None, "Gemini API key is not set in environment variables!"
assert AWS_Access_Key is not None and AWS_Secret_Access_Key is not None, "AWS access key and secret access key are not set in environment variables!"

@pytest.fixture
def client():
    """
    Sets up a test client for the Flask application to simulate HTTP requests.

    Returns:
        client: A Flask test client instance.
    """
    app_instance = chatbot.app.create_app()
    with app_instance.test_client() as client:
        yield client

def test_index(client):
    """
    Tests the index route of the application.

    Verifies the response returns an HTML page for index.html and the
    correct status code.
    """
    response = client.get('/')
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"
    assert b"<!DOCTYPE html>" in response.data, f"Response does not contain HTML: {response.data}"

def test_chat(client):
    """
    Tests the chat route for generating responses based on the query parameter.

    Verifies that the response is completed, contains a valid response body, and 
    returns the correct status code (200).
    """
    message = "what is the capital of Lebanon"
    response = client.post(f'/tuning-chat?msg={message}')
    
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"

    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "response" in data, f"Response content missing: {data}"

    response_text = data["response"]
    assert response_text, "Response body is empty"
    assert "Beirut" in response_text, f"Unexpected response content: {response_text}"

def test_upload_direct_s3(client):
    """
    Tests the /upload_direct_s3 endpoint by actually generating a presigned URL and
    performing an upload to S3. After uploading, the test retrieves the file from S3
    to confirm that the content matches.
    """
    # Create an in-memory file to simulate the file upload.
    dummy_file = (io.BytesIO(b"dummy file content"), "test_upload.txt")
    data = {"file": dummy_file}
    
    # Send a POST request to the /upload_direct_s3 endpoint.
    response = client.post(
        "/upload_direct_s3",
        data=data,
        content_type="multipart/form-data"
    )
    
    # Validate the response from the endpoint.
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    resp_data = response.get_json()
    assert "message" in resp_data, "Response missing 'message'"
    assert "s3_key" in resp_data, "Response missing 's3_key'"
    assert resp_data["message"] == "File uploaded successfully", "Unexpected upload message"
    
    # Now, use the boto3 client to verify that the file exists in S3 and has the expected content.
    s3 = boto3.client("s3")
    s3_key = resp_data["s3_key"]
    
    # Retrieve the object from S3.
    s3_object = s3.get_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
    file_content = s3_object["Body"].read()
    assert file_content == b"dummy file content", "Uploaded file content does not match"
