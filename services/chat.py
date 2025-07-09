import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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

    def get_chatbot_response(self, user_message):
        """Get response from the chatbot."""
        redirect_url = self.check_for_redirect_command(user_message)
        if redirect_url:
            return {"type": "redirect", "url": redirect_url}

        try:
            completion = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant. Always keep your answers short and clear."
                    },
                    {
                        "role": "user",
                        "content": user_message
                    }
                ]
            )
            return {"type": "text", "message": completion.choices[0].message.content}
        except Exception as e:
            return {"type": "error", "message": str(e)}

# Create a singleton instance
chat_service = ChatService()

# Export the get_chatbot_response function for backward compatibility
def get_chatbot_response(user_message):
    return chat_service.get_chatbot_response(user_message) 
