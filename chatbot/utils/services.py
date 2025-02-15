import json
from google import genai
import os
from chatbot.model.customgpt_model import CustomGPT_Model

def load_training_data():
    """
    Loads the training data from a .jsonl file.
    
    Returns:
        list: A list of message dictionaries representing the training data.
    """
    conversation_history = []
    file_path = os.path.join(os.path.dirname(__file__), "../data/dataset.jsonl")
    try:
        with open(file_path, 'r') as file:
            for line in file:
                message = json.loads(line)
                conversation_history.append(message)
    except FileNotFoundError:
        print(f"Error: The file at {file_path} was not found.")
    except json.JSONDecodeError:
        print(f"Error: The file at {file_path} contains invalid JSON.")
        
    return conversation_history

def generate_chat_response(user_text, conversation_history):
    """
    Generates a chat response using the Gemini API.

    Args:
        user_text (str): The text input from the user.
        conversation_history (list): The list of previous messages in the conversation.

    Returns:
        str: The response from the Gemini model.
    """
    # Use the fine tunned model later
    # model_manager = CustomGPT_Model.get_instance()
    # fine_tuned_model = model_manager.get_model()  # e.g., "gemini-2.0-flash"

    # Construct a single prompt from conversation history
    prompt = ""
    for message in conversation_history:
        if message.get("role") == "user":
            prompt += f"User: {message.get('content')}\n"
        elif message.get("role") == "assistant":
            prompt += f"Assistant: {message.get('content')}\n"
    prompt += f"User: {user_text}\nAssistant: "

    # Initialize the Gemini client using your API key from environment variables
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        max_tokens=512,
        temperature=0.8,
    )

    answer = response.text
    conversation_history.append({"role": "assistant", "content": answer})
    return answer
