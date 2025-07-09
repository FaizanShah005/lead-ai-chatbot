from flask import Flask, request, jsonify, render_template, redirect, url_for, flash, session
from flask_cors import CORS
import os
from dotenv import load_dotenv
from services.chat import get_chatbot_response, chat_service
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

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'your_secret_key_here')
app.config.from_object(Config)

# Setup Flask Extensions
login.init_app(app)
login.login_view = 'login'
db.init_app(app)
migrate = Migrate(app, db)
mail = Mail(app)

with app.app_context():
    db.create_all()
    admin.init_app(app)

# Configure CORS
cors_origins = os.getenv('CORS_ORIGINS', '*').split(',')
cors_methods = os.getenv('CORS_METHODS', 'GET,POST,PUT,DELETE,OPTIONS').split(',')
cors_headers = os.getenv('CORS_ALLOW_HEADERS', 'Content-Type,Authorization').split(',')
cors_credentials = os.getenv('CORS_SUPPORTS_CREDENTIALS', 'true').lower() == 'true'

CORS(app, resources={
    r"/*": {
        "origins": cors_origins,
        "methods": cors_methods,
        "allow_headers": cors_headers,
        "supports_credentials": cors_credentials
    }
})

# Routes

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

    no_admins_exist = User.query.filter_by(role='admin').first() is None

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username=username).first()

        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('admin_panel'))

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

        user = User.query.filter_by(email=email).first()

        if user:
            token = user.generate_reset_token()
            reset_link = url_for('reset_password', token=token, _external=True)

            mail_username = app.config.get('MAIL_USERNAME')
            mail_password = app.config.get('MAIL_PASSWORD')

            if not mail_username or not mail_password or 'your-email' in mail_username or 'your-app-password' in mail_password:
                print(f"Password reset link: {reset_link}")
                flash('Check console for password reset link (Dev Mode)', 'success')
            else:
                msg = Message(
                    subject='Password Reset Request',
                    sender=app.config['MAIL_DEFAULT_SENDER'],
                    recipients=[user.email],
                    html=f'Click <a href="{reset_link}">here</a> to reset your password.'
                )
                mail.send(msg)
                flash('Password reset email sent!', 'success')

            return redirect(url_for('login'))

        flash('If that email exists, a reset link will be sent.', 'success')
        return redirect(url_for('login'))

    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    user = User.query.filter_by(reset_token=token).first()
    if not user or not user.verify_reset_token(token):
        flash('Invalid or expired reset link.', 'error')
        return redirect(url_for('forgot_password'))

    if request.method == 'POST':
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        if not new_password or new_password != confirm_password or len(new_password) < 6:
            flash('Invalid password reset attempt.', 'error')
            return render_template('reset_password.html')

        user.reset_password(new_password)
        flash('Password reset successful!', 'success')
        return redirect(url_for('login'))

    return render_template('reset_password.html')

@app.route('/register-first-admin', methods=['GET', 'POST'])
def register_first_admin():
    existing_admin = User.query.filter_by(role='admin').first()
    if existing_admin:
        flash('Admin registration is closed.', 'error')
        return redirect(url_for('login'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not all([username, email, password, confirm_password]) or password != confirm_password or len(password) < 6:
            flash('Invalid registration data.', 'error')
            return render_template('register_first_admin.html')

        if User.query.filter((User.username == username) | (User.email == email)).first():
            flash('Username or email already exists', 'error')
            return render_template('register_first_admin.html')

        admin_user = User(username=username, email=email, role='admin')
        admin_user.set_password(password)

        try:
            db.session.add(admin_user)
            db.session.commit()
            flash('Admin account created!', 'success')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error: {str(e)}', 'error')

    return render_template('register_first_admin.html')

@app.route('/create-admin-user', methods=['GET', 'POST'])
@login_required
def create_admin_user():
    if current_user.role != 'admin':
        flash('Permission denied')
        return redirect(url_for('admin_panel'))

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        role = request.form.get('role')

        if not all([username, email, password, confirm_password, role]) or password != confirm_password or len(password) < 6:
            flash('Invalid input')
            return render_template('create_admin_user.html')

        if User.query.filter((User.username == username) | (User.email == email)).first():
            flash('Username or email exists')
            return render_template('create_admin_user.html')

        new_user = User(username=username, email=email, role=role)
        new_user.set_password(password)

        try:
            db.session.add(new_user)
            db.session.commit()
            flash('User created successfully!')
            return redirect(url_for('admin_panel'))
        except Exception as e:
            db.session.rollback()
            flash(f'Error: {str(e)}')

    return render_template('create_admin_user.html')

@app.route('/form', methods=['GET', 'POST', 'OPTIONS'])
def handle_form():
    if request.method == 'OPTIONS':
        return jsonify({'message': 'OK'}), 200

    if request.method == 'GET':
        return jsonify({'message': 'Form endpoint is ready.'}), 200

    try:
        data = request.get_json() if request.is_json else request.form.to_dict()
        name, email, phone = data.get('name', '').strip(), data.get('email', '').strip(), data.get('phone', '').strip()
        message = data.get('message', '').strip()

        if not all([name, email, phone]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400

        lead = Lead(name=name, email=email, phone=phone, message=message or None)
        db.session.add(lead)
        db.session.commit()

        return jsonify({'success': True, 'message': 'Form submitted successfully', 'lead_id': lead.id}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

# Chat route
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

# Embedding route
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

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
