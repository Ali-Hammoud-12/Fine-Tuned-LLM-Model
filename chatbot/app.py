from flask import Flask
from dotenv import load_dotenv
from chatbot.controller.home_controller import home_bp
from chatbot.controller.chat_controller import chat_bp
from chatbot.model.customgpt_model import CustomGPT_Model

def create_app():
    """
    Application factory for creating Flask app.
    """
    load_dotenv()
    app = Flask(__name__)
    
    # Initialize the Gemini model singleton (using our CustomGPT_Model as an interface)
    # gemini_model = CustomGPT_Model.get_instance()
    # gemini_model.initialize_model(initialize_fine_tuned_model)

    # Register blueprints
    app.register_blueprint(home_bp)
    app.register_blueprint(chat_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
