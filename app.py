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
from flask_mail import Mail, Message
from datetime import datetime, timedelta
# from services.lead_extractor import lead_extractor

# Load environment variables
load_dotenv() #load environment variables from .env file

# Initialize Flask app
app = Flask(__name__) #instance of Flask
login.init_app(app) #initialize LoginManager with the Flask app
login.login_view = 'login' #set the login view to the login route
app.config.from_object(Config) #load configuration from the config.py file

db.init_app(app) #initialize the database with the Flask app
mail = Mail(app) #initialize Flask-Mail

migrate = Migrate(app, db) #instance of Migrate

# Initialize LeadExtractor - using the singleton instance directly
# lead_extractor is already initialized in the services/lead_extractor.py file

with app.app_context():
    db.create_all()
    admin.init_app(app )

# Configure CORS with environment variables (with fallbacks)
cors_origins = os.getenv('CORS_ORIGINS', '*').split(',')
cors_methods = os.getenv('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(',')
cors_headers = os.getenv('CORS_ALLOW_HEADERS', 'Content-Type,Authorization').split(',')
cors_credentials = os.getenv('CORS_SUPPORTS_CREDENTIALS', 'true').lower() == 'true'

# CORS(app, resources={
#     r"/*": {
#         "origins": cors_origins,
#         "methods": cors_methods,
#         "allow_headers": cors_headers,
#         "supports_credentials": cors_credentials
#     }
# })

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

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
    
    # Check if any admins exist - if not, show registration option
    no_admins_exist = User.query.filter_by(role='admin').first() is None
        
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
    
    return render_template('login.html', no_admins_exist=no_admins_exist)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out successfully')
    return redirect(url_for('login'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if request.method == 'POST':
        email = request.form.get('email')
        
        if not email:
            flash('Email address is required', 'error')
            return render_template('forgot_password.html')
        
        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Generate reset token
            token = user.generate_reset_token()
            
            # Create reset link
            reset_link = url_for('reset_password', token=token, _external=True)
            
            # Send email
            try:
                # Check if email is properly configured (not just placeholder values)
                mail_username = app.config.get('MAIL_USERNAME')
                mail_password = app.config.get('MAIL_PASSWORD')
                
                if not mail_username or not mail_password or 'your-email' in mail_username or 'your-app-password' in mail_password:
                    # Development mode - print link to console instead of sending email
                    print(f"\n" + "="*50)
                    print(f"📧 PASSWORD RESET EMAIL (DEV MODE)")
                    print(f"="*50)
                    print(f"To: {user.email}")
                    print(f"Subject: Password Reset Request")
                    print(f"Reset Link: {reset_link}")
                    print(f"Token expires in 1 hour")
                    print(f"="*50 + "\n")
                    print(f"🔧 To enable real email sending:")
                    print(f"   1. Update MAIL_USERNAME in .env with your real email")
                    print(f"   2. Update MAIL_PASSWORD in .env with your Gmail app password")
                    print(f"   3. Restart the Flask app")
                    print(f"="*50 + "\n")
                    
                    flash('Password reset link generated! Check the console output for the reset link (Development Mode).', 'success')
                    return redirect(url_for('login'))
                else:
                    # Production mode - send actual email
                    msg = Message(
                        subject='Password Reset Request - Admin Panel',
                        sender=app.config['MAIL_DEFAULT_SENDER'],
                        recipients=[user.email],
                        html=f'''
                        <h2>Password Reset Request</h2>
                        <p>Hello {user.username},</p>
                        <p>You have requested to reset your password for the Admin Panel.</p>
                        <p>Click the link below to reset your password:</p>
                        <p><a href="{reset_link}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you did not request this password reset, please ignore this email.</p>
                        <p>Best regards,<br>Admin Panel Team</p>
                        '''
                    )
                    mail.send(msg)
                    flash('Password reset email has been sent! Check your inbox.', 'success')
                    return redirect(url_for('login'))
            
            except Exception as e:
                print(f"Email sending error: {str(e)}")
                flash('Error sending email. Please try again later.', 'error')
        else:
            # Don't reveal whether email exists or not for security
            flash('If that email address is registered, you will receive a password reset email.', 'success')
            return redirect(url_for('login'))
    
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    # Find user with this token
    user = User.query.filter_by(reset_token=token).first()
    
    if not user or not user.verify_reset_token(token):
        flash('Invalid or expired reset link. Please request a new password reset.', 'error')
        return redirect(url_for('forgot_password'))
    
    if request.method == 'POST':
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        # Validation
        if not new_password or not confirm_password:
            flash('Both password fields are required', 'error')
            return render_template('reset_password.html')
        
        if new_password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('reset_password.html')
        
        if len(new_password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('reset_password.html')
        
        # Reset password
        user.reset_password(new_password)
        flash('Your password has been reset successfully! You can now log in with your new password.', 'success')
        return redirect(url_for('login'))
    
    return render_template('reset_password.html')

@app.route('/register-first-admin', methods=['GET', 'POST'])
def register_first_admin():
    """Allow registration of the first admin user when no admins exist"""
    
    # Check if any admin users already exist
    existing_admin = User.query.filter_by(role='admin').first()
    if existing_admin:
        flash('Admin registration is closed. Contact an existing administrator.', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validation
        if not username or not email or not password or not confirm_password:
            flash('All fields are required', 'error')
            return render_template('register_first_admin.html')
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return render_template('register_first_admin.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('register_first_admin.html')
        
        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            flash('Username or email already exists', 'error')
            return render_template('register_first_admin.html')
        
        # Create first admin user
        admin_user = User(
            username=username,
            email=email,
            role='admin'
        )
        admin_user.set_password(password)
        
        try:
            db.session.add(admin_user)
            db.session.commit()
            flash('First admin account created successfully! You can now log in.', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating admin account: {str(e)}', 'error')
            return render_template('register_first_admin.html')
    
    return render_template('register_first_admin.html')

@app.route('/create-admin-user', methods=['GET', 'POST'])
@login_required
def create_admin_user():
    # Only allow admin users to create new admin users
    if not current_user.is_authenticated:
        flash('Please log in to access this page')
        return redirect(url_for('login'))
        
    if current_user.role != 'admin':
        flash('You do not have permission to create admin users')
        return redirect(url_for('admin_panel'))
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        role = request.form.get('role')
        
        # Validation
        if not username or not email or not password or not confirm_password or not role:
            flash('All fields are required')
            return render_template('create_admin_user.html')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('create_admin_user.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long')
            return render_template('create_admin_user.html')
        
        # Check if username or email already exists
        existing_user = User.query.filter(
            (User.username == username) | (User.email == email)
        ).first()
        if existing_user:
            flash('Username or email already exists')
            return render_template('create_admin_user.html')
        
        # Create new user
        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash(f'New {role} user "{username}" created successfully!')
            return redirect(url_for('admin_panel'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error creating user: {str(e)}')
            return render_template('create_admin_user.html')
    
    return render_template('create_admin_user.html')

@app.route('/form', methods=['GET', 'POST', 'OPTIONS'])
def handle_form():
    # Handle preflight CORS requests
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200
    
    if request.method == 'GET':
        return jsonify({'message': 'Form endpoint is ready. Use POST to submit data.'}), 200
    
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
        
        # Extract data with validation
        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        phone = data.get('phone', '').strip()
        message = data.get('message', '').strip()
        
        # Basic validation
        if not name or not email or not phone:
            return jsonify({
                'success': False,
                'message': 'Name, email, and phone are required fields'
            }), 400
        
        # Create and save lead
        lead = Lead(
            name=name,
            email=email,
            phone=phone,
            message=message if message else None
        )
        
        db.session.add(lead)
        db.session.commit()
        
        print(f"New lead saved: {name} - {email} - {phone}")
        
        return jsonify({
            'success': True,
            'message': 'Form submitted successfully',
            'lead_id': lead.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error saving lead: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error saving data: {str(e)}'
        }), 500


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

    app.run(debug=False, port=5000)
