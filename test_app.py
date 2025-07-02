from flask import Flask

app = Flask(__name__)

@app.route('/')
def home():
    return 'WORKING!'

# Remove health route and if __name__ block to make it as simple as possible 