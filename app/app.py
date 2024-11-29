from flask import Flask
import os
import openai
import config
from dotenv import load_dotenv
from controller.home_controller import home_bp
from controller.chat_controller import chat_bp

load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")
app = Flask(__name__)

app.register_blueprint(home_bp)
app.register_blueprint(chat_bp)

if __name__ == "__main__":
    """
    Starts the Flask application, making it accessible on all network interfaces
    on port 5000.
    """
    app.run(host='0.0.0.0', port=5000)
