from chatbot.app import create_app  # adjust according to how your app is created

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0" , port= 5000)
