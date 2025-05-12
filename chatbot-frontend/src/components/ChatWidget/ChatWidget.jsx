import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import ChatHeader from './components/ChatHeader';
import ChatMessage from './components/ChatMessage';
import LeadDisplay from './components/LeadDisplay';
import MessageOptions from './components/MessageOptions';

// API Base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Add styles for animation
const fadeInOutKeyframes = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateY(-20px); }
  10% { opacity: 1; transform: translateY(0); }
  90% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-20px); }
}
@keyframes fadeOut {
  from { opacity: 1; }
  to { opacity: 0; }
}
.animate-fade-in-out {
  animation: fadeInOut 2s ease-in-out;
}
.animate-fade-out {
  animation: fadeOut 0.3s ease-out forwards;
}
`;

// Create a more robust scroll hook with multiple fallbacks
const useScrollToBottom = (dependencies = []) => {
  const endRef = useRef(null);
  const scrollableRef = useRef(null);
  const isScrollingRef = useRef(false);

  const scrollToBottom = useCallback((options = { force: true, smooth: true }) => {
    if (!endRef.current) return;
    
    if (isScrollingRef.current && !options.force) return;
    
    isScrollingRef.current = true;
    
    // Get the scrollable container reference
    const scrollable = scrollableRef.current || endRef.current.parentElement;
    scrollableRef.current = scrollable;
    
    // Always force scroll for now since user is having issues
    const shouldScroll = true;
    
    if (shouldScroll) {
      // First method: Use scrollIntoView with options
      try {
        // Immediate non-animated scroll first to ensure position
        endRef.current.scrollIntoView(false);
        
        // Then try smooth scroll for better UX
        if (options.smooth) {
          endRef.current.scrollIntoView({
            behavior: "smooth",
            block: "end",
            inline: "nearest"
          });
        }
      } catch (error) {
        console.warn("Smooth scrolling failed, trying alternatives", error);
      }
      
      // Second method: Direct scrollTop as fallback
      try {
        if (scrollable) {
          // First immediate jump to ensure position
          scrollable.scrollTop = scrollable.scrollHeight;
          
          // For some browsers that handle scroll differently
          setTimeout(() => {
            scrollable.scrollTop = scrollable.scrollHeight + 1000; // Extra padding to ensure it reaches bottom
            isScrollingRef.current = false;
          }, 50);
        }
      } catch (error) {
        console.warn("Direct scrollTop failed", error);
      }
      
      // Third method: Use window.scrollTo as final fallback
      try {
        window.scrollTo(0, document.body.scrollHeight);
      } catch (error) {
        console.warn("Window scrollTo failed", error);
      }
      
      // Final cleanup
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 300);
    }
  }, []);

  // Effect to scroll when dependencies change
  useEffect(() => {
    // Immediate scroll
    scrollToBottom({ force: true, smooth: false });
    
    // Followed by a smooth scroll
    setTimeout(() => {
      scrollToBottom({ force: true, smooth: true });
    }, 50);
    
    // Additional scroll after animations might have finished
    setTimeout(() => {
      scrollToBottom({ force: true, smooth: false });
    }, 300);
    
    // Final scroll to catch any late-loading content
    setTimeout(() => {
      scrollToBottom({ force: true, smooth: false });
    }, 1000);
    
  }, [...dependencies]);

  return { endRef, scrollToBottom };
};

const ChatWidget = ({
  primaryColor = '#6366F1', // Indigo
  secondaryColor = '#FFFFFF',
  logo = null,
  position = 'bottom-right'
}) => {
  const prefersReducedMotion = useReducedMotion();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      type: 'bot',
      text: 'Hello! How can I help you today?',
      options: [
        'Book A Demo',
        'Services',
        'Generate Leads',
        'Leads',
        'Ask a Question',
        'Pricing'
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [formStep, setFormStep] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [hasSubmittedForm, setHasSubmittedForm] = useState(false);
  
  // Remove messagesEndRef from here since it's now provided by the useScrollToBottom hook
  const recordingIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Use our custom scroll hook, passing messages dependency
  const { endRef: messagesEndRef, scrollToBottom } = useScrollToBottom([messages]);

  // Memoize animations and transitions based on reduced motion preferences
  const buttonAnimation = useMemo(() => ({
    whileHover: !prefersReducedMotion ? { 
      scale: 1.1, 
      rotate: 5, 
      boxShadow: "0 20px 25px -5px rgba(124, 58, 237, 0.5), 0 10px 10px -5px rgba(124, 58, 237, 0.2)"
    } : {},
    whileTap: !prefersReducedMotion ? { scale: 0.95 } : {},
  }), [prefersReducedMotion]);

  const chatAnimations = useMemo(() => ({
    initial: prefersReducedMotion 
      ? { opacity: 0 } 
      : { opacity: 0, y: 20, scale: 0.95 },
    animate: prefersReducedMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, scale: 1 },
    exit: prefersReducedMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 20, scale: 0.95 },
    transition: prefersReducedMotion
      ? { duration: 0.2 }
      : { type: "spring", stiffness: 300, damping: 25 }
  }), [prefersReducedMotion]);

  const handleSendMessage = useCallback(async (e) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', text: inputValue }]);
    setInputValue('');
    
    // Call scrollToBottom with force option after adding user message
    scrollToBottom({ force: true });

    if (formStep) {
      // Handle form step responses
      switch (formStep) {
        case 'name':
          setFormData(prev => ({ ...prev, name: inputValue }));
          setFormStep('email');
          setMessages(prev => [...prev, {
            type: 'bot',
            text: 'Please enter your email:',
            isFormStep: true
          }]);
          scrollToBottom({ force: true });
          break;

        case 'email':
          setFormData(prev => ({ ...prev, email: inputValue }));
          setFormStep('phone');
          setMessages(prev => [...prev, {
            type: 'bot',
            text: 'Please enter your phone number:',
            isFormStep: true
          }]);
          scrollToBottom({ force: true });
          break;

        case 'phone':
          // Update formData with the phone number
          const updatedFormData = {
            ...formData,
            phone: inputValue
          };

          // Submit the form data to database
          try {
            setIsLoading(true);
            const formResponse = await fetch(`${API_BASE_URL}/form`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedFormData),
            });

            if (!formResponse.ok) {
              throw new Error('Failed to submit form');
            }

            setHasSubmittedForm(true);
            
            setMessages(prev => [...prev, {
              type: 'bot',
              text: 'Thanks for contacting us, we will reach you soon.'
            }]);
            scrollToBottom({ force: true });
            
            const recentOptions = [...messages].reverse().find(msg => 
              msg.type === 'user' && ['Book A Demo', 'Services', 'Pricing', 'Generate Leads', 'Leads'].includes(msg.text)
            );
            
            const lastOption = recentOptions ? recentOptions.text : '';
            
            if (lastOption === 'Services') {
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: 'Redirecting you to our services page...' 
              }]);
              scrollToBottom({ force: true });
              
              // Use requestIdleCallback if available for non-critical redirects
              const redirect = () => window.location.href = '/services';
              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => setTimeout(redirect, 1500));
              } else {
                setTimeout(redirect, 1500);
              }
              setFormStep(null);
              return;
            } else if (lastOption === 'Pricing') {
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: 'Redirecting you to our pricing page...' 
              }]);
              scrollToBottom({ force: true });
              
              // Use requestIdleCallback if available for non-critical redirects
              const redirect = () => window.location.href = '/pricing';
              if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => setTimeout(redirect, 1500));
              } else {
                setTimeout(redirect, 1500);
              }
              setFormStep(null);
              return;
            } else if (lastOption === 'Generate Leads' || lastOption === 'Leads') {
              setFormStep('url');
              setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Please enter the website URL to generate leads:',
                isLeadGeneration: true
              }]);
            } else {
              setFormStep(null);
            }
            scrollToBottom({ force: true });
          } catch (error) {
            console.error('Form submission error:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              text: 'Sorry, there was an error submitting your information. Please try again later.'
            }]);
            scrollToBottom({ force: true });
            setFormStep(null);
            setFormData({ name: '', email: '', phone: '' });
          } finally {
            setIsLoading(false);
          }
          break;

        case 'url':
          setIsLoading(true);
          setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
          scrollToBottom({ force: true });

          try {
            const response = await fetch(`${API_BASE_URL}/generate-leads`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: inputValue }),
            });

            if (!response.ok) {
              throw new Error('Failed to generate leads');
            }

            const data = await response.json();

            if (data.success && data.leads && 
                ((data.leads.emails && data.leads.emails.length > 0) || 
                 (data.leads.phones && data.leads.phones.length > 0) || 
                 (data.leads.locations && data.leads.locations.length > 0))) {
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages.pop();
                return [...newMessages, {
                  type: 'bot',
                  text: 'Here are the leads I found:',
                  leads: {
                    emails: data.leads.emails || [],
                    phones: data.leads.phones || [],
                    locations: data.leads.locations || []
                  }
                }];
              });
            } else {
              throw new Error(data.error || 'No leads found');
            }
            scrollToBottom({ force: true });
          } catch (error) {
            console.error('Error:', error);
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages.pop();
              return [...newMessages, {
                type: 'bot',
                text: `I couldn't find any leads on that website. Please check the URL and try again, or try a different website.`
              }];
            });
            scrollToBottom({ force: true });
          } finally {
            setIsLoading(false);
            setFormStep(null);
            setFormData({ name: '', email: '', phone: '' });
          }
          break;
      }
    } else if (messages[messages.length - 1].isLeadGeneration) {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
      scrollToBottom({ force: true });

      try {
        const response = await fetch(`${API_BASE_URL}/generate-leads`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: inputValue }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate leads');
        }

        const data = await response.json();

        if (data.success && data.leads && 
            ((data.leads.emails && data.leads.emails.length > 0) || 
             (data.leads.phones && data.leads.phones.length > 0) || 
             (data.leads.locations && data.leads.locations.length > 0))) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop();
            return [...newMessages, {
              type: 'bot',
              text: 'Here are the leads I found:',
              leads: {
                emails: data.leads.emails || [],
                phones: data.leads.phones || [],
                locations: data.leads.locations || []
              }
            }];
          });
        } else {
          throw new Error(data.error || 'No leads found');
        }
        scrollToBottom({ force: true });
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop();
          return [...newMessages, {
            type: 'bot',
            text: `I couldn't find any leads on that website. Please check the URL and try again, or try a different website.`
          }];
        });
        scrollToBottom({ force: true });
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
      scrollToBottom({ force: true });

      try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: inputValue }),
        });

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();

        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop();

          if (data.type === 'redirect') {
            setTimeout(() => {
              window.location.href = data.url;
            }, 1000);

            return [
              ...newMessages,
              { type: 'bot', text: `Redirecting you to ${data.url}...` }
            ];
          } else if (data.type === 'text') {
            return [
              ...newMessages,
              { type: 'bot', text: data.message }
            ];
          } else {
            return [
              ...newMessages,
              { type: 'bot', text: '⚠️ Unknown response type.' }
            ];
          }
        });

        scrollToBottom({ force: true });
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop();
          return [
            ...newMessages,
            { type: 'bot', text: '❌ Failed to fetch response from server.' }
          ];
        });
        scrollToBottom({ force: true });
      } finally {
        setIsLoading(false);
      }
    }
  }, [formData, formStep, inputValue, messages, scrollToBottom]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  }, [handleSendMessage]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.wav');

        try {
          setIsVoiceLoading(true);
          const response = await fetch(`${API_BASE_URL}/transcribe`, {
            method: 'POST',
            mode: 'cors',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          if (data.text) {
            setInputValue(data.text);
            // Use requestAnimationFrame for smoother UI updates
            requestAnimationFrame(() => {
              setTimeout(() => {
                handleSendMessage();
              }, 800);
            });
          }
        } catch (error) {
          console.error('Error sending audio:', error);
          setMessages(prev => [...prev, {
            type: 'bot',
            text: `Sorry, there was an error transcribing your voice message: ${error.message}`
          }]);
        } finally {
          setIsVoiceLoading(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Sorry, I could not access your microphone. Please check your permissions.'
      }]);
    }
  }, [handleSendMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleOptionClick = useCallback((option) => {
    setMessages(prev => [...prev, { type: 'user', text: option }]);
    scrollToBottom({ force: true });

    if (['Book A Demo', 'Services', 'Pricing', 'Generate Leads', 'Leads'].includes(option)) {
      if (hasSubmittedForm) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: 'Thanks for contacting us, we will reach you soon.'
        }]);
        
        if (option === 'Generate Leads' || option === 'Leads') {
          setFormStep('url');
          setMessages(prev => [...prev, {
            type: 'bot',
            text: 'Please enter the website URL to generate leads:',
            isLeadGeneration: true
          }]);
        } else if (option === 'Services') {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Redirecting you to our services page...' 
          }]);
          scrollToBottom({ force: true });
          setTimeout(() => {
            window.location.href = '/services';
          }, 1500);
        } else if (option === 'Pricing') {
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Redirecting you to our pricing page...' 
          }]);
          scrollToBottom({ force: true });
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 1500);
        }
      } else {
        setFormStep('name');
        setMessages(prev => [...prev, {
          type: 'bot',
          text: 'Please enter your name:',
          isFormStep: true
        }]);
      }
      scrollToBottom({ force: true });
    } else {
      // Use requestAnimationFrame for smoother UI updates
      requestAnimationFrame(() => {
        setTimeout(() => {
          let response = '';
          switch (option) {
            case 'Ask a Question':
              response = 'Feel free to ask any question! I\'m here to help.';
              break;
            default:
              response = 'How can I assist you with that?';
          }
          setMessages(prev => [...prev, { type: 'bot', text: response }]);
          scrollToBottom({ force: true });
        }, 1000);
      });
    }
  }, [hasSubmittedForm, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const positionClasses = useMemo(() => ({
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4'
  }), []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className={`chat-widget-container ${positionClasses[position]}`}>
      <style>{fadeInOutKeyframes}</style>
      
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-16 h-16 rounded-full 
          shadow-lg hover:shadow-2xl 
          flex items-center justify-center 
          transition-all duration-300 
          hover:scale-110 hover:rotate-12
          bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500
          animate-pulse
          group
          relative
          overflow-hidden
        `}
        {...buttonAnimation}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />

        {logo ? (
          <motion.img 
            src={logo} 
            alt="Chat Logo" 
            className="w-10 h-10 group-hover:scale-110 transition-transform duration-300"
            initial={{ rotate: 0 }}
            animate={{ rotate: isOpen && !prefersReducedMotion ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            initial={{ rotate: 0 }}
            animate={{ rotate: isOpen && !prefersReducedMotion ? 360 : 0 }}
            transition={{ duration: 0.5 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </motion.svg>
        )}
      </motion.button>

      <AnimatePresence mode="wait">
        {isOpen && (
          <motion.div 
            className="fixed bottom-20 right-4 w-96 h-[600px] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 border border-white/20"
            initial={chatAnimations.initial}
            animate={chatAnimations.animate}
            exit={chatAnimations.exit}
            transition={chatAnimations.transition}
            layout
            onAnimationComplete={() => scrollToBottom({ force: true })}
          >
            <ChatHeader logo={logo} onClose={() => setIsOpen(false)} />
            
            <motion.div 
              className="h-[calc(100%-120px)] p-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50 chat-scrollbar backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              onAnimationComplete={() => scrollToBottom({ force: true })}
            >
              {messages.map((message, index) => (
                <ChatMessage
                  key={`msg-${index}-${message.type}`}
                  message={message}
                  onOptionClick={handleOptionClick}
                  onAnimationComplete={index === messages.length - 1 ? 
                    () => scrollToBottom({ force: true }) : undefined}
                />
              ))}
              <div 
                ref={messagesEndRef} 
                style={{ 
                  height: 20, 
                  width: '100%', 
                  float: 'left', 
                  clear: 'both' 
                }} 
                aria-hidden="true"
              />
            </motion.div>

            <motion.div 
              className="absolute bottom-0 left-0 right-0 py-2 px-3 bg-white/80 backdrop-blur-sm border-t border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <div className="relative flex-1">
                  <motion.input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isVoiceLoading ? "Transcribing your voice..." : "Type your message..."}
                    className={`chat-input ${isVoiceLoading ? 'pr-10 border-2 border-indigo-400 border-opacity-70 animate-pulse' : ''}`}
                    disabled={isVoiceLoading}
                    initial={prefersReducedMotion ? {} : { width: "80%" }}
                    animate={prefersReducedMotion ? {} : { width: "100%" }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                  />
                  {isVoiceLoading && (
                    <>
                      <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/10 via-purple-400/10 to-pink-400/10 animate-gradient-x rounded-full"></div>
                      </div>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-blue-500 border-solid rounded-full animate-spin border-t-transparent border-r-indigo-400 border-b-purple-500 border-l-pink-500"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <motion.button
                  type="button"
                  onClick={toggleRecording}
                  className={`microphone-button ${isRecording ? 'recording' : ''}`}
                  disabled={isVoiceLoading}
                  whileHover={!prefersReducedMotion ? { scale: 1.1 } : {}}
                  whileTap={!prefersReducedMotion ? { scale: 0.9 } : {}}
                  aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                >
                  {isRecording ? (
                    <div className="recording-indicator">
                      <div className="wave-animation">
                        <motion.div 
                          className="wave-bar"
                          animate={prefersReducedMotion ? { opacity: [0.5, 1, 0.5] } : { height: ["30%", "100%", "30%"] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <motion.div 
                          className="wave-bar"
                          animate={prefersReducedMotion ? { opacity: [0.5, 1, 0.5] } : { height: ["50%", "80%", "50%"] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                        />
                        <motion.div 
                          className="wave-bar"
                          animate={prefersReducedMotion ? { opacity: [0.5, 1, 0.5] } : { height: ["70%", "30%", "70%"] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                        />
                      </div>
                      <span className="recording-time">{formatTime(recordingTime)}</span>
                    </div>
                  ) : isVoiceLoading ? (
                    <div className="h-6 w-6 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full opacity-30 animate-pulse"></div>
                      <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-r-indigo-400 border-b-purple-500 border-l-pink-500 animate-spin"></div>
                    </div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="microphone-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                  )}
                </motion.button>
                <motion.button
                  type="submit"
                  className="send-button"
                  disabled={!inputValue.trim() || isVoiceLoading}
                  whileHover={!prefersReducedMotion ? { scale: 1.1, rotate: 5 } : {}}
                  whileTap={!prefersReducedMotion ? { scale: 0.9 } : {}}
                  aria-label="Send message"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="send-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(ChatWidget); 