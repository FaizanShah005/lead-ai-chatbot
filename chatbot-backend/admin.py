from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user
from wtforms import SelectField, StringField, PasswordField
from wtforms.validators import DataRequired, Length
from flask_admin.form import BaseForm
from models import db, Lead, User
from flask import redirect, url_for, flash

# Custom form for User model
class UserForm(BaseForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=80)])
    email = StringField('Email', validators=[DataRequired(), Length(min=5, max=120)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6)])
    role = SelectField('Role', choices=[('admin', 'Admin'), ('client', 'Client')], validators=[DataRequired()])

# Custom AdminIndexView with proper authentication
class MyAdminIndexView(AdminIndexView):
    @expose('/')
    def index(self):
        if not self.is_accessible():
            return self.inaccessible_callback('index')
        return self.render('admin/index.html', current_user=current_user)

    def is_accessible(self):
        return current_user.is_authenticated and current_user.role in ['admin', 'client']

    def inaccessible_callback(self, name, **kwargs):
        flash('You do not have permission to access this page')
        return redirect(url_for('login'))

# Initialize admin with custom index view
admin = Admin(name='Admin Panel', template_mode='bootstrap4', index_view=MyAdminIndexView())

# Restrict admin view to logged-in admin/client only
class MyModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated and current_user.role in ['admin', 'client']

    def inaccessible_callback(self, name, **kwargs):
        flash('You do not have permission to access this page')
        return redirect(url_for('login'))

    def _handle_view(self, name, **kwargs):
        if not self.is_accessible():
            return self.inaccessible_callback(name, **kwargs)

# Create admin views with proper access control
class LeadModelView(MyModelView):
    column_list = ['name', 'email', 'phone', 'message', 'created_at']
    column_searchable_list = ['name', 'email', 'phone', 'message']
    column_filters = ['created_at']
    can_create = True
    can_edit = True
    can_delete = True

class UserModelView(MyModelView):
    # Basic configuration
    column_list = ['username', 'email', 'role', 'created_at']
    column_searchable_list = ['username', 'email']
    can_create = True
    can_edit = True
    can_delete = True
    
    # Exclude sensitive fields from being displayed in the list view
    column_exclude_list = ['password', 'reset_token', 'reset_token_expiry']
    
    # Use our custom form
    form = UserForm
    
    def on_model_change(self, form, model, is_created):
        # Only hash password if it's provided and not empty
        if hasattr(form, 'password') and form.password and form.password.data:
            model.set_password(form.password.data)

# Add views to admin
admin.add_view(LeadModelView(Lead, db.session))
admin.add_view(UserModelView(User, db.session)) 