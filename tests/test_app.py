import pytest
import os
import io
import json
import chatbot
import chatbot.app

# Retrieve the Gemini API key from environment variables.
gemini_api_key = os.getenv("GEMINI_API_KEY")
AWS_Access_Key = os.getenv("AWS_ACCESS_KEY")
AWS_Secret_Access_Key = os.getenv("AWS_SECRET_ACCESS_KEY")

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

def test_get_presigned_url(client, monkeypatch):
    """
    Tests the /get_presigned_url endpoint.

    The generate_presigned_url function is monkeypatched to return a fake presigned URL and key.
    """
    # Import the aws_services module as a whole.
    import chatbot.utils.aws_services as aws_services

    # Define a fake generate_presigned_url function that returns predictable values.
    def fake_generate_presigned_url(filename, filetype):
        return "https://fake-presigned-url", f"uploads/fake_{filename}"
    
    # Monkeypatch the generate_presigned_url function in the aws_services module.
    monkeypatch.setattr(aws_services, "generate_presigned_url", fake_generate_presigned_url)

    # Prepare the payload for the POST request.
    payload = {
        "filename": "test.txt",
        "content_type": "text/plain"
    }
    
    # Send a POST request to the /get_presigned_url endpoint.
    response = client.post(
        "/get_presigned_url",
        data=json.dumps(payload),
        content_type="application/json"
    )
    
    # Validate the response.
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    data = response.get_json()
    assert "url" in data, "Response missing 'url'"
    assert "s3_key" in data, "Response missing 's3_key'"
    assert data["url"] == "https://fake-presigned-url", "Unexpected presigned URL"
    assert data["s3_key"] == "uploads/fake_test.txt", "Unexpected S3 key"


def test_upload_direct_s3(client, monkeypatch):
    """
    Tests the /upload_direct_s3 endpoint.

    The s3_client.upload_fileobj function is monkeypatched to simulate a successful upload.
    """
    # Import the aws_services module as a whole.
    import chatbot.utils.aws_services as aws_services

    # Define a fake upload_fileobj function to simulate a successful file upload.
    def fake_upload_fileobj(Fileobj, Bucket, Key, ExtraArgs):
        # Do nothing; assume the upload is successful.
        return
    # Monkeypatch s3_client.upload_fileobj in the aws_services module.
    monkeypatch.setattr(aws_services.s3_client, "upload_fileobj", fake_upload_fileobj)

    # Create an in-memory file to simulate the file upload.
    dummy_file = (io.BytesIO(b"dummy file content"), "test_upload.txt")
    data = {"file": dummy_file}
    
    # Send a POST request to the /upload_direct_s3 endpoint.
    response = client.post(
        "/upload_direct_s3",
        data=data,
        content_type="multipart/form-data"
    )
    
    # Validate the response.
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
    resp_data = response.get_json()
    assert "message" in resp_data, "Response missing 'message'"
    assert "s3_key" in resp_data, "Response missing 's3_key'"
    assert resp_data["message"] == "File uploaded successfully", "Unexpected upload message"
