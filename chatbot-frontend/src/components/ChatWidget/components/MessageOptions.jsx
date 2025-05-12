import React, { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const MessageOptions = memo(({ options, onOptionClick }) => {
  const prefersReducedMotion = useReducedMotion();
  
  // Simplified container animation to reduce nested animations
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0.03 : 0.05,
        delayChildren: prefersReducedMotion ? 0.05 : 0.1,
        ease: "easeOut",
        when: "beforeChildren"
      }
    }
  };
  
  // Use GPU-accelerated properties (transform, opacity) instead of height/position changes
  const item = {
    hidden: prefersReducedMotion 
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.9, y: 10 },
    show: prefersReducedMotion
      ? { 
          opacity: 1,
          transition: { duration: 0.2 }
        }
      : { 
          opacity: 1, 
          scale: 1,
          y: 0,
          transition: {
            type: "spring",
            stiffness: 200, // Lower stiffness for smoother motion
            damping: 20,
            mass: 0.6, // Lower mass for faster response
            velocity: 1
          }
        }
  };

  // Simplified hover animation
  const buttonHoverAnimation = !prefersReducedMotion 
    ? { 
        scale: 1.03, 
        y: -1,
        transition: { duration: 0.2, ease: "easeOut" }
      } 
    : {};
    
  const buttonTapAnimation = !prefersReducedMotion 
    ? { scale: 0.97 }
    : {};

  // Use a more efficient callback for option clicks
  const handleClick = (option) => () => {
    onOptionClick(option);
  };

  return (
    <motion.div 
      className="mt-2 flex flex-wrap gap-2 justify-start"
      variants={container}
      initial="hidden"
      animate="show"
      layout
    >
      {options.map((option, index) => (
        <motion.button
          key={index}
          variants={item}
          whileHover={buttonHoverAnimation}
          whileTap={buttonTapAnimation}
          onClick={handleClick(option)}
          className="
            px-3 py-1.5 
            text-sm font-medium
            bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500
            hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600
            text-white
            rounded-full
            border border-purple-400/30
            shadow-lg
            transition-colors duration-200
            whitespace-nowrap
            backdrop-blur-sm
            will-change-transform
          "
          aria-label={`Select option: ${option}`}
          style={{
            willChange: 'transform',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden'
          }}
        >
          {option}
        </motion.button>
      ))}
    </motion.div>
  );
});

MessageOptions.displayName = 'MessageOptions';

export default MessageOptions; 