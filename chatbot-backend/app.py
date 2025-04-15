from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Set OpenAI API key
openai.api_key = os.getenv("OPENAI_API_KEY")

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        print("Received data:", data)  # Debug print
        message = data.get('message', '')
        print("Extracted message:", message)  # Debug print
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400

        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant for a website chatbot."},
                {"role": "user", "content": message}
            ]
        )
        
        return jsonify({
            'response': response.choices[0].message.content
        })
        
    except Exception as e:
        print("Error:", str(e))  # Debug print
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
