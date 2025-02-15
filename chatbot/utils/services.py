import json
from google import genai
from google.genai import types
import os

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

     
