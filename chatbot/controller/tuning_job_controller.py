from flask import Blueprint, jsonify, request
from chatbot.utils.services import create_finetuning_job, generate_fine_tuned_chat_response
import chatbot.job_manager as job_manager  # Import the shared module

tuning_bp = Blueprint('tuning', __name__)
# Initialize conversation history for the fine-tuned chat
conversation_history = []

@tuning_bp.route("/tuning-job", methods=["POST"])
def tuning_job():
    """
    Handles fine-tuning job creation.
    """
    try:
        # Check if a tuning job already exists using the shared variable
        if job_manager.tuning_job_instance is not None:
            print("Tuning job already exists:", job_manager.tuning_job_instance)
            return jsonify({
                "job_id": job_manager.tuning_job_instance.name,
                "state": job_manager.tuning_job_instance.state,
                "message": "Tuning job already in progress or completed."
            }), 200

        # Create a new fine-tuning job
        job_manager.tuning_job_instance = create_finetuning_job()
        print("Created tuning job instance:", job_manager.tuning_job_instance)

        # Monitor and log the job state
        if job_manager.tuning_job_instance.state == "JOB_STATE_QUEUED":
            print("Tuning job is still in queue. Waiting for completion...")
            return jsonify({
                "message": "Tuning job is in queue. Please check again later.",
                "job_id": job_manager.tuning_job_instance.name
            }), 202  # HTTP 202 - Accepted (not ready yet)

        if not job_manager.tuning_job_instance.tuned_model:
            raise ValueError("Tuning job completed, but no tuned model was returned.")

        return jsonify({"fine_tuned_model": job_manager.tuning_job_instance.tuned_model.model})

    except Exception as e:
        print(f"Error creating tuning job: {e}")
        return jsonify({"error": str(e)}), 500

@tuning_bp.route("/tuning-chat", methods=["POST"])
def tuning_chat():
    """
    Handles fine-tuned chat requests using the previously created tuning job.
    """
    userText = request.args.get('msg')
    print("Received userText:", userText)
    print("Tuning job instance:", job_manager.tuning_job_instance)
    if userText:
        try:
            if job_manager.tuning_job_instance is None:
                return jsonify({"error": "Tuning job not created. Please create a tuning job first."}), 400
            response = generate_fine_tuned_chat_response(userText, conversation_history, job_manager.tuning_job_instance)
            return jsonify({"response": response})
        except Exception as e:
            print(f"Error generating fine-tuned chat response: {e}")
            return jsonify({"error": str(e)}), 500
    else:
        return jsonify({"error": "No message received"}), 400
