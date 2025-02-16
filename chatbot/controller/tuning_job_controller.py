from flask import Blueprint, jsonify, request
from chatbot.utils.services import create_finetuning_job, generate_fine_tuned_chat_response

tuning_bp = Blueprint('tuning', __name__)
# Initialize conversation history for the fine-tuned chat
conversation_history = []
# Global variable to store the tuning job instance once created
tuning_job_instance = None

@tuning_bp.route("/tuning-job", methods=["POST"])
def tuning_job():
    """
    Handles fine-tuning job creation.
    """
    try:
        global tuning_job_instance
        # Step 1 & 2: Create the fine-tuning job
        tuning_job_instance = create_finetuning_job()

        # Debug: Print the returned job instance
        print("Tuning job instance:", tuning_job_instance)

        # Check if job is still in queue
        if tuning_job_instance.state == "JOB_STATE_QUEUED":
            print("Tuning job is still in queue. Waiting for completion...")
            return jsonify({
                "message": "Tuning job is in queue. Please check again later.",
                "job_id": tuning_job_instance.name
            }), 202  # HTTP 202 - Accepted (not ready yet)

        # Ensure the model is available
        if not tuning_job_instance.tuned_model:
            raise ValueError("Tuning job completed, but no tuned model was returned.")

        return jsonify({"fine_tuned_model": tuning_job_instance.tuned_model.model})

    except Exception as e:
        print(f"Error creating tuning job: {e}")
        return jsonify({"error": str(e)}), 500
    
@tuning_bp.route("/tuning-chat", methods=["POST"])
def tuning_chat():
    """
    Handles fine-tuned chat requests using the previously created tuning job:
    
    1. Uses the stored fine-tuning job.
    2. Generates a fine-tuned chat response based on the user's input.
    
    Returns:
        JSON response with the generated answer or an error message.
    """
    userText = request.args.get('msg')
    print("Received userText:", userText)
    print("Tuning job instance:", tuning_job_instance)
    if userText:
        try:
            if tuning_job_instance is None:
                return jsonify({"error": "Tuning job not created. Please create a tuning job first."}), 400
            # Step 3: Generate a chat response using the fine-tuned model
            response = generate_fine_tuned_chat_response(userText, conversation_history, tuning_job_instance)
            return jsonify({"response": response})
        except Exception as e:
            print(f"Error generating fine-tuned chat response: {e}")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "No message received"}), 400
