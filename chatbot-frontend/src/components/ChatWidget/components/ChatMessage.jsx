import React from 'react';
import LeadDisplay from './LeadDisplay';
import MessageOptions from './MessageOptions';

const ChatMessage = ({ message, onOptionClick }) => {
  return (
    <div
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div
        className={`max-w-[80%] px-4 py-2 relative ${
          message.type === 'user'
            ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-t-3xl rounded-l-3xl rounded-br-md'
            : 'bg-gradient-to-br from-blue-100 to-gray-100 shadow-sm hover:shadow-md backdrop-blur-sm rounded-t-3xl rounded-r-3xl rounded-bl-md'
        }`}
      >
        <div className="relative z-10 break-words whitespace-pre-wrap">
          {message.isLoading ? (
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '50ms' }}></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
            </div>
          ) : (
            <>
              <p
                className={`${
                  message.type === 'user'
                    ? 'text-white drop-shadow-sm'
                    : 'text-gray-800'
                } break-words whitespace-pre-wrap`}
              >
                {message.text}
              </p>
              {message.leads && <LeadDisplay leads={message.leads} />}
              {message.options && <MessageOptions options={message.options} onOptionClick={onOptionClick} />}
            </>
          )}
        </div>

        <div
          className={`absolute inset-0 rounded-3xl overflow-hidden ${
            message.type === 'user' ? 'opacity-30' : 'opacity-20'
          }`}
        >
          <div
            className={`absolute inset-0 bg-gradient-to-r ${
              message.type === 'user'
                ? 'from-blue-500/40 via-cyan-500/40 to-blue-500/40'
                : 'from-gray-300/40 via-gray-200/40 to-gray-300/40'
            } animate-gradient-x`}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 