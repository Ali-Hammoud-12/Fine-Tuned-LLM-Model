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
    - Verifies that the correct response is returned based on the job state.
    """
    response = client.post('/tuning-job')

    # Accept both 200 and 202 status codes
    assert response.status_code in (200, 202), (
        f"Unexpected status code: {response.status_code}. Response: {response.data}"
    )

    data = response.get_json()
    assert data is not None, f"Response is not valid JSON: {response.data}"

    if response.status_code == 202:
        # When the job is queued, we expect a job_id and a message
        assert "job_id" in data, f"Response missing job_id: {data}"
        assert "message" in data, f"Response missing message: {data}"
        print("Tuning Job Queued Response:", data)
    else:
        # When the job is completed, expect a fine-tuned model identifier
        assert "fine_tuned_model" in data, f"Response content missing: {data}"
        model_identifier = data["fine_tuned_model"]
        assert model_identifier, "Fine-tuned model identifier is empty"
        print("Tuning Job Response:", model_identifier)
