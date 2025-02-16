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

def test_tuning_job(client):
    """
    Tests the /tuning-job endpoint:
    - Ensures the fine-tuning job is successfully created.
    - Verifies that a valid response with a fine-tuned model identifier is returned.
    """
    response = client.post('/tuning-job')

    assert response.status_code == 200, f"Unexpected status code: {response.status_code}. Response: {response.data}"

    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "fine_tuned_model" in data, f"Response content missing: {data}"

    model_identifier = data["fine_tuned_model"]
    assert model_identifier, "Fine-tuned model identifier is empty"

    print("Tuning Job Response:", model_identifier)

def test_tuning_chat_without_job(client):
    """
    Tests the /tuning-chat endpoint before fine-tuning is created:
    - Ensures that an error is returned when the tuning job is not initialized.
    """
    response = client.post('/tuning-chat?msg=How are you?')

    assert response.status_code == 400, f"Unexpected status code: {response.status_code}. Response: {response.data}"

    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"
    assert "error" in data, "Error message missing in response"

    print("Tuning Chat Error Response:", data["error"])
