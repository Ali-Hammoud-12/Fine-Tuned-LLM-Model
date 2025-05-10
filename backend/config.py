from backend.utils.services import create_finetuning_job

def upload_data_and_get_fine_tuned_model():
    tuning_job_instance = create_finetuning_job()
    fine_tuned_model = tuning_job_instance.tuned_model.model
    return fine_tuned_model
