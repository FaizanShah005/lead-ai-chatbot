import re
import requests
from bs4 import BeautifulSoup

class LeadExtractor:
    def __init__(self):
        # Known cities and countries to improve accuracy
        self.cities_countries = [
            "New York", "London", "Paris", "Islamabad", "Lahore", "Karachi", "Toronto",
            "Rawalpindi", "Peshawar", "Quetta", "Multan", "Faisalabad", "Hyderabad",
            "Sukkur", "Gujranwala", "Sialkot", "USA", "UK", "Pakistan", "Canada",
            "Australia", "Germany", "France", "Italy", "Spain", "China", "Japan",
            "India", "Dubai", "Abu Dhabi", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain"
        ]

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
        potential = []

        # Enhanced pattern: supports numbered addresses, PO boxes, cities, and postal codes
        address_pattern = re.compile(
            r'(?i)(\d{1,5}\s[A-Za-z0-9\s.,-]{3,80}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Terrace|Ter|Place|Pl|Square|Sq|Highway|Hwy|Parkway|Pkwy|Plaza|Centre|Center|Block|Phase)\b'
            r'(?:[A-Za-z0-9\s.,-]*)?)|'
            r'(PO Box\s?\d{1,6})|'
            r'([A-Za-z\s]+,\s?[A-Za-z\s]+,\s?(?:' + '|'.join(re.escape(loc) for loc in self.cities_countries) + r'))',
            re.IGNORECASE
        )

        for line in lines:
            matches = address_pattern.findall(line)
            for match in matches:
                # Flatten match groups and clean empty strings
                for group in match:
                    cleaned = group.strip()
                    if cleaned and len(cleaned) >= 10:
                        potential.append(cleaned)

        return list(set(potential))  # Return all found valid addresses (no slicing/limiting)

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
