import json
from google import genai
from google.genai import types
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
        base_model='models/gemini-1.0-pro-001',
        training_dataset=training_dataset,
        config=types.CreateTuningJobConfig(
            epoch_count=5,
            batch_size=4,
            learning_rate=0.001,
            tuned_model_display_name="Fine Tuned LIU ChatBot Model"
        )
    )
    
    return tuning_job


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
    # sys_instruct="Return the answers to my question in plain text. The answers should have proper format and look nice (In plain text format)."
    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            # system_instruction=sys_instruct,
            max_output_tokens=500,
            temperature=0.5,
            response_mime_type="text/plain", # Ensures formatted output
        )
    )
    answer = display_chatbot_execution_result(response)
    conversation_history.append({"role": "assistant", "content": answer})
    formatted_response = f"**Gemini:**\n\n{answer}"  
    return formatted_response

def generate_fine_tuned_chat_response(user_text, conversation_history, tuning_job):
    """
    Generates a chat response using the fine-tuned Gemini model.

    Args:
        user_text (str): The text input from the user.
        conversation_history (list): The list of previous messages in the conversation.
        tuning_job (object): The tuning job containing the tuned model information.
    
    Returns:
        str: The formatted response from the fine-tuned Gemini model.
    """
    prompt = ""
    for message in conversation_history:
        if message.get("role") == "user":
            prompt += f"User: {message.get('content')}\n"
        elif message.get("role") == "assistant":
            prompt += f"Assistant: {message.get('content')}\n"
    prompt += f"User: {user_text}\nAssistant: "
    
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    
    # Generate content using the fine-tuned model from the tuning job
    response = client.models.generate_content(
        model=tuning_job.tuned_model.model,  # Use the fine-tuned model from the tuning job
        contents=prompt,
        config=types.GenerateContentConfig(
            max_output_tokens=500,
            temperature=0.5,
            response_mime_type="text/plain",  
        )
    )
    
    answer = display_chatbot_execution_result(response)

    # Append the assistant's answer to the conversation history
    conversation_history.append({"role": "assistant", "content": answer})
    
    # Format the response for display
    formatted_response = f"**Fine-Tuned LIU ChatBot:**\n\n{answer}"  
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

     
