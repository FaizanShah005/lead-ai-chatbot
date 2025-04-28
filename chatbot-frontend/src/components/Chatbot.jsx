import React, { useState } from 'react';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState("");

  const sendMessage = async () => {
  if (!userInput.trim()) return;

  const userMessage = { sender: 'user', text: userInput };
  setMessages(prev => [...prev, userMessage]);

  try {
    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userInput }),
    });

    const data = await res.json();

    if (data.type === "redirect") {
      // For testing, let's log the redirection instead of immediately redirecting
      console.log("Redirecting to:", data.url);
      window.location.href = data.url;
    } else if (data.type === "text") {
      setMessages(prev => [...prev, { sender: 'bot', text: data.message }]);
    } else if (data.type === "error") {
      setMessages(prev => [...prev, { sender: 'bot', text: `Error: ${data.message}` }]);
    } else {
      setMessages(prev => [...prev, { sender: 'bot', text: "Unknown response type" }]);
    }

  } catch (err) {
    console.error("Fetch failed:", err);
    setMessages(prev => [...prev, { sender: 'bot', text: "Fetch failed: " + err.message }]);
  }

  setUserInput("");
};


  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", padding: "10px" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "10px", textAlign: msg.sender === 'user' ? "right" : "left" }}>
            <strong>{msg.sender === 'user' ? "You" : "Bot"}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={userInput}
        onChange={e => setUserInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
        style={{ width: "100%", marginTop: "10px", padding: "10px" }}
        placeholder="Type your message..."
      />
    </div>
  );
};

export default Chatbot;
