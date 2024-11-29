import openai
from dotenv import load_dotenv
import os

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

file_path = os.path.join(os.path.dirname(__file__), "../data/dataset.jsonl")

with open(file_path, "rb") as file:
    file_upload_response = openai.files.create(
        file=file, 
        purpose='fine-tune'
    )
    
fine_tune_response = openai.fine_tuning.jobs.create(
    training_file=file_upload_response.id,
    model="gpt-3.5-turbo" 
)
