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
                password=generate_password_hash('admin1234'),
                role='admin'
            )
            db.session.add(admin_user)
            db.session.commit()
            print("Admin user created successfully.")
        else:
            print("Admin user already exists.")

if __name__ == '__main__':
    create_admin() 