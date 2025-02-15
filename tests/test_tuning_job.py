import os
import json
import pytest
from tempfile import TemporaryDirectory

# Import the functions from your module.
from chatbot.utils.services import load_training_dataset, create_finetuning_job

# --- Dummy Classes to Simulate the Gemini API ---
class DummyTuningJob:
    # Simulate a tuned model attribute on the tuning job.
    tuned_model = type("DummyTunedModel", (), {"model": "dummy_model"})()

class DummyClient:
    def __init__(self, api_key):
        self.api_key = api_key
        self.tunings = self

    def tune(self, base_model, training_dataset, config):
        # Optionally, you can add assertions on parameters here.
        return DummyTuningJob()

# --- Pytest Fixtures ---
@pytest.fixture(autouse=True)
def set_api_key(monkeypatch):
    """
    Ensure the GEMINI_API_KEY environment variable is set for all tests.
    """
    monkeypatch.setenv("GEMINI_API_KEY", "dummy_api_key")

@pytest.fixture
def temp_dataset_file(tmp_path, monkeypatch):
    """
    Creates a temporary training dataset file and monkey-patches the file path in the module.
    """
    # Create dummy dataset data: two examples
    dataset_examples = [
        {"text_input": "Hello", "output": "Hi there!"},
        {"text_input": "How are you?", "output": "I'm good, thanks!"}
    ]
    # Prepare the file content as a JSONL (one JSON object per line)
    file_content = "\n".join(json.dumps(example) for example in dataset_examples)
    
    # Create a temporary directory and file
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    temp_file = data_dir / "dataset.json"
    temp_file.write_text(file_content, encoding="utf-8")

    # Monkey-patch os.path.join in the finetune module so that it returns our temporary file path.
    # This assumes that your module uses os.path.join(os.path.dirname(__file__), "../data/dataset.json")
    monkeypatch.setattr("finetune.os.path.join", lambda *args: str(temp_file))
    
    return temp_file

@pytest.fixture
def dummy_client(monkeypatch):
    """
    Monkey-patch the Gemini client in the finetune module to use our DummyClient.
    """
    monkeypatch.setattr("finetune.genai.Client", lambda api_key: DummyClient(api_key))

# --- Test Cases ---
def test_load_training_dataset(temp_dataset_file):
    """
    Test that the training dataset is loaded correctly from the temporary file.
    """
    training_dataset = load_training_dataset()
    
    # Check that two examples were loaded.
    assert len(training_dataset.examples) == 2, "Should load 2 examples"
    
    # Verify the content of the first example.
    first_example = training_dataset.examples[0]
    assert first_example.text_input == "Hello"
    assert first_example.output == "Hi there!"

def test_create_finetuning_job(temp_dataset_file, dummy_client):
    """
    Test that a fine-tuning job is created successfully using the dummy Gemini client.
    """
    tuning_job = create_finetuning_job()
    
    # Verify that the dummy tuning job is returned.
    assert tuning_job.tuned_model.model == "dummy_model", "Tuned model should be 'dummy_model'"
