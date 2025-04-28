import React, { useState } from 'react';
import axios from 'axios';

function ChatLeadExtractor() {
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleGetLeads = async () => {
    setChatLog(prev => [...prev, { sender: 'user', message: 'Show me top leads' }]);

    try {
      const res = await axios.get('http://localhost:5000/get-top-leads');
      if (res.data.success) {
        const leads = res.data.leads.map((lead, index) =>
          `${index + 1}. 👤 ${lead.name} | 📧 ${lead.email} | 📍 ${lead.location}`
        ).join('\n');

        setChatLog(prev => [...prev, {
          sender: 'bot',
          message: `Here are the top 5 leads:\n${leads}`
        }]);
      } else {
        setChatLog(prev => [...prev, { sender: 'bot', message: '❌ Could not fetch leads.' }]);
      }
    } catch (error) {
      setChatLog(prev => [...prev, { sender: 'bot', message: '❌ Server error.' }]);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h2 className="text-xl font-bold mb-2">Lead Generation Chatbot</h2>

      <button
        onClick={handleGetLeads}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
      >
        Show Leads
      </button>

      <div className="mt-4">
        {chatLog.map((entry, i) => (
          <div key={i} className={`mb-2 ${entry.sender === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={entry.sender === 'user' ? "text-blue-600" : "text-green-600"}>
              {entry.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatLeadExtractor;
