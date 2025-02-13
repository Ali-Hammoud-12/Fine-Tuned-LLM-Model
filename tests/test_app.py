import pytest
import os
import app
import app.config

# Retrieve the Gemini API key from environment variables.
gemini_api_key = os.getenv("GEMINI_API_KEY")
assert gemini_api_key is not None, "Gemini API key is not set in environment variables!"

@pytest.fixture
def client():
    """
    Sets up a test client for the Flask application to simulate HTTP requests.

    Returns:
        client: A Flask test client instance.
    """
    with app.test_client() as client:
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
    # Send the message via the 'msg' query parameter.
    message = "what is the capital of Lebanon"
    response = client.post(f'/chat?msg={message}')

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"
    
    # Assuming the chat endpoint returns a JSON object with a key "response"
    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "response" in data, f"Response content missing: {response.data}"
