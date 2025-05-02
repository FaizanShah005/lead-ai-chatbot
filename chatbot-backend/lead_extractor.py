import re
import requests
from bs4 import BeautifulSoup

from postal.parser import parse_address  # Requires libpostal
from geopy.geocoders import Nominatim    # Optional: to validate against real locations

class LeadExtractor:
    def __init__(self):
        self.geolocator = Nominatim(user_agent="lead_extractor_bot")

    def extract_emails(self, text):
        pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        return list(set(re.findall(pattern, text)))

    def extract_phones(self, text):
        raw = re.findall(r'(?:(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4})', text)
        phones = []
        for phone in raw:
            digits = re.sub(r'\D', '', phone)
            if 10 <= len(digits) <= 15:
                phones.append(phone.strip())
        return list(set(phones))

    def extract_locations(self, text):
        lines = text.split('\n')
        potential_locations = []

        # Regex to find likely address lines (numbers + words + commas)
        address_hint_pattern = re.compile(
            r'\d{1,6}[\w\s,#.-]{5,100}(Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Blvd|Boulevard|Lane|Ln|Square|Market|Center|Centre|Block|Phase|Sector|Town|Colony|Park|Circle|Building|Tower|PO Box|Suite|Floor|Fl|Plaza|Unit|Highway|Way|City|Country|State)',
            re.IGNORECASE
        )

        for line in lines:
            if len(line.strip()) < 8:
                continue

            if address_hint_pattern.search(line):
                # Try parsing with libpostal
                parsed = parse_address(line)
                if parsed:
                    components = [component[0] for component in parsed]
                    if any(c in ['road', 'house_number', 'city', 'postcode', 'country'] for c in [c[1] for c in parsed]):
                        potential_locations.append(line.strip())

        return list(set(potential_locations))

    def extract_from_url(self, url):
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            text = soup.get_text(separator='\n', strip=True)

            return {
                "success": True,
                "leads": {
                    "emails": self.extract_emails(text),
                    "phones": self.extract_phones(text),
                    "locations": self.extract_locations(text)
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}


if __name__ == "__main__":
    extractor = LeadExtractor()
    url = "https://www.elexoft.com/"  # Replace with a real one
    result = extractor.extract_from_url(url)

    if result["success"]:
        print("Emails:", result["leads"]["emails"])
        print("Phones:", result["leads"]["phones"])
        print("Locations:", result["leads"]["locations"])
    else:
        print("Error:", result["error"])
