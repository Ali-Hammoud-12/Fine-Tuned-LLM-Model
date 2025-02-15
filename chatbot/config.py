from chatbot.utils.train_model import train_module_with_dataset

def initialize_fine_tuned_model():
    """
    Initializes the fine-tuned model by training it if necessary.
    
    Returns:
        str: The model ID of the fine-tuned model.
    """
    fine_tuned_model = train_module_with_dataset()
    return fine_tuned_model

