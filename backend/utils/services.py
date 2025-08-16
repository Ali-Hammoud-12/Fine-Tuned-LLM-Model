import os
import json
import re
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
    """
    Loads the training dataset from the JSONL file format used by the fine-tuned model.
    """
    file_path = os.path.join(os.path.dirname(__file__), "../data/training-dataset.jsonl")
    try:
        examples = []
        with open(file_path, 'r', encoding='utf-8') as file:
            for line_num, line in enumerate(file, 1):
                try:
                    # Parse each line as a JSON object
                    item = json.loads(line.strip())
                    
                    # Extract text_input and output from the JSONL format
                    # The JSONL format has contents array with user and model parts
                    if 'contents' in item and len(item['contents']) >= 2:
                        user_content = item['contents'][0]  # user role
                        model_content = item['contents'][1]  # model role
                        
                        if (user_content.get('role') == 'user' and 
                            model_content.get('role') == 'model' and
                            user_content.get('parts') and 
                            model_content.get('parts')):
                            
                            text_input = user_content['parts'][0].get('text', '')
                            output = model_content['parts'][0].get('text', '')
                            
                            if text_input and output:
                                examples.append(
                                    types.TuningExample(
                                        text_input=text_input,
                                        output=output,
                                    )
                                )
                            else:
                                print(f"Skipping line {line_num}: missing text content")
                        else:
                            print(f"Skipping line {line_num}: invalid role structure")
                    else:
                        print(f"Skipping line {line_num}: missing contents structure")
                        
                except json.JSONDecodeError as e:
                    print(f"JSON decode error on line {line_num}: {e}")
                    continue
                    
    except FileNotFoundError as e:
        print(f"Error: Training dataset file not found: {e}")
        return None
    except Exception as e:
        print(f"Error loading dataset: {e}")
        return None

    # Check if we have at least one example
    if not examples:
        raise ValueError("No valid training examples found in the dataset.")

    print(f"Successfully loaded {len(examples)} training examples")
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

def is_liu_related_question(user_text):
    """
    Pre-filters questions to determine if they are likely related to LIU.
    Returns True if the question appears to be about LIU, False otherwise.
    """
    user_text_lower = user_text.lower()
    
    # LIU-specific keywords and phrases (using word boundaries for exact matches)
    liu_keyword_patterns = [
        r'\bliu\b', r'\blebanese international university\b', r'\blebanese international\b',
        r'\badmission\b', r'\badmissions\b', r'\benroll\b', r'\benrollment\b', r'\bapply\b', r'\bapplication\b',
        r'\btuition\b', r'\bfees\b', r'\bfinancial aid\b', r'\bscholarships?\b', r'\bcredit\b', r'\bcredits\b',
        r'\bcampus\b', r'\bbeirut\b', r'\bbekaa\b', r'\bsaida\b', r'\bnabatieh\b', r'\btripoli\b', r'\bmount lebanon\b',
        r'\btyre\b', r'\brayak\b', r'\bakkar\b', r'\byemen\b', r'\bsenegal\b', r'\bmauritania\b',
        r'\bbusiness school\b', r'\bschool of business\b', r'\barts and sciences\b', r'\bengineering school\b',
        r'\bschool of engineering\b', r'\bpharmacy school\b', r'\bschool of pharmacy\b', r'\beducation school\b',
        r'\bmba\b', r'\bbachelor\b', r'\bmasters\b', r'\bdegree\b', r'\bprogram\b', r'\bmajor\b',
        r'\bregistration\b', r'\bsemester\b', r'\bgpa\b', r'\bgraduation\b', r'\bfreshman\b',
        r'\bdean\b', r'\bfaculty\b', r'\bprofessor\b', r'\bcourse\b', r'\bcurriculum\b'
    ]
    
    # Check if any LIU-related keywords are present
    for pattern in liu_keyword_patterns:
        if re.search(pattern, user_text_lower, re.IGNORECASE):
            return True
    
    # Check for obviously non-LIU questions that should be filtered out
    non_liu_patterns = [
        r'\b(weather|temperature|climate|rain|snow|sunny)\b',
        r'\b(news|current events|today\'s|latest|breaking)\b',
        r'\b(sports|football|basketball|soccer|tennis)\b',
        r'\b(politics|political|government|election)\b',
        r'\b(music|song|album|artist|concert)\b',
        r'\b(movies|film|cinema|actor|actress)\b',
        r'\b(food|recipe|cooking|restaurant|menu)\b',
        r'\b(programming|code|coding|software|python|java|javascript|html|css|tutorial)\b',
        r'\b(personal advice|life advice|relationship|dating)\b',
        r'\b(harvard|mit|stanford|oxford|cambridge|yale|princeton)\b',
        r'\b(joke|funny|entertainment|game|gaming)\b',
        r'\b(capital|country|city|geography|population)\b',
        r'\b(health|medical|doctor|medicine|treatment)\b',
        r'\b(travel|vacation|hotel|flight|tourism)\b',
        r'\b(help.*with.*(programming|coding|software))\b',
        r'\b(app development|web development|mobile development)\b'
    ]
    
    # If it contains obvious non-LIU patterns, filter it out
    for pattern in non_liu_patterns:
        if re.search(pattern, user_text_lower, re.IGNORECASE):
            return False
    
    # Educational terms that might be LIU-related (be more permissive)
    educational_patterns = [
        r'\b(university|college|education|academic|study|learning)\b',
        r'\b(student|teacher|instructor|class|lecture)\b',
        r'\b(exam|test|grade|assignment|homework)\b',
        r'\b(library|research|thesis|dissertation)\b'
    ]
    
    # If it contains educational terms, allow it through to be safe
    for pattern in educational_patterns:
        if re.search(pattern, user_text_lower, re.IGNORECASE):
            return True
    
    # For ambiguous questions, be conservative and filter them out
    # unless they contain obvious educational or LIU-related terms
    return False

