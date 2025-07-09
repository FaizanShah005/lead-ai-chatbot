import os
import json
import logging
import time
from urllib.parse import urlparse

import numpy as np
import requests
from sentence_transformers import SentenceTransformer
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from flask import session
BASE_URL = 'https://updated-chatbot-mauve.vercel.app/' 

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


EMBEDDING_MODEL = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

EMBEDDINGS_FILE = "website_embeddings.json"
MAX_CONTEXT_CHUNKS = 3
MAX_TOKENS_PER_CHUNK = 500

# === OpenRouter Gemini API ===
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
CHAT_MODEL = "mistralai/mistral-small-3.2-24b-instruct:free"

if OPENROUTER_API_KEY:
    logging.info(f"OpenRouter API Key loaded: {OPENROUTER_API_KEY[:5]}...")
else:
    logging.error("OpenRouter API Key not loaded. Please check your .env file.")

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
    try:
        embedding = EMBEDDING_MODEL.encode(text)
        return embedding.tolist()
    except Exception as e:
        logging.error(f"Embedding error: {e}")
        return None

def call_openrouter_gemini(messages):
    try:
        logging.info(f"Sending messages to OpenRouter: {messages}")
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": CHAT_MODEL,
                "messages": messages,
                "temperature": 0.7
            }
        )

        logging.info(f"OpenRouter response: {response.status_code} {response.text}")

        if not response.ok:
            logging.error(f"OpenRouter API error: {response.status_code} {response.text}")
            response.raise_for_status()

        response_json = response.json()
        return response_json["choices"][0]["message"]["content"]
    except Exception as e:
        logging.error(f"OpenRouter API call error: {e}", exc_info=True)
        return "Sorry, I encountered an error while contacting OpenRouter."

class ChatService:
    def _init_(self):
        self.embeddings_data = []
        self.embeddings_file_path = os.path.join(os.path.dirname(__file__), '..', EMBEDDINGS_FILE)
        self.REDIRECT_MAP = {"pricing": "/pricing", "contact": "/contact", "services": "/services"}
        self._initialize_embeddings()

    def _initialize_embeddings(self):
        self._load_embeddings()
        if not self.embeddings_data:
            logging.info("No embeddings found, starting crawl and embed process.")
            self._crawl_embed_and_save_playwright_from_url(BASE_URL)
            self._load_embeddings() # Reload after crawling

    def _crawl_embed_and_save_playwright_from_url(self, base_url):
        if os.path.exists(self.embeddings_file_path):
            logging.info("Embeddings exist, skipping crawl.")
            return

        logging.info(f"Crawling for embeddings from: {base_url}")
        all_embeddings = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            urls_to_visit, visited = {base_url}, set()

            while urls_to_visit:
                url = urls_to_visit.pop()
                if url in visited:
                    continue
                visited.add(url)

                try:
                    page.goto(url, wait_until="networkidle")
                    hrefs = page.locator('a[href]').evaluate_all("els => els.map(el => el.href)")
                    for href in hrefs:
                        parsed, base = urlparse(href), urlparse(base_url)
                        if parsed.netloc == base.netloc and not parsed.fragment:
                            urls_to_visit.add(href)

                    text = page.evaluate("""() => {
                        document.querySelectorAll('script, style').forEach(el => el.remove());
                        return document.body.innerText;
                    }""").strip()

                    if not text:
                        continue

                    for chunk in chunk_text(text, MAX_TOKENS_PER_CHUNK):
                        emb = get_embedding(chunk)
                        if emb:
                            all_embeddings.append({"url": url, "chunk": chunk, "embedding": emb})
                        time.sleep(0.5)

                except Exception as e:
                    logging.error(f"Crawl error: {e}")
                time.sleep(1)

            browser.close()

        with open(self.embeddings_file_path, 'w') as f:
            json.dump(all_embeddings, f, indent=2)
        logging.info(f"Saved {len(all_embeddings)} website embeddings.")

    def _load_embeddings(self):
        try:
            with open(self.embeddings_file_path, 'r') as f:
                self.embeddings_data = json.load(f)
            for item in self.embeddings_data:
                item['embedding'] = np.array(item['embedding'], dtype=np.float32)
            logging.info(f"Loaded {len(self.embeddings_data)} embeddings.")
        except FileNotFoundError:
            logging.warning("Embeddings file not found.")
            self.embeddings_data = []

    def check_for_redirect(self, msg):
        lower = msg.lower()
        for kw, url in self.REDIRECT_MAP.items():
            if kw in lower and any(w in lower for w in ["go", "show", "take"]):
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

        reply = call_openrouter_gemini(messages)

        # Append assistant reply to chat_history (not persisted)
        chat_history = chat_history + [{"role": "assistant", "content": reply}]

        return {"type": "text", "message": reply, "chat_history": chat_history}

    def clear_history(self):
        pass # No longer needed

chat_service = ChatService()

def get_chatbot_response(user_message, chat_history=None):
    return chat_service.get_chatbot_response(user_message, chat_history)

# clear_chat_history and get_chat_history are no longer needed