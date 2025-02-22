import sys
import threading
from flask import Flask, jsonify
from dotenv import load_dotenv

import google.generativeai as genai

from chatbot.utils.load_creds import load_creds

from chatbot.controller.home_controller import home_bp
from chatbot.controller.chat_controller import chat_bp
from chatbot.controller.tuning_job_controller import tuning_bp

from chatbot.controller.model_status_controller import model_status_bp

from chatbot.utils.services import create_finetuning_job
from chatbot.model.custom_gemini_model import CustomGemini_Model

def create_app():
    load_dotenv()
    creds = load_creds()
    genai.configure(credentials=creds)
    genai.configure(transport='grpc')
    
    app = Flask(__name__)

    # Initialize the model singleton
    # gemini_model = CustomGemini_Model.get_instance()
    # gemini_model.initialize_model(create_finetuning_job)  # or another initializer

    app.register_blueprint(home_bp)
    # app.register_blueprint(chat_bp)
    app.register_blueprint(tuning_bp)
    # app.register_blueprint(model_status_bp) 

    return app
