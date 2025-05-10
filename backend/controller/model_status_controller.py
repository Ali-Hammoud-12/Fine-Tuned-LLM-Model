from flask import Blueprint, jsonify
import backend.job_manager as job_manager  # Import the shared module

model_status_bp = Blueprint('model_status', __name__)

@model_status_bp.route("/model-status")
def tuning_status():
    """
    Returns the status of the fine-tuning job.
    """
    if job_manager.tuning_job_instance is None:
        print("No tuning job found.")
        return jsonify({"status": "No tuning job found.", "ready": False}), 200

    print(f"Tuning job status: {job_manager.tuning_job_instance.state}")
    return jsonify({
        "job_id": getattr(job_manager.tuning_job_instance, "name", None),
        "state": getattr(job_manager.tuning_job_instance, "state", "UNKNOWN"),
        "ready": getattr(job_manager.tuning_job_instance, "state", "") == "JOB_STATE_SUCCEEDED"
    })
