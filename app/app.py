from flask import Flask
from dotenv import load_dotenv
from app.config import initialize_fine_tuned_model
from app.controller.home_controller import home_bp
from app.controller.chat_controller import chat_bp
from app.model.customgpt_model import CustomGPT_Model

def create_app():
    """
    Application factory for creating Flask app.
    """
    load_dotenv()
    app = Flask(__name__)
    
    # Initialize CustomGPT_Model singleton
    CustomGPT_Models = CustomGPT_Model.get_instance()
    CustomGPT_Models.initialize_model(initialize_fine_tuned_model)

    # Register blueprints
    app.register_blueprint(home_bp)
    app.register_blueprint(chat_bp)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