def generate_fine_tuned_chat_response(user_text, conversation_history):
    """
    Generates a chat response using the fine-tuned Gemini model deployed to Vertex AI.
    Constrains responses to only LIU-related topics the model was trained on.
    """
    
    # Pre-filter: Check if question is likely about LIU
    if not is_liu_related_question(user_text):
        fallback_response = "I apologize, but I can only provide information about LIU (Lebanese International University). I have not been trained to answer questions outside of LIU-specific topics. Please ask me about LIU admissions, programs, campus life, or university policies."
        conversation_history.append({"role": "assistant", "content": fallback_response})
        return f"<strong>Fine-Tuned LIU ChatBot:</strong><br/>{fallback_response}"

    # Initialize Vertex AI
    vertexai.init(
        project="988399269486",
        location="us-central1"
    )

    # Initialize the GenerativeModel with the tuned model name
    model = GenerativeModel(
        model_name="projects/988399269486/locations/us-central1/endpoints/8693984675871326208"
    )

    # Define LIU-specific system instruction that constrains responses
    liu_system_instruction = """You are an educational chatbot specifically trained on LIU (Lebanese International University) information. 

IMPORTANT CONSTRAINTS:
- You can ONLY answer questions about LIU (Lebanese International University)
- Your knowledge is limited to: admissions, academic programs, campus information, tuition, financial aid, registration, faculty, graduation requirements, and university policies at LIU
- If a question is NOT about LIU or is outside your training scope, you MUST respond EXACTLY with: "I apologize, but I can only provide information about LIU (Lebanese International University). I have not been trained to answer questions outside of LIU-specific topics. Please ask me about LIU admissions, programs, campus life, or university policies."
- Do NOT attempt to answer questions about other universities, general topics, or anything unrelated to LIU
- Do NOT provide general knowledge or information not specifically related to LIU

Examples of questions you CAN answer:
- LIU admission requirements
- LIU academic programs and schools
- LIU campus locations
- LIU tuition and financial aid
- LIU registration dates
- LIU faculty information
- LIU graduation requirements

Examples of questions you CANNOT answer (use fallback response):
- Questions about other universities
- General academic advice not specific to LIU
- Personal advice
- Technical questions unrelated to LIU
- Current events
- General knowledge questions"""

    # Create system message with LIU constraints
    system_message = Content(role="system", parts=[Part.from_text(liu_system_instruction)])
    
    # Convert conversation history to a list of Content objects
    chat_history = [system_message]  # Start with system instruction
    
    # Add previous conversation history
    for msg in conversation_history:
        chat_history.append(
            Content(role=msg["role"], parts=[Part.from_text(msg["content"])])
        )

    # Start a chat session with the formatted history
    chat = model.start_chat(history=chat_history)

    # Send the user's message and get the response
    response = chat.send_message(user_text)

    # Append the assistant's response to the conversation history
    conversation_history.append({"role": "assistant", "content": response.text})

    return f"<strong>Fine-Tuned LIU ChatBot:</strong><br/>{response.text}"

generate_chat_response = generate_fine_tuned_chat_response