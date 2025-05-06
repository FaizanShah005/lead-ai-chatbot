import React from 'react';

const LeadDisplay = ({ leads }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show a mini toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in-out';
    toast.textContent = 'Copied to clipboard!';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('animate-fade-out');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
  };

  const copyAllLeads = () => {
    const content = [
      leads.emails.length > 0 ? `Emails:\n${leads.emails.join('\n')}` : '',
      leads.phones.length > 0 ? `\nPhone Numbers:\n${leads.phones.join('\n')}` : '',
      leads.locations.length > 0 ? `\nLocations:\n${leads.locations.join('\n')}` : ''
    ].filter(Boolean).join('\n');
    copyToClipboard(content);
  };

  return (
    <div className="mt-3 space-y-4 relative rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 p-4 border border-indigo-100/50 shadow-sm">
      {/* Copy button */}
      <button 
        onClick={copyAllLeads}
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
      
      {leads.emails.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold text-blue-700">Emails</span>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded-lg border border-blue-100">
            {leads.emails.map((email, i) => (
              <div key={i} className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex items-center gap-1">
                <span>{email}</span>
                <button 
                  onClick={() => copyToClipboard(email)}
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
      
      {leads.phones.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span className="text-xs font-semibold text-green-700">Phone Numbers</span>
          </div>
          <div className="flex flex-wrap gap-1.5 bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-100">
            {leads.phones.map((phone, i) => (
              <div key={i} className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex items-center gap-1">
                <span>{phone}</span>
                <button 
                  onClick={() => copyToClipboard(phone)}
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
      
      {leads.locations.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-semibold text-purple-700">Locations</span>
          </div>
          <div className="flex flex-col gap-1.5 bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded-lg border border-purple-100">
            {leads.locations.map((location, i) => (
              <div key={i} className="w-full group relative hover:z-10">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-md text-xs font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-default flex justify-between items-center">
                  <span className="break-words whitespace-normal">{location}</span>
                  <button 
                    onClick={() => copyToClipboard(location)}
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
  );
};

export default LeadDisplay; 