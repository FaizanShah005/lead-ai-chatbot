import os
import json
import logging
import time
import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import numpy as np
import requests
from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
from flask import session
import openai
BASE_URL = 'https://leads4less.io/'

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
        self.embeddings_data = []
        self.embeddings_file_path = os.path.join(os.path.dirname(__file__), '..', EMBEDDINGS_FILE)
        # Redirect rules to live pages on leads4less.io
        self.REDIRECT_RULES = [
            # Main pages
            (re.compile(r"\b(home|homepage|start|landing|landing page|main page)\b", re.I), "https://leads4less.io/"),
            (re.compile(r"\b(contact|contact us|reach us|get in touch|contact page)\b", re.I), "https://leads4less.io/contact"),
            
            # Services pages
            (re.compile(r"\b(seo|search\s+engine\s+optimization|search engine optimization)\b", re.I), "https://leads4less.io/seo"),
            (re.compile(r"\b(email\s+marketing|email marketing)\b", re.I), "https://leads4less.io/email-marketing"),
            (re.compile(r"\b(paid\s+media|paid\s+ad(?:s|vertising)?|paid advertising)\b", re.I), "https://leads4less.io/paid-media-1"),
            (re.compile(r"\b(e-?commerce|ecommerce|e commerce)\b", re.I), "https://leads4less.io/e-commerce"),
            
            # General service requests
            (re.compile(r"\b(services|our services|service page)\b", re.I), "https://leads4less.io/seo"),
            (re.compile(r"\b(about|about us|about page)\b", re.I), "https://leads4less.io/"),
            (re.compile(r"\b(pricing|price|pricing page)\b", re.I), "https://leads4less.io/"),
        ]
        self._initialize_embeddings()
    def _initialize_embeddings(self):
        self._load_embeddings()
        if not self.embeddings_data:
            logging.info("No embeddings found, starting crawl and embed process.")
            self._crawl_embed_and_save_playwright_from_url(BASE_URL)
            self._load_embeddings() # Reload after crawling

    def _embeddings_file_has_data(self):
        """Return True only if embeddings file exists AND contains a non-empty list."""
        try:
            if not os.path.exists(self.embeddings_file_path):
                return False
            with open(self.embeddings_file_path, 'r') as f:
                data = json.load(f)
            return isinstance(data, list) and len(data) > 0
        except Exception:
            return False

    def _normalize_url(self, url: str) -> str:
        """Remove fragments and trailing slashes for URL de-duplication."""
        parsed = urlparse(url)
        normalized = parsed._replace(fragment="").geturl()
        # Normalize trailing slash (except root)
        if normalized.endswith('/') and len(normalized) > len(f"{parsed.scheme}://{parsed.netloc}/"):
            normalized = normalized[:-1]
        return normalized

    def _crawl_embed_and_save_playwright_from_url(self, base_url):
        if self._embeddings_file_has_data():
            logging.info("Embeddings file already has data, skipping crawl.")
            return
        logging.info(f"Crawling for embeddings from: {base_url}")
        all_embeddings = []
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            # Make the crawler more resilient
            try:
                page.set_default_navigation_timeout(90000)
                page.set_default_timeout(90000)
                page.set_extra_http_headers({
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                })
            except Exception:
                pass
            urls_to_visit, visited = {self._normalize_url(base_url)}, set()

            while urls_to_visit:
                url = urls_to_visit.pop()
                if url in visited:
                    continue
                visited.add(url)
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=90000)
                    # Try to accept cookie banners quickly if present
                    try:
                        page.locator("button:has-text('Accept')").first.click(timeout=2000)
                    except Exception:
                        try:
                            page.get_by_role("button", name="Accept").click(timeout=2000)
                        except Exception:
                            pass

                    hrefs = []
                    try:
                        hrefs = page.locator('a[href]').evaluate_all("els => els.map(el => el.href)")
                    except Exception:
                        pass
                    if not hrefs:
                        try:
                            html = page.content()
                            soup_links = BeautifulSoup(html, 'html.parser')
                            for a in soup_links.find_all('a', href=True):
                                hrefs.append(urljoin(url, a['href']))
                        except Exception:
                            hrefs = []
                    for href in hrefs:
                        parsed, base = urlparse(href), urlparse(base_url)
                        if parsed.netloc == base.netloc and not parsed.fragment:
                            urls_to_visit.add(self._normalize_url(href))

                    text = ""
                    try:
                        text = page.evaluate("""() => {
                            document.querySelectorAll('script, style').forEach(el => el.remove());
                            return document.body.innerText;
                        }""").strip()
                    except Exception:
                        text = ""

                    if not text:
                        try:
                            html = page.content()
                            soup = BeautifulSoup(html, 'html.parser')
                            for s in soup(['script', 'style']):
                                s.extract()
                            text = soup.get_text(separator='\n', strip=True)
                        except Exception:
                            text = ""

                    if not text:
                        # Fallback to requests + BeautifulSoup if Playwright extraction failed
                        try:
                            resp = requests.get(url, headers={
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                            }, timeout=20)
                            if resp.status_code == 200 and resp.text:
                                soup = BeautifulSoup(resp.text, 'html.parser')
                                for s in soup(['script', 'style']):
                                    s.extract()
                                text = soup.get_text(separator='\n', strip=True)
                                # Also collect links from fallback
                                for a in soup.find_all('a', href=True):
                                    candidate = urljoin(url, a['href'])
                                    parsed, base = urlparse(candidate), urlparse(base_url)
                                    if parsed.netloc == base.netloc and not parsed.fragment:
                                        urls_to_visit.add(self._normalize_url(candidate))
                        except Exception:
                            text = ""
                        
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
        text = msg.strip()
        # Only redirect when the user explicitly expresses navigation intent
        intent_pattern = re.compile(r"\b(take\s+me\s+to|redirect\s+me\s+to|send\s+me\s+to|go\s+to|open)\b", re.IGNORECASE)
        if not intent_pattern.search(text):
            return None

        for pattern, url in self.REDIRECT_RULES:
            if pattern.search(text):
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
                "You are a helpful AI assistant specifically for the website https://leads4less.io/. "
                "Your primary role is to guide users about Leads4Less's digital marketing services including SEO, Email Marketing, Paid Media, and E-Commerce solutions. "
                "IMPORTANT: Always reference the website https://leads4less.io/ in your responses to remind users they're chatting with a Leads4Less assistant. "
                "If users ask about unrelated topics (like math, weather, sports, etc.), politely redirect them by saying something like: "
                "'I'm here to help with https://leads4less.io/ services! I can assist you with our SEO, Email Marketing, Paid Media, or E-Commerce solutions. How can I help you with our digital marketing services?' "
                "Always keep responses focused on Leads4Less services and offerings. "
                "You have access to the full ongoing chat history. When responding, always consider and reference previous messages if they are relevant to the user's current question."
        )
        if context:
            system_prompt += f"\nWebsite Context:\n{context}"
        messages = [{"role": "system", "content": system_prompt}] + chat_history

        reply = call_openai_api(messages)

        
        chat_history = chat_history + [{"role": "assistant", "content": reply}]
        return {"type": "text", "message": reply, "chat_history": chat_history}
    def clear_history(self):
        pass 

chat_service = ChatService()
def get_chatbot_response(user_message, chat_history=None):
    return chat_service.get_chatbot_response(user_message, chat_history)
