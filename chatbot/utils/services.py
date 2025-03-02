import json
import google.generativeai as genai
from google.generativeai import types
import os



def load_training_dataset():
    file_path = os.path.join(os.path.dirname(__file__), "../data/dataset.json")
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)  # load entire JSON array
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading dataset: {e}")
        return None

    # Build the list of examples from the JSON array
    examples = []
    for item in data:
        text_input = item.get("text_input")
        output = item.get("output")
        if text_input and output:
            examples.append(
                types.TuningExample(
                    text_input=text_input,
                    output=output,
                )
            )
        else:
            print(f"Skipping item due to missing keys: {item}")

    # Check if we have at least one example
    if not examples:
        raise ValueError("No valid training examples found in the dataset.")

    training_dataset = types.TuningDataset(examples=examples)
    return training_dataset


def create_finetuning_job():
    """
    Creates a fine-tuning job using the fine-tuning dataset.
    """
    # Load the training dataset
    training_dataset = load_training_dataset()

    # Get Gemini API from enviroment
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Create the fine-tuning job using the specified configuration
    tuning_job = client.tunings.tune(
        base_model='models/gemini-1.5-flash-001-tuning',
        training_dataset=training_dataset,
        config=types.CreateTuningJobConfig(
            epoch_count=1,
            batch_size=4,
            learning_rate=1,
            tuned_model_display_name="Fine Tuned LIU ChatBot Model"
        )
    )
    
    return tuning_job



def generate_fine_tuned_chat_response(user_text, conversation_history):
    """
    Generates a chat response using the fine-tuned Gemini model.

    Args:
        user_text (str): The text input from the user.
        conversation_history (list): The list of previous messages in the conversation.
    
    Returns:
        str: The formatted response from the fine-tuned Gemini model.
    """
    # Configure the API key
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    
    # Define generation configuration
    generation_config = {
        "temperature": 1,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 500,
        "response_mime_type": "text/plain",
    }
    
    # Create the fine-tuned model
    model = genai.GenerativeModel(
        model_name="tunedModels/fine-tuned-liu-chatbot-model-4gx0ihgpkto",
        generation_config=generation_config,
    )
    
    chat_history = []
    for message in conversation_history:
        role = message.get("role")
        # Convert "assistant" to "model" as expected by the API.
        if role == "assistant":
            role = "model"
        chat_history.append({
            "role": role,
            "parts": [message.get("content")]
        })
    
    # Start a chat session with the current conversation history.
    chat_session = model.start_chat(history=chat_history)
    
    # Send the new user message and get the response.
    response = chat_session.send_message(user_text)
    
    # Process the response (using a simple formatter here).
    answer = display_chatbot_execution_result(response)
    
    # Append the assistant's answer to the conversation history.
    conversation_history.append({"role": "assistant", "content": answer})
    
    # Format the final response for display.
    formatted_response = f"<strong>Fine-Tuned LIU ChatBot:</strong><br/>{answer}"   
    return formatted_response
    

def display_chatbot_execution_result(response):
    # Build an HTML string that will display the result
    html_output = ""
    for part in response.candidates[0].content.parts:
        if part.text is not None:
            html_output += f"<p>{part.text}</p>"
        if part.executable_code is not None:
            html_output += f"<pre>{part.executable_code.code}</pre>"
        if part.code_execution_result is not None:
            html_output += f"<pre>{part.code_execution_result.output}</pre>"
        if part.inline_data is not None:
            # Assuming inline_data.data is base64-encoded image data
            html_output += f'<img src="data:image/png;base64,{part.inline_data.data}" alt="Image result"/>'
        html_output += "<hr/>"
    return html_output

     
generate_chat_response = generate_fine_tuned_chat_response