from app import app, db
from models import User
import getpass

def create_admin():
    with app.app_context():
        print("\n=== User Creation / Password Reset Tool ===")

        # Get username
        username = input("Enter username: ").strip()
        if not username:
            print(" Username cannot be empty!")
            return

        # Check if user exists
        user = User.query.filter_by(username=username).first()

        if user:
            print(f" User '{username}' already exists.")
            choice = input("Do you want to reset the password? (y/n): ").lower()
            if choice != 'y':
                print(" Operation cancelled.")
                return
        else:
            print(f" Creating a new user: {username}")
            role = input("Enter role (admin/client/staff): ").strip().lower()
            if not role:
                print(" Role cannot be empty!")
                return
            user = User(username=username, role=role)

        # Get password
        password = getpass.getpass("Enter new password: ").strip()
        if not password:
            print(" Password cannot be empty!")
            return

        # Set or reset password
        user.set_password(password)

        # Add to session if it's a new user
        if user.id is None:
            db.session.add(user)

        try:
            db.session.commit()
            action = "updated" if user.id else "created"
            print(f" User '{username}' {action} successfully!")
        except Exception as e:
            print(f" Error saving user: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    try:
        create_admin()
    except KeyboardInterrupt:
        print("\n Operation cancelled by user.")
    except Exception as e:
        print(f" An error occurred: {str(e)}")
