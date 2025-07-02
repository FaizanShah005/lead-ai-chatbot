from flask import Flask, jsonify
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'test-secret')

@app.route('/')
def home():
    return jsonify({
        'status': 'success',
        'message': 'Flask app is working!',
        'environment_check': {
            'DATABASE_URL': 'present' if os.getenv('DATABASE_URL') else 'missing',
            'SECRET_KEY': 'present' if os.getenv('SECRET_KEY') else 'missing',
            'OPENAI_API_KEY': 'present' if os.getenv('OPENAI_API_KEY') else 'missing'
        }
    })

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    print("🚀 Test Flask app starting...")
    app.run(debug=True, port=5000) 