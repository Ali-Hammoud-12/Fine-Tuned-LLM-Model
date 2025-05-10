from backend.app import create_app
from backend.model.socketio_instance import socketio

if __name__ == "__main__":
    print("🚀 Starting the Flask-SocketIO app...")
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
