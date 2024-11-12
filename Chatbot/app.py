from flask import Flask, request, jsonify
import json
import random
import numpy as np
import openai
from sklearn.preprocessing import LabelEncoder
from nltk.stem import WordNetLemmatizer
import nltk
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
import pickle

# Initialize Flask app
app = Flask(__name__)

# Load trained model and other necessary resources
model = load_model('chatbot_model.h5') 
intents = json.loads(open('intents.json').read())  
words = pickle.load(open('words.pkl', 'rb')) 
classes = pickle.load(open('classes.pkl', 'rb'))  
lemmatizer = WordNetLemmatizer()

openai.api_key = 'YOUR_API_KEY'  # Replace with your OpenAI API key

def get_gpt_response(user_message):
    """Function to call GPT API and get a response."""
    try:
        response = openai.Completion.create(
            engine="gpt-3.5-turbo",  # or use "gpt-4" if available
            prompt=user_message,
            max_tokens=150,
            temperature=0.7
        )
        return response.choices[0].text.strip()
    except Exception as e:
        return f"Error occurred while fetching GPT response: {str(e)}"

def clean_up_sentence(sentence):
    """Function to preprocess the input sentence."""
    sentence_words = nltk.word_tokenize(sentence)
    sentence_words = [lemmatizer.lemmatize(w.lower()) for w in sentence_words]
    return sentence_words

def bow(sentence, words, show_details=True):
    """Function to convert the sentence into a bag of words vector."""
    sentence_words = clean_up_sentence(sentence)
    bag = [0] * len(words)
    
    for s in sentence_words:
        for i, word in enumerate(words):
            if word == s:
                bag[i] = 1
    return(np.array(bag))

def predict_class(sentence, model):
    """Function to predict the class label based on input sentence."""
    p = bow(sentence, words, show_details=False)
    res = model.predict(np.array([p]))[0]
    ERROR_THRESHOLD = 0.25
    results = [[i, r] for i, r in enumerate(res) if r > ERROR_THRESHOLD]
    

    results.sort(key=lambda x: x[1], reverse=True)
    
    return_list = []
    for r in results:
        return_list.append({"intent": classes[r[0]], "probability": str(r[1])})
    
    return return_list

def getResponse(ints, intents_json):
    """Function to get a response from predefined intents."""
    if not ints:
        return None
    
    tag = ints[0]['intent']
    list_of_intents = intents_json['intents']
    for i in list_of_intents:
        if i['tag'] == tag:
            result = random.choice(i['responses'])
            return result
    
    return None  

def chatbot_response(msg):
    """Function to get the chatbot response based on user message."""
    ints = predict_class(msg, model)
    
    if ints:
        res = getResponse(ints, intents)
        if res:
            return res
    return get_gpt_response(msg)

@app.route("/get")
def get_bot_response():
    """Route for getting the chatbot response."""
    userText = request.args.get('msg')
    response = chatbot_response(userText)
    return response

if __name__ == "__main__":
    app.run(debug=True)
