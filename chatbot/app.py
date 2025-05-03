import sys
import threading
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_socketio import SocketIO
import google.generativeai as genai
from chatbot.utils.load_creds import load_creds
from flask_cors import CORS

from chatbot.controller.home_controller import home_bp
from chatbot.controller.chat_controller import chat_bp
from chatbot.controller.tuning_job_controller import tuning_bp
from chatbot.controller.custom_document_processing_controller import Custom_document_tuning_bp
from chatbot.controller.model_status_controller import model_status_bp

from chatbot.utils.services import create_finetuning_job
from chatbot.model.custom_gemini_model import CustomGemini_Model
from chatbot.model.socketio_instance import socketio

def create_app():
    load_dotenv()
    app = Flask(__name__)
    
    # Enable CORS for all routes with proper configuration
    CORS(app, resources={
        "*": {
            "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    creds = load_creds()
    genai.configure(credentials=creds)
    genai.configure(transport='grpc')
    
    socketio.init_app(app, cors_allowed_origins="*")
    
    # Initialize the model singleton
    # gemini_model = CustomGemini_Model.get_instance()
    # gemini_model.initialize_model(create_finetuning_job)  # or another initializer
    
    app.register_blueprint(home_bp)
    # app.register_blueprint(chat_bp)
    app.register_blueprint(tuning_bp)
    app.register_blueprint(Custom_document_tuning_bp)
    # app.register_blueprint(model_status_bp)
    
    return app