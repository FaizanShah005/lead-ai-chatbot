from flask import Flask, request, jsonify, session
from flask_cors import CORS
import os
from dotenv import load_dotenv
from services.chat import get_chatbot_response, chat_service

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your_secret_key_here')
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = False

# Enable CORS for frontend
CORS(app, resources={r"/*": {"origins": ["http://localhost:5173", "http://localhost:5174"]}}, supports_credentials=True)

@app.route('/chat', methods=['POST'])
def chat():
    print("Received /chat request")  # Log when endpoint is hit
    try:
        data = request.get_json()
        user_message = data.get('message')
        chat_history = data.get('chat_history', [])

        print(f"User message: {user_message}")  # Log the incoming message
        print(f"Chat history: {chat_history}")

        if not user_message:
            return jsonify({'type': 'error', 'message': 'No message provided'}), 400

        print("Calling get_chatbot_response...")  # Log before calling backend logic
        response = get_chatbot_response(user_message, chat_history)
        print(f"Chatbot response: {response}")  # Log the response from backend logic
        return jsonify(response)
    except Exception as e:
        print(f"Error in /chat endpoint: {e}")
        return jsonify({'type': 'error', 'message': str(e)}), 500



@app.route('/start-embedding', methods=['POST'])
def start_embedding():
    data = request.get_json()
    url = data.get('url')
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    try:
        chat_service._crawl_embed_and_save_playwright_from_url(url)
        return jsonify({'message': 'Embedding process started successfully!'})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)




