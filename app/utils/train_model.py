import openai
from dotenv import load_dotenv
import os

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Path to the dataset
file_path = os.path.join(os.path.dirname(__file__), "../data/dataset.jsonl")

def train_module_with_dataset():
    try:
        with open(file_path, "rb") as file:
            file_upload_response = openai.files.create(
                file=file,
                purpose="fine-tune"
            )
        print(f"File uploaded successfully. File ID: {file_upload_response.id}")

        # Create fine-tuning job
        fine_tune_response = openai.fine_tuning.jobs.create(
            training_file=file_upload_response.id,
            model="gpt-3.5-turbo"
        )
        print("Fine-tuning job created successfully.")
        print(f"Job ID: {fine_tune_response.id}")
        return fine_tune_response.id
    except openai.error.OpenAIError as e:
        print(f"An error occurred: {e}")
    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
        
