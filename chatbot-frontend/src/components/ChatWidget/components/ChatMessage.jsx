import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import LeadDisplay from './LeadDisplay';
import MessageOptions from './MessageOptions';

// Memoized TypingIndicator to prevent unnecessary re-renders
const TypingIndicator = memo(() => {
  const prefersReducedMotion = useReducedMotion();
  
  const animation = prefersReducedMotion 
    ? { opacity: [0.5, 1, 0.5] } 
    : { y: [0, -5, 0] };
  
  return (
    <div className="flex space-x-2">
      <motion.div 
        className="w-2 h-2 bg-blue-400 rounded-full" 
        animate={animation}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
      />
      <motion.div 
        className="w-2 h-2 bg-blue-400 rounded-full" 
        animate={animation}
        transition={{ duration: 0.5, delay: 0.1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
      />
      <motion.div 
        className="w-2 h-2 bg-blue-400 rounded-full" 
        animate={animation}
        transition={{ duration: 0.5, delay: 0.2, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
      />
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// Optimized TypewriterText using useRef instead of state updates for each character
const TypewriterText = memo(({ text, onComplete, onCharacterUpdate }) => {
  const [displayedText, setDisplayedText] = useState('');
  const timeoutRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  
  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayedText(text);
      if (onComplete) setTimeout(onComplete, 10);
      return;
    }
    
    let currentIndex = 0;
    const animateText = () => {
      if (currentIndex < text.length) {
        const newText = text.substring(0, currentIndex + 1);
        setDisplayedText(newText);
        // Call onCharacterUpdate for each new character
        if (onCharacterUpdate) {
          onCharacterUpdate();
        }
        currentIndex++;
        timeoutRef.current = requestAnimationFrame(() => {
          setTimeout(animateText, 15);
        });
      } else if (onComplete) {
        // Animation is complete
        setTimeout(onComplete, 10);
      }
    };
    
    animateText();
    
    return () => {
      if (timeoutRef.current) {
        cancelAnimationFrame(timeoutRef.current);
      }
    };
  }, [text, prefersReducedMotion, onComplete, onCharacterUpdate]);
  
  return <>{displayedText || ' '}</>;
});

TypewriterText.displayName = 'TypewriterText';

// Create a stable message object comparison function for memo
const arePropsEqual = (prevProps, nextProps) => {
  // First check if the message objects are identical (same reference)
  if (prevProps.message === nextProps.message) return true;
  
  // Compare relevant message properties
  return (
    prevProps.message.type === nextProps.message.type &&
    prevProps.message.text === nextProps.message.text &&
    prevProps.message.isLoading === nextProps.message.isLoading &&
    JSON.stringify(prevProps.message.leads) === JSON.stringify(nextProps.message.leads) &&
    JSON.stringify(prevProps.message.options) === JSON.stringify(nextProps.message.options)
  );
};

const ChatMessage = memo(({ message, onOptionClick, onAnimationComplete }) => {
  const [showTyping, setShowTyping] = useState(message.isLoading || (message.type === 'bot' && !message.text));
  const [showContent, setShowContent] = useState(message.type === 'user');
  const typingTimeoutRef = useRef(null);
  const animationCompleteTimeoutRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();
  const hasCalledCompleteRef = useRef(false);
  const messageRef = useRef(null);
  const hasAnimatedRef = useRef(false);
  
  // Ensure cleanup of timeouts
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (animationCompleteTimeoutRef.current) clearTimeout(animationCompleteTimeoutRef.current);
    };
  }, []);
  
  // Handle character updates during typewriter animation
  const handleCharacterUpdate = useCallback(() => {
    if (onAnimationComplete) {
      onAnimationComplete();
    }
  }, [onAnimationComplete]);
  
  useEffect(() => {
    // If it's a bot message and not loading, show typing first then content
    if (message.type === 'bot' && !message.isLoading && message.text) {
      setShowTyping(true);
      
      // Clear any existing timeout to prevent memory leaks
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        setShowTyping(false);
        setShowContent(true);
      }, prefersReducedMotion ? 0 : 800);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message.type, message.isLoading, message.text, prefersReducedMotion]);
  
  // Generate a stable unique ID for this message
  const messageId = useRef(
    `message-${message.type}-${message.text?.slice(0, 10)}-${Math.random().toString(36).substring(2, 10)}`
  ).current;
  
  // Animation variants - using layoutId to prevent re-animation
  const userMessageVariants = {
    initial: { opacity: 0, scale: 0.8, x: 20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        mass: 0.8,
        velocity: 10
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      x: 20,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };
  
  const botMessageVariants = {
    initial: { opacity: 0, scale: 0.8, x: -20 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      x: 0,
      transition: { 
        type: "spring", 
        stiffness: 400, 
        damping: 30,
        mass: 0.8
      } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      x: -20,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  // Use simpler animations if user prefers reduced motion
  if (prefersReducedMotion) {
    userMessageVariants.initial = { opacity: 0 };
    userMessageVariants.animate = { 
      opacity: 1,
      transition: { duration: 0.2 }
    };
    userMessageVariants.exit = { opacity: 0 };
    
    botMessageVariants.initial = { opacity: 0 };
    botMessageVariants.animate = { 
      opacity: 1,
      transition: { duration: 0.2 }
    };
    botMessageVariants.exit = { opacity: 0 };
  }

  // Handle animation completion and notify parent if needed
  const handleAnimationComplete = useCallback(() => {
    if (onAnimationComplete && !hasCalledCompleteRef.current) {
      onAnimationComplete();
      hasCalledCompleteRef.current = true;
    }
    
    // Mark that this component has already animated
    hasAnimatedRef.current = true;
  }, [onAnimationComplete]);

  return (
    <div
      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
      ref={messageRef}
    >
      {/* Only use AnimatePresence if we haven't animated yet */}
      {!hasAnimatedRef.current ? (
        <motion.div
          layoutId={messageId}
          initial="initial"
          animate="animate"
          variants={message.type === 'user' ? userMessageVariants : botMessageVariants}
          className={`max-w-[80%] px-4 py-2 relative ${
            message.type === 'user'
              ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-t-3xl rounded-l-3xl rounded-br-md'
              : 'bg-gradient-to-br from-blue-100 to-gray-100 shadow-sm hover:shadow-md backdrop-blur-sm rounded-t-3xl rounded-r-3xl rounded-bl-md'
          }`}
          onAnimationComplete={handleAnimationComplete}
        >
          <MessageContent 
            message={message}
            showTyping={showTyping}
            showContent={showContent}
            onOptionClick={onOptionClick}
            onAnimationComplete={onAnimationComplete}
            handleCharacterUpdate={handleCharacterUpdate}
          />
        </motion.div>
      ) : (
      <div
        className={`max-w-[80%] px-4 py-2 relative ${
          message.type === 'user'
            ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg hover:shadow-xl rounded-t-3xl rounded-l-3xl rounded-br-md'
            : 'bg-gradient-to-br from-blue-100 to-gray-100 shadow-sm hover:shadow-md backdrop-blur-sm rounded-t-3xl rounded-r-3xl rounded-bl-md'
        }`}
      >
          <MessageContent 
            message={message}
            showTyping={showTyping}
            showContent={showContent}
            onOptionClick={onOptionClick}
            onAnimationComplete={onAnimationComplete}
            handleCharacterUpdate={handleCharacterUpdate}
          />
        </div>
      )}
    </div>
  );
}, arePropsEqual);

// Separate component for message content to prevent re-renders
const MessageContent = memo(({ 
  message, 
  showTyping, 
  showContent, 
  onOptionClick, 
  onAnimationComplete,
  handleCharacterUpdate 
}) => {
  return (
    <>
        <div className="relative z-10 break-words whitespace-pre-wrap">
        {message.isLoading || showTyping ? (
          <TypingIndicator />
          ) : (
            <>
              <p
                className={`${
                  message.type === 'user'
                    ? 'text-white drop-shadow-sm'
                    : 'text-gray-800'
                } break-words whitespace-pre-wrap`}
              >
              {message.type === 'bot' && showContent ? (
                <TypewriterText 
                  text={message.text} 
                  onComplete={onAnimationComplete}
                  onCharacterUpdate={handleCharacterUpdate}
                />
              ) : (
                message.text
              )}
            </p>
            {message.leads && <LeadDisplay leads={message.leads} onAnimationComplete={onAnimationComplete} />}
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
    </>
  );
}, (prevProps, nextProps) => {
  // Compare all content properties that matter for rendering
  return (
    prevProps.message === nextProps.message &&
    prevProps.showTyping === nextProps.showTyping &&
    prevProps.showContent === nextProps.showContent
  );
});

MessageContent.displayName = 'MessageContent';
ChatMessage.displayName = 'ChatMessage';

export default ChatMessage; 