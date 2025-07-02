import sys
import os

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app, db
from models import User
from werkzeug.security import generate_password_hash

def create_admin():
    """Create an admin user if it doesn't exist."""
    with app.app_context():
        admin_user = User.query.filter_by(username='adminuser').first()
        if not admin_user:
            admin_user = User(
                username='adminuser',
                email='admin@example.com',  # Default email - should be changed after creation
                password=generate_password_hash('admin1234', method='pbkdf2:sha256'),
                role='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Admin user created successfully.")
            print("Default credentials: username='adminuser', password='admin1234', email='admin@example.com'")
            print("IMPORTANT: Please change the password and email after first login!")
        else:
            print("Admin user already exists.")

if __name__ == '__main__':
    create_admin() 