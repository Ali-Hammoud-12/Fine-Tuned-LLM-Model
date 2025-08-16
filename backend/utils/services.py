import os
import json
import google.generativeai as genai
from google.generativeai import types
from vertexai.generative_models import GenerativeModel
from vertexai.generative_models import Content, Part
import vertexai

def display_chatbot_execution_result(response):
    html_parts = []
    for part in response.candidates[0].content.parts:
        part_content = ""
        # Add text if present and non-empty.
        if part.text and part.text.strip():
            part_content += f"<p>{part.text.strip()}</p>"
        # Add executable code if present and non-empty.
        if part.executable_code and part.executable_code.code and part.executable_code.code.strip():
            part_content += f"<pre>{part.executable_code.code.strip()}</pre>"
        # Add code execution result if present and non-empty.
        if part.code_execution_result and part.code_execution_result.output and part.code_execution_result.output.strip():
            part_content += f"<pre>{part.code_execution_result.output.strip()}</pre>"
        # Add inline image if there is valid base64 data.
        if part.inline_data and part.inline_data.data:
            inline_data = part.inline_data.data
            if isinstance(inline_data, bytes):
                inline_data = inline_data.decode("utf-8")
            # Only add image if the data is not just empty or a placeholder.
            if inline_data.strip() and inline_data.strip() != "b''":
                part_content += f'<img src="data:image/png;base64,{inline_data.strip()}" alt="Image result"/>'
        # Only add the part if there's any content.
        if part_content:
            html_parts.append(part_content)
    # Join all parts with an <hr/> separator.
    return "<hr/>".join(html_parts)

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

def validate_response_scope(response_text, user_question):
    """
    Validates that the response is within the LIU training scope.
    Returns the original response if valid, or forces a fallback message if invalid.
    """
    # Keywords that indicate LIU-related content
    liu_keywords = ["liu", "lebanese international university", "campus", "registration", 
                   "tuition", "admission", "program", "course", "beirut", "bekaa", 
                   "saida", "nabatieh", "tripoli", "mount lebanon", "tyre", "rayak", "akkar"]
    
    # Check if the response already contains the fallback message
    fallback_indicators = ["have not been trained on this", "not about LIU", "only provide information about LIU"]
    
    response_lower = response_text.lower()
    user_question_lower = user_question.lower()
    
    # If response contains fallback indicators, it's already properly constrained
    if any(indicator in response_lower for indicator in fallback_indicators):
        return response_text
    
    # Check if the user question and response contain LIU-related content
    question_has_liu_content = any(keyword in user_question_lower for keyword in liu_keywords)
    response_has_liu_content = any(keyword in response_lower for keyword in liu_keywords)
    
    # If neither question nor response contain LIU content, force fallback
    if not question_has_liu_content and not response_has_liu_content:
        return "I apologize, but I have not been trained on this specific question. I can only provide information about LIU (Lebanese International University) based on my training data. Please ask me questions about LIU's programs, admissions, campus locations, registration dates, tuition, or other university-related topics."
    
    # If response seems too general or doesn't contain LIU content when it should
    if question_has_liu_content and not response_has_liu_content and len(response_text) < 50:
        return "I apologize, but I have not been trained on this specific question. I can only provide information about LIU (Lebanese International University) based on my training data. Please ask me questions about LIU's programs, admissions, campus locations, registration dates, tuition, or other university-related topics."
    
    return response_text

def generate_fine_tuned_chat_response(user_text, conversation_history):
    """
    Generates a chat response using the fine-tuned Gemini model deployed to Vertex AI.
    The model is constrained to only answer based on its LIU training data.
    """

    # Initialize Vertex AI
    vertexai.init(
        project="988399269486",
        location="us-central1"
    )

    # Initialize the GenerativeModel with the tuned model name
    model = GenerativeModel(
        model_name="projects/988399269486/locations/us-central1/endpoints/8693984675871326208",
        system_instruction="""You are an educational chatbot specifically trained on LIU (Lebanese International University) information. 

CRITICAL INSTRUCTIONS:
- You must ONLY answer questions using information from your LIU training dataset
- If a question is NOT about LIU or you don't have specific information in your training data to answer it, you MUST respond with: "I apologize, but I have not been trained on this specific question. I can only provide information about LIU (Lebanese International University) based on my training data. Please ask me questions about LIU's programs, admissions, campus locations, registration dates, tuition, or other university-related topics."
- Do NOT use general knowledge or make up information
- Do NOT answer questions about other universities, general topics, or anything outside your LIU training scope
- Be specific and accurate in your responses using only the information you were trained on
- Always identify yourself as a LIU educational chatbot"""
    )

    # Convert conversation history to a list of Content objects
    chat_history = [
        Content(role=msg["role"], parts=[Part.from_text(msg["content"])])
        for msg in conversation_history
    ]

    # Start a chat session with the formatted history
    chat = model.start_chat(history=chat_history)

    # Send the user's message and get the response
    response = chat.send_message(user_text)

    # Validate the response to ensure it's within LIU scope
    validated_response = validate_response_scope(response.text, user_text)

    # Append the assistant's response to the conversation history
    conversation_history.append({"role": "assistant", "content": validated_response})

    return f"<strong>Fine-Tuned LIU ChatBot:</strong><br/>{validated_response}"

generate_chat_response = generate_fine_tuned_chat_response