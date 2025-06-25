from flask import Flask, request, jsonify, render_template, redirect, url_for, flash
from flask_cors import CORS
import os
from dotenv import load_dotenv
from services.chat import get_chatbot_response
import tempfile
import openai
from werkzeug.utils import secure_filename
from flask_sqlalchemy import SQLAlchemy
from config import Config
from models import Lead, db, login, User
from admin import admin
from flask_migrate import Migrate
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
# from services.lead_extractor import lead_extractor

# Load environment variables
load_dotenv() #load environment variables from .env file

# Initialize Flask app
app = Flask(__name__) #instance of Flask
login.init_app(app) #initialize LoginManager with the Flask app
login.login_view = 'login' #set the login view to the login route
app.config.from_object(Config) #load configuration from the config.py file

db.init_app(app) #initialize the database with the Flask app

migrate = Migrate(app, db) #instance of Migrate

# Initialize LeadExtractor - using the singleton instance directly
# lead_extractor is already initialized in the services/lead_extractor.py file

with app.app_context():
    db.create_all()
    admin.init_app(app )

# Configure CORS with specific settings
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

@app.route('/')
def index():
    return redirect(url_for('login'))

@app.route('/contact')
def contact():
    return render_template('index.html')

@app.route('/admin')
@login_required
def admin_panel():
    if not current_user.is_authenticated or current_user.role not in ['admin', 'client']:
        flash('You do not have permission to access this page')
        return redirect(url_for('login'))
    return redirect('/admin/')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('admin_panel'))
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        print(f"Attempting login for user: {username}")  # Debug log

        user = User.query.filter_by(username=username).first()
        
        if user:
            print(f"User found: {user.username}, Role: {user.role}")  # Debug log
            if check_password_hash(user.password, password):
                login_user(user)
                print("Login successful")  # Debug log
                return redirect(url_for('admin_panel'))
            else:
                print("Invalid password")  # Debug log
        else:
            print("User not found")  # Debug log
            
        flash('Invalid username or password')
        return redirect(url_for('login'))
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out')
    return redirect(url_for('login'))


@app.route('/form', methods=['POST'])
def handle_form():
    data = request.get_json()
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    address = data.get('address')
    message = data.get('message')

    # Save to DB logic here...
    leads = Lead(name=name, email=email, phone=phone, address=address, message=message)
    db.session.add(leads)
    db.session.commit()
    print(leads)
    return jsonify({'message': 'Form submitted successfully'}), 200


# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')



@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        user_message = data.get('message')

        if not user_message:
            return jsonify({'type': 'error', 'message': 'No message provided'}), 400

        response = get_chatbot_response(user_message)
        return jsonify(response)
    except Exception as e:
        return jsonify({'type': 'error', 'message': str(e)}), 500

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():

    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    temp_audio_path = None
    try:
        audio_file = request.files['audio']
        if not audio_file:
            return jsonify({'error': 'No audio file provided'}), 400

        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_audio_path = temp_audio.name
            audio_file.save(temp_audio_path)
        
        # Transcribe the audio using Whisper
        with open(temp_audio_path, 'rb') as audio:
            response =  openai.audio.transcriptions.create(
                model="whisper-1",
                file=audio,
                language="en"
            )
        
        return jsonify({'text': response.text})
            
    except Exception as e:
        print(f"Error in transcription: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the temporary file
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.unlink(temp_audio_path)
            except Exception as e:
                print(f"Error deleting temporary file: {str(e)}")

# @app.route('/generate-leads', methods=['POST'])
# def generate_leads():
#     data = request.json
#     url = data.get('url')
#     if not url:
#         return jsonify({"success": False, "error": "URL missing"}), 400

#     result = lead_extractor.extract_from_url(url)
#     return jsonify(result)



@app.route('/get-top-leads', methods=['GET'])
def get_top_leads():
    try:
        leads = Lead.query.order_by(Lead.id.desc()).limit(5).all()
        results = [{
            "name": lead.name,
            "email": lead.email,
            "phone": lead.phone,
            "address": lead.address,
            "message": lead.message,
            "created_at": lead.created_at.isoformat() if lead.created_at else None
        } for lead in leads]

        return jsonify({
            "success": True,
            "leads": results
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        })

if __name__ == '__main__':

    app.run(debug=True, port=5000)
