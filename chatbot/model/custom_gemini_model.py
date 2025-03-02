class CustomGemini_Model:
    """A singleton class to manage the fine-tuned Gemini model."""
    _instance = None
    _fine_tuned_model = None

    @staticmethod
    def get_instance():
        """
        Returns the singleton instance of CustomGemini_Model.
        If no instance exists, it initializes one.
        """
        if CustomGemini_Model._instance is None:
            CustomGemini_Model()
        return CustomGemini_Model._instance

    def __init__(self):
        """
        Initializes the singleton instance.
        Raises an exception if an instance already exists.
        """
        if CustomGemini_Model._instance is not None:
            raise Exception("This class is a singleton!")
        else:
            CustomGemini_Model._instance = self

    def initialize_model(self, model_initializer=None):
        """
        Initialize the fine-tuned Gemini model using the provided function.
        If the model is already initialized, it skips initialization.

        Args:
            model_initializer (callable): A function or callable object that initializes the model.

        Raises:
            ValueError: If no initializer is provided and the model is uninitialized.
        """
        if not self._fine_tuned_model:
            if model_initializer is None:
                raise ValueError("No model initializer provided!")
            self._fine_tuned_model = model_initializer()
            print(f"Fine-tuned Gemini model initialized: {self._fine_tuned_model}")

    def get_model(self):
        """
        Returns the fine-tuned Gemini model.
        Raises an exception if the model is not initialized.

        Returns:
            str: The fine-tuned Gemini model identifier.

        Raises:
            Exception: If the model is not initialized.
        """
        if not self._fine_tuned_model:
            raise Exception("Model not initialized!")
        return self._fine_tuned_model
