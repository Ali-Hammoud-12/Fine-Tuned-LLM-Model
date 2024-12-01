import unittest
from unittest.mock import patch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.model.customgpt_model import CustomGPT_Model

class TestCustomGPT_Model(unittest.TestCase):
    def setUp(self):
        # Reset the singleton instance before each test
        CustomGPT_Model._instance = None
        self.model_manager = CustomGPT_Model.get_instance()

    @patch("app.config.initialize_fine_tuned_model")
    def test_initialize_model(self, mock_initialize_fine_tuned_model):
        """
        Test that the model is initialized correctly and returns the fine-tuned model.
        """
        mock_model_id = "fine-tuned-model-id"
        mock_initialize_fine_tuned_model.return_value = mock_model_id

        # Initialize the model
        self.model_manager.initialize_model(mock_initialize_fine_tuned_model)

        # Verify the model ID is returned correctly
        model_id = self.model_manager.get_model()
        self.assertEqual(model_id, mock_model_id)

    def test_get_model_without_initialization(self):
        """
        Test that accessing the model without initialization raises an exception.
        """
        # Reset the model to ensure no initialization
        CustomGPT_Model._fine_tuned_model = None
        with self.assertRaises(Exception) as context:
            self.model_manager.get_model()
        self.assertEqual(str(context.exception), "Model not initialized!")

    def test_singleton_behavior(self):
        """
        Test that the singleton behavior works as expected.
        """
        # Create two instances and assert they are the same (singleton)
        manager_1 = CustomGPT_Model.get_instance()
        manager_2 = CustomGPT_Model.get_instance()
        self.assertIs(manager_1, manager_2)

if __name__ == "__main__":
    unittest.main()
