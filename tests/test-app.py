import openai
import pytest
import os
from app import app
from app import config

openai.api_key = os.getenv("OPENAI_API_KEY")

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
    Tests the chat route for generating responses based on Request Body.

    Verifies that the response is completed, contains a valid response body, and 
    returns the correct status code (200).
    """
    api_key = openai.api_key
    assert api_key is not None, "API key is not set in the environment variables!"
    headers = {"x-api-key": api_key}
    json_data = {"content": "what is the capital of Lebanon"}
    response = client.post('/chat', json=json_data, headers=headers)

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"
    assert b"response" in response.data, f"Response content missing: {response.data}"
