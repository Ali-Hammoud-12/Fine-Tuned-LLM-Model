from flask import Blueprint, jsonify
from chatbot.controller.tuning_job_controller import tuning_job_instance

model_status_bp = Blueprint('model_status', __name__)

@model_status_bp.route("/model-status")
def tuning_status():
    """
    Returns the status of the fine-tuning job.
    """
    if tuning_job_instance is None:
        return jsonify({"status": "No tuning job found.", "ready": False}), 200

    return jsonify({
        "job_id": getattr(tuning_job_instance, "name", None),
        "state": getattr(tuning_job_instance, "state", "UNKNOWN"),
        "ready": getattr(tuning_job_instance, "state", "") == "JOB_STATE_SUCCEEDED"
    })
