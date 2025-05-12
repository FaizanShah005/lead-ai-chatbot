import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const ChatHeader = memo(({ logo, onClose }) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Optimize animations for reduced motion preferences
  const headerAnimation = prefersReducedMotion 
    ? { opacity: [0, 1] }
    : { opacity: 0, y: -20 };
  
  const headerTransition = prefersReducedMotion
    ? { duration: 0.2 }
    : { duration: 0.3, ease: "easeOut" };
  
  const logoAnimation = prefersReducedMotion
    ? { opacity: [0, 1] }
    : { scale: 0 };
  
  const logoFinalAnimation = prefersReducedMotion
    ? { opacity: 1 }
    : { scale: 1 };
  
  const logoTransition = {
    type: "spring",
    stiffness: 260,
    damping: 20,
    delay: 0.1
  };
  
  const titleAnimation = prefersReducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x: -20 };
  
  const titleFinalAnimation = prefersReducedMotion
    ? { opacity: 1 }
    : { opacity: 1, x: 0 };
  
  return (
    <motion.div 
      className="p-4 flex items-center justify-between bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative overflow-hidden"
      initial={headerAnimation}
      animate={{ opacity: 1, y: 0 }}
      transition={headerTransition}
      layout
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/20 via-purple-400/20 to-pink-400/20 animate-gradient-x" />

      <div className="flex items-center space-x-3 relative z-10">
        {logo && (
          <motion.img
            src={logo}
            alt="Chat Logo"
            className="w-10 h-10 rounded-full border-2 border-white/30 hover:border-white/50 transition-all duration-300"
            initial={logoAnimation}
            animate={logoFinalAnimation}
            transition={logoTransition}
            whileHover={prefersReducedMotion ? {} : { 
              rotate: 10, 
              scale: 1.1,
              transition: { duration: 0.2, ease: "easeOut" } 
            }}
          />
        )}
        <motion.h3 
          className="text-xl font-semibold text-white drop-shadow-lg"
          initial={titleAnimation}
          animate={titleFinalAnimation}
          transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
        >
          Chat with us
        </motion.h3>
      </div>
      <motion.button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors duration-200 relative z-10"
        whileHover={prefersReducedMotion ? {} : { scale: 1.1 }}
        whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
        aria-label="Close chat"
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
      </motion.button>
    </motion.div>
  );
});

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader; 