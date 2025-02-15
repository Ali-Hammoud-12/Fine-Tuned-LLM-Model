import pytest
import os
import chatbot
import chatbot.app

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
    response = client.post(f'/chat?msg={message}')
    
    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"

    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "response" in data, f"Response content missing: {data}"

    response_text = data["response"]
    assert response_text, "Response body is empty"
    assert "Beirut" in response_text, f"Unexpected response content: {response_text}"

