import os
import json
import time
import logging
import numpy as np
from urllib.parse import urlparse
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from openai import OpenAI
from utils.text_utils import chunk_text, get_embedding
from constants import BASE_URL, MAX_TOKENS_PER_CHUNK, EMBEDDINGS_FILE

# Load environment variables
load_dotenv()

class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embeddings_data = []
        self.embeddings_file_path = os.path.join(os.path.dirname(__file__), '..', EMBEDDINGS_FILE)
        self.REDIRECT_MAP = {
            "pricing": "/pricing",
            "contact": "/contact",
            "about": "/about",
            "services": "/services"
        }
        self._initialize_embeddings()

    def _initialize_embeddings(self):
        self._load_embeddings()
        if not self.embeddings_data:
            logging.info("No embeddings found, starting crawl and embed process.")
            self._crawl_embed_and_save_playwright_from_url(BASE_URL)
            self._load_embeddings()  # Reload after crawling

    def _crawl_embed_and_save_playwright_from_url(self, base_url):
        if os.path.exists(self.embeddings_file_path):
            logging.info("Embeddings already exist, skipping crawling.")
            return

        logging.info(f"Crawling and embedding from: {base_url}")
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
        logging.info(f"Saved {len(all_embeddings)} embeddings.")

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

    def check_for_redirect_command(self, user_message):
        """Check if the user message contains a redirect command."""
        lower_msg = user_message.lower()
        for keyword, url in self.REDIRECT_MAP.items():
            if keyword in lower_msg and any(word in lower_msg for word in ["go", "take", "navigate", "show", "send"]):
                return url
        return None

    def get_chatbot_response(self, user_message):
        """Generate response using OpenAI GPT or redirect if applicable."""
        redirect_url = self.check_for_redirect_command(user_message)
        if redirect_url:
            return {"type": "redirect", "url": redirect_url}

        try:
            completion = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant. Always keep your answers short and clear."},
                    {"role": "user", "content": user_message}
                ]
            )
            return {"type": "text", "message": completion.choices[0].message.content}
        except Exception as e:
            logging.error(f"Chat error: {e}")
            return {"type": "error", "message": str(e)}

# Singleton instance
chat_service = ChatService()

# Backward-compatible function export
def get_chatbot_response(user_message):
    return chat_service.get_chatbot_response(user_message)
