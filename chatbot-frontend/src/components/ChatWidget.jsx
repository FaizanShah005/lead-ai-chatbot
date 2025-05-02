import { useState, useRef, useEffect } from 'react';
// import './ChatWidget.css';

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

const ChatWidget = ({
  primaryColor = '#6366F1', // Indigo
  secondaryColor = '#FFFFFF',
  logo = null,
  position = 'bottom-right'
}) => {
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
  const [leadsData, setLeadsData] = useState(null);
  const messagesEndRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end"
      });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message to chat
    setMessages(prev => [...prev, { type: 'user', text: inputValue }]);
    setInputValue('');
    scrollToBottom();

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
          scrollToBottom();
          break;

        case 'email':
          setFormData(prev => ({ ...prev, email: inputValue }));
          setFormStep('phone');
          setMessages(prev => [...prev, {
            type: 'bot',
            text: 'Please enter your phone number:',
            isFormStep: true
          }]);
          scrollToBottom();
          break;

        case 'phone':
          // Update formData with the phone number
          const updatedFormData = {
            ...formData,
            phone: inputValue
          };

          // Submit the form data to database
          try {
            const formResponse = await fetch('http://localhost:5000/form', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedFormData),
            });

            if (!formResponse.ok) {
              throw new Error('Failed to submit form');
            }

            setHasSubmittedForm(true); // Set form as submitted after successful submission
            
            // Show thank you message after successful form submission
            setMessages(prev => [...prev, {
              type: 'bot',
              text: 'Thanks for contacting us, we will reach you soon.'
            }]);
            scrollToBottom();
            
            // Find the last option that user selected from the messages
            const recentOptions = [...messages].reverse().find(msg => 
              msg.type === 'user' && ['Book A Demo', 'Services', 'Pricing', 'Generate Leads', 'Leads'].includes(msg.text)
            );
            
            const lastOption = recentOptions ? recentOptions.text : '';
            
            // Handle redirection based on the last selected option
            if (lastOption === 'Services') {
              // Add redirection message immediately after thank you
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: 'Redirecting you to our services page...' 
              }]);
              scrollToBottom();
              
              // Redirect after a short delay
              setTimeout(() => {
                window.location.href = '/services';
              }, 1500);
              setFormStep(null);
              return;
            } else if (lastOption === 'Pricing') {
              // Add redirection message immediately after thank you
              setMessages(prev => [...prev, { 
                type: 'bot', 
                text: 'Redirecting you to our pricing page...' 
              }]);
              scrollToBottom();
              
              // Redirect after a short delay
              setTimeout(() => {
                window.location.href = '/pricing';
              }, 1500);
              setFormStep(null);
              return;
            } else if (lastOption === 'Generate Leads' || lastOption === 'Leads') {
              // For lead generation, continue with URL step
              setFormStep('url');
              setMessages(prev => [...prev, {
                type: 'bot',
                text: 'Please enter the website URL to generate leads:',
                isLeadGeneration: true
              }]);
            } else {
              // Otherwise, reset form step
              setFormStep(null);
            }
            scrollToBottom();
          } catch (error) {
            console.error('Form submission error:', error);
            setMessages(prev => [...prev, {
              type: 'bot',
              text: 'Sorry, there was an error submitting your information. Please try again later.'
            }]);
            scrollToBottom();
            setFormStep(null);
            setFormData({ name: '', email: '', phone: '' });
          }
          break;

        case 'url':
          // Handle lead generation
          setIsLoading(true);
          setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
          scrollToBottom();

          try {
            const response = await fetch('http://localhost:5000/generate-leads', {
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
            console.log('Received leads data:', data);

            if (data.success && data.leads && 
                ((data.leads.emails && data.leads.emails.length > 0) || 
                 (data.leads.phones && data.leads.phones.length > 0) || 
                 (data.leads.locations && data.leads.locations.length > 0))) {
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages.pop(); // Remove loading message
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
            scrollToBottom();
          } catch (error) {
            console.error('Error:', error);
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages.pop(); // Remove loading message
              return [...newMessages, {
                type: 'bot',
                text: `I couldn't find any leads on that website. Please check the URL and try again, or try a different website.`
              }];
            });
            scrollToBottom();
          } finally {
            setIsLoading(false);
            setFormStep(null);
            setFormData({ name: '', email: '', phone: '' });
          }
          break;
      }
    } else if (messages[messages.length - 1].isLeadGeneration) {
      // Handle lead generation
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
      scrollToBottom();

      try {
        const response = await fetch('http://localhost:5000/generate-leads', {
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
        console.log('Received leads data:', data); // Debug log

        if (data.success && data.leads && 
            ((data.leads.emails && data.leads.emails.length > 0) || 
             (data.leads.phones && data.leads.phones.length > 0) || 
             (data.leads.locations && data.leads.locations.length > 0))) {
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages.pop(); // Remove loading message
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
        scrollToBottom();
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove loading message
          return [...newMessages, {
            type: 'bot',
            text: `I couldn't find any leads on that website. Please check the URL and try again, or try a different website.`
          }];
        });
        scrollToBottom();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Handle normal chat messages
      setIsLoading(true);
      setMessages(prev => [...prev, { type: 'bot', text: '', isLoading: true }]);
      scrollToBottom();

      try {
        const response = await fetch('http://localhost:5000/chat', {
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
          newMessages.pop(); // Remove loading message

          if (data.type === 'redirect') {
            // Redirect with message
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

        scrollToBottom();
      } catch (error) {
        console.error('Error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages.pop(); // Remove loading message
          return [
            ...newMessages,
            { type: 'bot', text: '❌ Failed to fetch response from server.' }
          ];
        });
        scrollToBottom();
      }
      finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const startRecording = async () => {
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
          setIsVoiceLoading(true); // Start voice loading state
          const response = await fetch('http://localhost:5000/transcribe', {
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
            // Auto submit the form after a short delay to let user see the transcription
            setTimeout(() => {
              const event = new Event('submit', { cancelable: true });
              document.querySelector('.chat-input-form').dispatchEvent(event);
            }, 800);
          }
        } catch (error) {
          console.error('Error sending audio:', error);
          setMessages(prev => [...prev, {
            type: 'bot',
            text: `Sorry, there was an error transcribing your voice message: ${error.message}`
          }]);
        } finally {
          setIsVoiceLoading(false); // End voice loading state
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
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleOptionClick = (option) => {
    // Add user's selection as a message
    setMessages(prev => [...prev, { type: 'user', text: option }]);
    scrollToBottom();

    // Start form collection for specific options (now includes Services and Pricing)
    if (['Book A Demo', 'Services', 'Pricing', 'Generate Leads', 'Leads'].includes(option)) {
      if (hasSubmittedForm) {
        // If user has already submitted form, show thanks message again
        setMessages(prev => [...prev, {
          type: 'bot',
          text: 'Thanks for contacting us, we will reach you soon.'
        }]);
        
        // Only for lead generation options, proceed to URL step
        if (option === 'Generate Leads' || option === 'Leads') {
          setFormStep('url');
          setMessages(prev => [...prev, {
            type: 'bot',
            text: 'Please enter the website URL to generate leads:',
            isLeadGeneration: true
          }]);
        } else if (option === 'Services') {
          // Direct redirection for Services after user has submitted form before
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Redirecting you to our services page...' 
          }]);
          scrollToBottom();
          setTimeout(() => {
            window.location.href = '/services';
          }, 1500);
        } else if (option === 'Pricing') {
          // Direct redirection for Pricing after user has submitted form before
          setMessages(prev => [...prev, { 
            type: 'bot', 
            text: 'Redirecting you to our pricing page...' 
          }]);
          scrollToBottom();
          setTimeout(() => {
            window.location.href = '/pricing';
          }, 1500);
        }
      } else {
        // If user hasn't submitted form yet, start form collection
        setFormStep('name');
        setMessages(prev => [...prev, {
          type: 'bot',
          text: 'Please enter your name:',
          isFormStep: true
        }]);
      }
      scrollToBottom();
    } else {
      // Handle other options normally
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
        scrollToBottom();
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const positionClasses = {
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4'
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`chat-widget-container ${positionClasses[position]}`}>
      {/* Add animation styles */}
      <style>{fadeInOutKeyframes}</style>
      
      {/* Chat Icon Button */}
      <button
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
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />

        {logo ? (
          <img src={logo} alt="Chat Logo" className="w-10 h-10 group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 animate-fade-in border border-white/20">
          {/* Modal Header */}
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
              onClick={() => setIsOpen(false)}
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

          {/* Chat Messages Area */}
          <div className="h-[calc(100%-120px)] p-4 overflow-y-auto bg-gradient-to-b from-gray-50/50 to-white/50 chat-scrollbar backdrop-blur-sm">

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 relative ${message.type === 'user'
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
                        <p className={`${message.type === 'user'
                            ? 'text-white drop-shadow-sm'
                            : 'text-gray-800'
                          } break-words whitespace-pre-wrap`}>
                          {message.text}
                        </p>
                        {message.leads && (
                          <div className="mt-3 space-y-4 relative rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 border border-indigo-100/50 shadow-sm">
                            {/* Copy button */}
                            <button 
                              onClick={() => {
                                const content = [
                                  message.leads.emails.length > 0 ? `Emails:\n${message.leads.emails.join('\n')}` : '',
                                  message.leads.phones.length > 0 ? `\nPhone Numbers:\n${message.leads.phones.join('\n')}` : '',
                                  message.leads.locations.length > 0 ? `\nLocations:\n${message.leads.locations.join('\n')}` : ''
                                ].filter(Boolean).join('\n');
                                navigator.clipboard.writeText(content);
                                
                                // Show a mini toast notification
                                const toast = document.createElement('div');
                                toast.className = 'fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
                                toast.textContent = 'Lead data copied to clipboard!';
                                document.body.appendChild(toast);
                                setTimeout(() => {
                                  toast.classList.add('animate-fade-out');
                                  setTimeout(() => document.body.removeChild(toast), 300);
                                }, 2000);
                              }}
                              className="absolute top-2 right-2 bg-white hover:bg-indigo-50 text-indigo-600 p-1.5 rounded-full shadow-sm hover:shadow-md transition-all duration-200"
                              title="Copy all lead data"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                            
                            <h3 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                              </svg>
                              Lead Generation Results
                            </h3>
                            
                            {message.leads.emails.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-blue-700">Emails</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100">
                                  {message.leads.emails.map((email, i) => (
                                    <div key={i} className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex items-center gap-1">
                                      <span>{email}</span>
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(email);
                                          // Small visual feedback
                                          const btn = event.currentTarget;
                                          btn.classList.add('scale-110');
                                          setTimeout(() => btn.classList.remove('scale-110'), 200);
                                        }}
                                        className="ml-1 opacity-70 hover:opacity-100"
                                        title="Copy email"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.leads.phones.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-green-700">Phone Numbers</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-100">
                                  {message.leads.phones.map((phone, i) => (
                                    <div key={i} className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex items-center gap-1">
                                      <span>{phone}</span>
                                      <button 
                                        onClick={() => {
                                          navigator.clipboard.writeText(phone);
                                          // Small visual feedback
                                          const btn = event.currentTarget;
                                          btn.classList.add('scale-110');
                                          setTimeout(() => btn.classList.remove('scale-110'), 200);
                                        }}
                                        className="ml-1 opacity-70 hover:opacity-100"
                                        title="Copy phone"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {message.leads.locations.length > 0 && (
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span className="text-xs font-semibold text-purple-700">Locations</span>
                                </div>
                                <div className="flex flex-col gap-1.5 bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded-lg border border-purple-100">
                                  {message.leads.locations.map((location, i) => (
                                    <div key={i} className="w-full group relative hover:z-10">
                                      <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex justify-between items-center">
                                        <span className="break-words whitespace-normal">{location}</span>
                                        <button 
                                          onClick={() => {
                                            navigator.clipboard.writeText(location);
                                            // Small visual feedback
                                            const btn = event.currentTarget;
                                            btn.classList.add('scale-110');
                                            setTimeout(() => btn.classList.remove('scale-110'), 200);
                                          }}
                                          className="ml-1 opacity-70 hover:opacity-100 flex-shrink-0"
                                          title="Copy location"
                                        >
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {message.options && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {message.options.map((option, optionIndex) => (
                              <button
                                key={optionIndex}
                                onClick={() => handleOptionClick(option)}
                                className="px-4 py-2 bg-white/90 cursor-pointer hover:bg-white text-gray-700 rounded-full text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 hover:border-gray-200"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className={`absolute inset-0 rounded-3xl overflow-hidden ${message.type === 'user' ? 'opacity-30' : 'opacity-20'
                    }`}>
                    <div className={`absolute inset-0 bg-gradient-to-r ${message.type === 'user'
                        ? 'from-blue-500/40 via-cyan-500/40 to-blue-500/40'
                        : 'from-gray-300/40 via-gray-200/40 to-gray-300/40'
                      } animate-gradient-x`} />
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Area */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-sm border-t border-white/20">
            <form onSubmit={handleSendMessage} className="chat-input-form">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isVoiceLoading ? "Transcribing your voice..." : "Type your message..."}
                  className={`chat-input ${isVoiceLoading ? 'pr-10 border-2 border-indigo-400 border-opacity-70 animate-pulse' : ''}`}
                  disabled={isVoiceLoading}
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
              <button
                type="button"
                onClick={toggleRecording}
                className={`microphone-button ${isRecording ? 'recording' : ''}`}
                disabled={isVoiceLoading}
              >
                {isRecording ? (
                  <div className="recording-indicator">
                    <div className="wave-animation">
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
                      <div className="wave-bar"></div>
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
              </button>
              <button
                type="submit"
                className="send-button"
                disabled={!inputValue.trim() || isVoiceLoading}
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
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget; 