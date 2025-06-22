# import re
# import requests
# from urllib.parse import urljoin, urlparse
# from bs4 import BeautifulSoup
# from postal.parser import parse_address
# from geopy.geocoders import Nominatim

# class LeadExtractorService:
#     def __init__(self):
#         self.geolocator = Nominatim(user_agent="lead_extractor_bot")

#     def extract_emails(self, text):
#         """Extract email addresses from text."""
#         pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
#         return list(set(re.findall(pattern, text)))

#     def extract_phones(self, text):
#         """Extract phone numbers from text."""
#         raw = re.findall(r'(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4})', text)
#         phones = []
#         for phone in raw:
#             digits = re.sub(r'\D', '', phone)
#             if 10 <= len(digits) <= 15:
#                 phones.append(phone.strip())
#         return list(set(phones))

#     def extract_locations(self, text):
#         """Extract location information from text."""
#         lines = text.split('\n')
#         potential_locations = []
#         address_hint_pattern = re.compile(
#             r'\d{1,6}[\w\s,#.-]{5,100}(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Blvd|Boulevard|Lane|Ln|Square|Market|Center|Centre|Block|Phase|Sector|Town|Colony|Park|Circle|Building|Tower|PO Box|Suite|Floor|Fl|Plaza|Unit|Highway|Way|City|Country|State|Zip|Code|Postcode|Postal|Region|Province)',
#             re.IGNORECASE
#         )

#         for line in lines:
#             line = line.strip()
#             if len(line) < 8 or len(line.split()) > 15:
#                 continue
#             if address_hint_pattern.search(line):
#                 parsed = parse_address(line)
#                 if parsed:
#                     components = [c[1] for c in parsed]
#                     if any(c in ['road', 'house_number', 'city', 'postcode', 'country', 'state'] for c in components):
#                         potential_locations.append(line)

#         return list(set(potential_locations))

#     def get_internal_links(self, soup, base_url):
#         """Extract internal links from the webpage."""
#         links = set()
#         for a in soup.find_all('a', href=True):
#             href = a['href']
#             if href.startswith('#') or href.startswith('mailto:') or href.startswith('tel:'):
#                 continue
#             full_url = urljoin(base_url, href)
#             parsed = urlparse(full_url)
#             if parsed.netloc == urlparse(base_url).netloc:
#                 if any(x in full_url.lower() for x in ['contact', 'about', 'team', 'support']):
#                     links.add(full_url)
#         return list(links)

#     def fetch_text_from_url(self, url):
#         """Fetch and parse text content from a URL."""
#         try:
#             response = requests.get(url, timeout=10)
#             soup = BeautifulSoup(response.text, 'html.parser')
#             return soup.get_text(separator='\n', strip=True), soup
#         except Exception:
#             return "", None

#     def extract_from_url(self, url):
#         """Extract leads from a given URL."""
#         all_texts = []

#         # Crawl home page
#         home_text, home_soup = self.fetch_text_from_url(url)
#         if home_text:
#             all_texts.append(home_text)

#         # Crawl additional relevant internal pages
#         if home_soup:
#             internal_links = self.get_internal_links(home_soup, url)
#             for link in internal_links:
#                 page_text, _ = self.fetch_text_from_url(link)
#                 if page_text:
#                     all_texts.append(page_text)

#         combined_text = "\n".join(all_texts)

#         return {
#             "success": True,
#             "leads": {
#                 "emails": self.extract_emails(combined_text),
#                 "phones": self.extract_phones(combined_text),
#                 "locations": self.extract_locations(combined_text)
#             }
#         }

# # Create a singleton instance
# lead_extractor = LeadExtractorService() 