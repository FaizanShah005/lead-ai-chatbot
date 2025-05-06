import React from 'react';

const ChatHeader = ({ logo, onClose }) => {
  return (
    <div className="p-4 flex items-center justify-between bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 animate-gradient-x" />

      <div className="flex items-center space-x-3 relative z-10">
        {logo && (
          <img
            src={logo}
            alt="Chat Logo"
            className="w-10 h-10 rounded-full border-2 border-white/30 hover:border-white/50 transition-all duration-300"
          />
        )}
        <h3 className="text-xl font-semibold text-white drop-shadow-lg">
          Chat with us
        </h3>
      </div>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors duration-200 relative z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

export default ChatHeader; 