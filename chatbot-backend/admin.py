from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user
from wtforms import SelectField
from models import db, Lead, User

# Initialize admin
admin = Admin(name='Admin Panel', template_mode='bootstrap4')

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
    column_list = ['name', 'email', 'phone', 'address', 'message', 'created_at']
    column_searchable_list = ['name', 'email', 'phone', 'address', 'message']
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
    
    form_columns = ['username', 'password', 'role']
    form_args = {
        'role': {
            'choices': [('admin', 'Admin'), ('client', 'Client')]
        }
    }
    
    def on_model_change(self, form, model, is_created):
        if form.password.data:
            model.set_password(form.password.data)
            
    def scaffold_form(self):
        form_class = super(UserModelView, self).scaffold_form()
        form_class.role = SelectField('Role', choices=[('admin', 'Admin'), ('client', 'Client')])
        return form_class

# Add views to admin
admin.add_view(LeadModelView(Lead, db.session))
admin.add_view(UserModelView(User, db.session)) 