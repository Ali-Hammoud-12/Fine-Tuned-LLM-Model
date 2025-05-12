import os
import google.generativeai as genai

def load_creds():
    """
    Configures the Gemini client using an API key instead of OAuth.
    Ensure the GEMINI_API_KEY environment variable is set.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY environment variable.")
    
    genai.configure(api_key=api_key)
