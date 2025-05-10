import os
import sys
import threading
from flask import Flask, jsonify
from dotenv import load_dotenv
from flask_socketio import SocketIO
import google.generativeai as genai
from utils.load_creds import load_creds
from flask_cors import CORS

from controller.home_controller import home_bp
from controller.chat_controller import chat_bp
from controller.tuning_job_controller import tuning_bp
from controller.custom_document_processing_controller import Custom_document_tuning_bp
from controller.model_status_controller import model_status_bp

from utils.services import create_finetuning_job
from model.custom_gemini_model import CustomGemini_Model
from model.socketio_instance import socketio

def create_app():
    # Always load the default .env file first
    # This is important to ensure that the environment variables are loaded correctly
    load_dotenv(dotenv_path=".env", override=False)
    
    # Default: development
    env_mode = os.getenv("FLASK_ENV", "development").lower()
    
    if env_mode == "production":
        load_dotenv(dotenv_path=".env.production", override=True)
        print("✅ Running in PRODUCTION environment")
    elif env_mode == "development":
        load_dotenv(dotenv_path=".env.local", override=True)
        print("🔧 Running in DEVELOPMENT environment")
        
    
    app = Flask(__name__)
    
    frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
    # Enable CORS for all routes with proper configuration
    CORS(app, resources={
        "*": {
            "origins": [frontend_origin],
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