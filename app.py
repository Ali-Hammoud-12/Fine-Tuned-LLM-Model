from flask import Flask, render_template, request
import openai 
import config


# __name__ is a special variable that is automatically set by Python.

'''
Its value depends on how the script is being run: 
If the script is run directly (e.g., python script.py):
__name__ will be set to "__main__".
If the script is imported as a module in another script (e.g., import script):
__name__ will be set to the name of the script (e.g., "script").

'''
openai.api_key = config.API_KEY

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/get")
def get_chatbot_response():
    userText = request.args.get('msg')  # Get the user's input from the query parameter
    if userText:
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4o-mini",  
                messages=[{"role": "user", "content": f"{userText}" }],
                max_tokens=512,
                n=1,
                stop=None,
                temperature=0.8,
            )
            answer = response['choices'][0]['message']['content']
            return str(answer)
        except openai.error.OpenAIError as e:
            return f"Error: {e}"
    else:
        return "Error: No message received from the user"


if __name__ == "__main__":
    app.run(debug=True)  

    
    