from chatbot.app import create_app  # adjust according to how your app is created

if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0" , port= 5000)
