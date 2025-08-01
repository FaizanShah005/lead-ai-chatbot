import os
import json
import logging
import time
from urllib.parse import urlparse
import numpy as np
import requests
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from flask import session
import openai
BASE_URL = 'https://updated-chatbot-mauve.vercel.app/'
load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
EMBEDDING_MODEL = "text-embedding-ada-002"
EMBEDDINGS_FILE = "website_embeddings.json"
MAX_CONTEXT_CHUNKS = 3
MAX_TOKENS_PER_CHUNK = 500
CHAT_MODEL = "gpt-3.5-turbo"
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
print(f"OpenAI API Key loaded: {os.getenv('OPENAI_API_KEY')}")
def chunk_text(text, max_tokens):
    words = text.split()
    chunks, current_chunk, current_length = [], [], 0
    for word in words:
        if current_length + len(word.split()) > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk, current_length = [], 0
        current_chunk.append(word)
        current_length += len(word.split())
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks
def get_embedding(text):
    """Generates an embedding for a given text."""
    try:
        response = client.embeddings.create(input=[text], model=EMBEDDING_MODEL)
        return response.data[0].embedding
    except Exception as e:
        logging.error(f"Could not get embedding: {e}")
        return None
def call_openai_api(messages):
    try:
        logging.info(f"Sending messages to OpenAI: {messages}")
        response = client.chat.completions.create(
        model=CHAT_MODEL,
        messages=messages,
        temperature=0.7
)
        logging.info(f"OpenAI response: {response}")
        return response.choices[0].message.content
    except Exception as e:
        logging.error(f"OpenAI API call error: {e}", exc_info=True)
        return "Sorry, I encountered an error while contacting OpenAI."
class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.REDIRECT_MAP = {
            "pricing": "/pricing",
            "contact": "/contact",
            "about": "/about",
            "services": "/services",
        }

    def check_for_redirect_command(self, user_message):
        """Check if the user message contains a redirect command."""
        lower_msg = user_message.lower()
        for keyword, url in self.REDIRECT_MAP.items():
            if keyword in lower_msg and any(word in lower_msg for word in ["go", "take", "navigate", "show", "send"]):
                return url
        return None
    def find_similar_chunks(self, query_emb):
        if not self.embeddings_data or query_emb is None:
            return []
        dists = [np.linalg.norm(query_emb - item['embedding']) for item in self.embeddings_data]
        idxs = np.argsort(dists)[:MAX_CONTEXT_CHUNKS]
        return [self.embeddings_data[i] for i in idxs]
    def get_chatbot_response(self, user_message, chat_history=None):
        if redirect := self.check_for_redirect(user_message):
            return {"type": "redirect", "url": redirect}
        if chat_history is None:
            chat_history = []
        # Append the new user message to the provided chat history
        chat_history = chat_history + [{"role": "user", "content": user_message}]
        q_emb = get_embedding(user_message)
        similar = self.find_similar_chunks(q_emb)
        context = "\n\n---\n\n".join([c['chunk'] for c in similar]) if similar else ""
        system_prompt = (
                "You are a helpful AI assistant. "
                "You have access to the full ongoing chat history. When responding, always consider and reference previous messages if they are relevant to the user's current question. If the user asks about something mentioned earlier, use that information in your answer."
        )
        if context:
            system_prompt += f"\nWebsite Context:\n{context}"
        messages = [{"role": "system", "content": system_prompt}] + chat_history
        reply = call_openai_api(messages)
        # Append assistant reply to chat_history (not persisted)
        chat_history = chat_history + [{"role": "assistant", "content": reply}]
        return {"type": "text", "message": reply, "chat_history": chat_history}
    def clear_history(self):
        pass # No longer needed
chat_service = ChatService()
def get_chatbot_response(user_message, chat_history=None):
    return chat_service.get_chatbot_response(user_message, chat_history)
# clear_chat_history and get_chat_history are no longer needed














