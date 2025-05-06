import React from 'react';

const MessageOptions = ({ options, onOptionClick }) => {
  return (
    <div className="mt-2 flex flex-wrap gap-2 justify-start">
      {options.map((option, index) => (
        <button
          key={index}
          onClick={() => onOptionClick(option)}
          className="
            px-3 py-1.5 
            text-sm font-medium
            bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500
            hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600
            text-white
            rounded-full
            border border-purple-400/30
            shadow-lg hover:shadow-xl
            transition-all duration-300
            hover:-translate-y-0.5
            hover:scale-105
            active:scale-95
            whitespace-nowrap
            backdrop-blur-sm
            hover:backdrop-blur-md
          "
        >
          {option}
        </button>
      ))}
    </div>
  );
};

export default MessageOptions; 