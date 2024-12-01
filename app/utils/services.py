import json
import openai
import os
from app.model.customgpt_model import CustomGPT_Model

def load_training_data():
    """
    Loads the training data from a .jsonl file.
    
    Args:
        file_path (str): The path to the .jsonl file containing training data.
    
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
    Generates a chat response from the gpt-4o-mini model.

    Args:
        user_text (str): The text input from the user (Request body).
        conversation_history (list): The list of previous messages in the conversation.

    Returns:
        str: The response from the GPT model.
    """
    model_manager = CustomGPT_Model.get_instance()
    fine_tuned_model = model_manager.get_model()
    messages = conversation_history + [{"role": "user", "content": user_text}]
    response = openai.chat.completions.create(
        model=fine_tuned_model,
        # model="gpt-3.5-turbo",
        messages=messages,
        max_tokens=512,
        temperature=0.8,
    )
    answer = response.choices[0].message.content
    conversation_history.append({"role": "assistant", "content": answer})
    return answer