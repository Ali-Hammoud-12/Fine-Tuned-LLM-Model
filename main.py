from chatbot.app import create_app

if __name__ == "__main__":
    print("🚀 Starting the Flask-SocketIO app...")
    app, socketio = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
