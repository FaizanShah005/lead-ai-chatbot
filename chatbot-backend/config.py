import os


class Config:
    SQLALCHEMY_DATABASE_URI = 'postgresql://postgres:main123@localhost:5432/lead-gen-chatbot'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = 'mysecret'
