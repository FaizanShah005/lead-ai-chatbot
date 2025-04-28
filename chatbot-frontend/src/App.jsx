import ChatWidget from './components/ChatWidget'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import Pricing from "./pages/Pricing";







function App() {
  return (
    <div className="min-h-screen bg-gray-100">
          <Router>



{/*             
      <h1 className="text-3xl font-bold text-center p-8">
        Welcome to Chatbot Widget Demo
      </h1> */}
      <ChatWidget
        primaryColor="#4F46E5" 
        secondaryColor="#FFFFFF"
        position="bottom-right"
        
      />
      <Navbar />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/services" element={<Services />} />
        <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </Router>
     
    </div>
  )
}

export default App
