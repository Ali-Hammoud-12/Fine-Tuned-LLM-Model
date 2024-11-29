import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../app/.env"))
openai.api_key = os.getenv("OPENAI_API_KEY")

# Check status of the fine-tuned model
fine_tuned_model_id = os.getenv("FINE_TUNED_MODEL_ID")

# If fine-tuned model ID is available
if fine_tuned_model_id:
    fine_tune_status = openai.fine_tuning.jobs.retrieve(fine_tuned_model_id)
    
    # Print out the fine-tuning job details using dot notation
    print(f"Fine-tuned model status: {fine_tune_status.status}")
    
    if fine_tune_status.status == 'failed':
        print(f"Error: {fine_tune_status.error or 'No specific error message available'}")
    elif fine_tune_status.status == 'succeeded':
        print(f"Model {fine_tuned_model_id} is ready to use.")
    else:
        print("Fine-tuning is still in progress.")
else:
    print("Fine-tuned model ID not found in .env.")

# To run the code run the following command: python -m tests.test-models