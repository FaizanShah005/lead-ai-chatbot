from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView 
from flask_login import UserMixin, LoginManager, current_user
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy() #instance of SQLAlchemy
login = LoginManager() #instance of LoginManager
admin = Admin() #instance of Admin


class Lead(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(50), nullable=False)  # 'admin' or 'client'

    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password)

@login.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# Restrict admin view to logged-in admin/client only
class MyModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated and current_user.role in ['admin', 'client']

    def inaccessible_callback(self, name, **kwargs):
        from flask import redirect, url_for, flash
        flash('You do not have permission to access this page')
        return redirect(url_for('login'))

    def _handle_view(self, name, **kwargs):
        if not self.is_accessible():
            return self.inaccessible_callback(name, **kwargs)

# Create admin views with proper access control
class LeadModelView(MyModelView):
    column_list = ['name', 'email', 'phone', 'created_at']
    column_searchable_list = ['name', 'email', 'phone']
    column_filters = ['created_at']
    can_create = True
    can_edit = True
    can_delete = True

class UserModelView(MyModelView):
    column_list = ['username', 'role']
    column_searchable_list = ['username']
    can_create = True
    can_edit = True
    can_delete = True

# Add views to admin
admin.add_view(LeadModelView(Lead, db.session))
admin.add_view(UserModelView(User, db.session))
