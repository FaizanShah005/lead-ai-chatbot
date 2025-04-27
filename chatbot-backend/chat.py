import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Custom redirection map
REDIRECT_MAP = {
    "pricing": "/pricing",
    "contact": "/contact",
    "about": "/about",
    "services": "/services",
}

def check_for_redirect_command(user_message):
    lower_msg = user_message.lower()
    for keyword, url in REDIRECT_MAP.items():
        if keyword in lower_msg and any(word in lower_msg for word in ["go", "take", "navigate", "show", "send"]):
            return url
    return None

def get_chatbot_response(user_message):
    redirect_url = check_for_redirect_command(user_message)
    if redirect_url:
        return {"type": "redirect", "url": redirect_url}

    try:
        completion = client.chat.completions.create(
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






# import os
# from openai import OpenAI
# from dotenv import load_dotenv
#
# # Load environment variables from .env file
# load_dotenv()
#
# # Initialize OpenAI client
# client = OpenAI(
#     api_key=os.getenv("OPENAI_API_KEY")
# )
#
#
# def get_chatbot_response(user_message):
#     try:
#         completion = client.chat.completions.create(
#             model="gpt-4",
#             messages=[
#                 {
#                     "role": "system",
#                     "content": """You are a precise and knowledgeable AI assistant. Your responses should be:
# 1. Accurate and fact-based
# 2. Concise and to the point
# 3. Well-structured and easy to understand
# 4. Supported by relevant references when applicable
# 5. Free from unnecessary elaboration
# 6. Focused on providing the most relevant information first
# 7. Always respond in short and concise manner
#
# When providing information:
# - Cite sources for factual claims
# - Use bullet points for complex information
# - Include specific examples when helpful
# - Correct any misconceptions directly
# - Provide clear, actionable advice when requested
#
# Your goal is to be the most efficient and reliable source of information while maintaining accuracy and credibility."""
#                 },
#                 {
#                     "role": "user",
#                     "content": user_message
#                 }
#             ]
#         )
#         return completion.choices[0].message.content
#     except Exception as e:
#         return f"An error occurred: {str(e)}"
#
#
# def main():
#     print("Welcome to your AI Assistant!")
#     print("Type 'quit' to exit the program.")
#
#     while True:
#         user_input = input("\nYou: ")
#         if user_input.lower() == 'quit':
#             print("Goodbye! Have a great day!")
#             break
#
#         response = get_chatbot_response(user_input)
#         print("\nAssistant:", response)
#
#
# if __name__ == "__main__":
#     main()
#
#
#
#
#
#
#
#
#









