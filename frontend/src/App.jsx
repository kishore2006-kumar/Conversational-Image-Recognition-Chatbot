import React, { useState, useRef, useEffect } from 'react';
import { Upload, Send, Mic, Image as ImageIcon, Loader2, RefreshCcw, Plus, MessageSquare, Sun, Moon, User, LogOut, Eye, EyeOff, LogIn } from 'lucide-react';

// --- Theme Engine ---
const getTheme = (isDark) => {
  if (isDark) {
    return {
      colors: {
        bg: '#1a1b1e', 
        textMain: '#f0f0f0', 
        textLight: '#8b909a', 
        accent: '#00e5ff', 
        micBtn: '#ff5252', 
        sendBtn: '#3182ce', 
        micActive: '#00e5ff',
        googleBtnBg: '#ffffff', 
        googleBtnText: '#000000',
        inverseBtnBg: '#e0e5ec', 
        inverseBtnColor: '#4a5568',
        // Soft Pastel (Dark Mode)
        userBubbleBg: '#4fd1c5', // Muted Cyan
        userBubbleText: '#1a202c', // Very Dark Text for contrast
        aiBubbleBg: '#4a5568', // Lightened Ash Grey
        aiBubbleText: '#f0f0f0', 
      },
      shadows: {
        raised: '8px 8px 16px #0b0c0d, -8px -8px 16px #292a2f',
        sunken: 'inset 6px 6px 12px #0b0c0d, inset -6px -6px 12px #292a2f',
        bubbleUser: '4px 4px 15px rgba(79, 209, 197, 0.3)', 
        bubbleAI: '4px 4px 15px rgba(0, 0, 0, 0.4)',
        glowActive: '0 0 15px rgba(0, 229, 255, 0.5), inset 2px 2px 5px rgba(255,255,255,0.1)',
        inverseRaised: 'none' 
      }
    };
  }
  return {
    colors: {
      bg: '#e0e5ec', 
      textMain: '#4a5568',
      textLight: '#a3b1c6',
      accent: '#3182ce',
      micBtn: '#e53e3e', 
      sendBtn: '#3182ce', 
      micActive: '#00e5ff',
      googleBtnBg: '#1a1b1e', 
      googleBtnText: '#ffffff',
      inverseBtnBg: '#1a1b1e', 
      inverseBtnColor: '#f0f0f0',
      // Soft Pastel (Light Mode)
      userBubbleBg: '#7f9cf5', // Soft Indigo
      userBubbleText: '#ffffff', // White Text
      aiBubbleBg: '#c3cbdc', // Darkened Slate Blue
      aiBubbleText: '#1a202c', 
    },
    shadows: {
      raised: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255, 0.5)',
      sunken: 'inset 6px 6px 10px 0 rgba(163,177,198, 0.7), inset -6px -6px 10px 0 rgba(255,255,255, 0.8)',
      bubbleUser: '4px 4px 15px rgba(127, 156, 245, 0.3)',
      bubbleAI: '4px 4px 15px rgba(163,177,198, 0.4)',
      glowActive: '0 0 15px rgba(0, 229, 255, 0.6), inset 2px 2px 5px rgba(255,255,255,0.5)',
      inverseRaised: 'none' 
    }
  };
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // --- REAL AUTH STATE ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [authScreen, setAuthScreen] = useState('none'); 
  const [showPassword, setShowPassword] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [authError, setAuthError] = useState('');

  const theme = getTheme(isDarkMode);

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0]);
  
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const textareaRef = useRef(null);
  
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafIdRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const silenceTimerRef = useRef(null); 

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (authScreen !== 'none') return;
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          handleImageSelection(items[i].getAsFile());
          break; 
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [authScreen]);

  const fetchUserHistory = async (username) => {
    try {
      const res = await fetch(`http://localhost:8000/api/v1/history/${username}`);
      const data = await res.json();
      if (data.history) setChatHistory(data.history);
    } catch (err) {
      console.error("Failed to fetch history");
    }
  };

  const handleImageSelection = (file) => {
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleTextareaInput = (e) => {
    setPrompt(e.target.value);
    e.target.style.height = 'auto'; 
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`; 
  };

  const handleNewSession = () => {
    setImage(null);
    setPreviewUrl(null);
    setMessages([]);
    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '55px';
  };

  const loadChat = (chat) => {
    setMessages([
      { sender: 'You', text: chat.query },
      { sender: 'AI', text: chat.reply }
    ]);
    setPrompt('');
    if (textareaRef.current) textareaRef.current.style.height = '55px';
  };

  const handleAuthSubmit = async () => {
    setAuthError('');
    if (authScreen === 'register') {
      if (authForm.password !== authForm.confirm) return setAuthError("Passwords do not match");
      if (!authForm.username || !authForm.email || !authForm.password) return setAuthError("Please fill all fields");
      try {
        const res = await fetch('http://localhost:8000/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: authForm.username, email: authForm.email, password: authForm.password })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setIsLoggedIn(true);
          setCurrentUser(data.username);
          setCurrentEmail(data.email);
          setAuthScreen('none');
          fetchUserHistory(data.username);
        } else {
          setAuthError(data.detail);
        }
      } catch (err) {
        setAuthError("Server connection failed");
      }
    } else if (authScreen === 'login') {
      if (!authForm.email || !authForm.password) return setAuthError("Please fill all fields");
      try {
        const res = await fetch('http://localhost:8000/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authForm.email, password: authForm.password })
        });
        const data = await res.json();
        if (data.status === 'success') {
          setIsLoggedIn(true);
          setCurrentUser(data.username);
          setCurrentEmail(data.email);
          setAuthScreen('none');
          fetchUserHistory(data.username);
        } else {
          setAuthError(data.detail);
        }
      } catch (err) {
        setAuthError("Server connection failed");
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser("");
    setCurrentEmail("");
    setChatHistory([]);
    setShowProfileMenu(false);
    setAuthForm({ username: '', email: '', password: '', confirm: '' });
    handleNewSession();
  };

  const startVoiceInput = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Your browser does not support Voice Input.");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 32;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateFrequency = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = [
          dataArray[0] / 2.5, dataArray[2] / 2.5, dataArray[4] / 2.5, 
          dataArray[6] / 2.5, dataArray[8] / 2.5
        ];
        setAudioLevels(levels);
        rafIdRef.current = requestAnimationFrame(updateFrequency);
      };
      updateFrequency();
    } catch (err) {
      console.error("Mic visualizer error:", err);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      setIsListening(true);
      silenceTimerRef.current = setTimeout(() => recognition.stop(), 5000);
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map(r => r[0].transcript).join('');
      setPrompt(transcript);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
      }

      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, 2000); 
    };

    recognition.onend = () => {
      setIsListening(false);
      setAudioLevels([0,0,0,0,0]); 
      clearTimeout(silenceTimerRef.current); 
      
      cancelAnimationFrame(rafIdRef.current);
      if (audioCtxRef.current?.state !== 'closed') audioCtxRef.current?.close();
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());

      setTimeout(() => textareaRef.current?.focus(), 100);
    };
    
    recognition.start();
  };

  const handleSend = async () => {
    if (!image) return alert("Please upload or paste an image first.");
    if (!prompt.trim()) return;
    
    const userMsg = prompt;
    setPrompt(''); 
    if (textareaRef.current) textareaRef.current.style.height = '55px'; 

    setIsLoading(true);
    setMessages(prev => [...prev, { sender: 'You', text: userMsg }]);

    const formData = new FormData();
    formData.append('image', image);
    formData.append('message', userMsg);
    formData.append('username', isLoggedIn ? currentUser : "guest");

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', { method: 'POST', body: formData });
      const data = await res.json();
      
      setMessages(prev => [...prev, { sender: 'AI', text: data.reply }]);
      
      if (messages.length === 0 && isLoggedIn) {
        const words = userMsg.trim().split(/\s+/);
        const titleText = words.slice(0, 4).join(" ") + (words.length > 4 ? "..." : "");
        const newHistoryItem = {
            id: Date.now().toString(),
            title: titleText.charAt(0).toUpperCase() + titleText.slice(1),
            query: userMsg,
            reply: data.reply
        };
        setChatHistory(prev => [newHistoryItem, ...prev]);
      }

      window.speechSynthesis.cancel();
      const speech = new SpeechSynthesisUtterance(data.reply);
      window.speechSynthesis.speak(speech);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'System', text: "Connection Error." }]);
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); 
      handleSend();
    }
  };

  // ==========================================
  // GLOBALLY LOCKED CSS (Fixes all layout tearing)
  // ==========================================
  const layoutStyles = `
    * {
      box-sizing: border-box;
    }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: ${theme.colors.bg};
      transition: background-color 0.3s;
    }
    .main-wrapper {
      display: flex;
      flex-direction: row;
      height: 100vh;
      width: 100%;
      padding: 15px;
      gap: 15px;
    }
    .layout-col {
      border-radius: 25px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      transition: all 0.3s;
    }
    .sidebar { width: 280px; flex-shrink: 0; }
    .vision-panel { width: 320px; flex-shrink: 0; }
    .chat-panel { flex: 1; min-width: 0; position: relative; }
    
    /* Mobile Stacking */
    @media (max-width: 950px) {
      body, html { overflow: auto; }
      .main-wrapper {
        flex-direction: column;
        height: auto;
        min-height: 100vh;
        overflow-y: auto;
      }
      .sidebar, .vision-panel {
        width: 100%;
        height: auto;
        min-height: 300px;
      }
      .chat-panel {
        width: 100%;
        height: 75vh;
        flex: none;
      }
    }
  `;

  return (
    <>
      <style>{layoutStyles}</style>

      {/* --- RENDER: AUTH SCREEN --- */}
      {authScreen !== 'none' ? (
        <div style={{ height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          
          <div style={{ position: 'absolute', top: '25px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{ 
                backgroundColor: theme.colors.inverseBtnBg, borderRadius: '50%', width: '45px', height: '45px', 
                boxShadow: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.colors.inverseBtnColor, transition: 'all 0.3s'
              }}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            <button 
              onClick={() => { setAuthScreen('none'); setAuthError(''); setAuthForm({ username: '', email: '', password: '', confirm: '' }); }}
              style={{ 
                backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '10px 20px', 
                color: theme.colors.textMain, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ 
            backgroundColor: theme.colors.bg, borderRadius: '30px', boxShadow: theme.shadows.raised, 
            padding: '50px 40px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <div style={{ backgroundColor: theme.colors.bg, borderRadius: '50%', padding: '15px', boxShadow: theme.shadows.sunken, marginBottom: '20px' }}>
              <User size={40} color={theme.colors.accent} />
            </div>
            <h2 style={{ color: theme.colors.textMain, fontSize: '1.6rem', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
              {authScreen === 'login' ? 'Sign in to your role' : 'Create Account'}
            </h2>
            
            <div style={{ height: '20px', marginBottom: '15px' }}>
              {authError && <span style={{ color: theme.colors.micBtn, fontSize: '0.9rem', fontWeight: 'bold' }}>{authError}</span>}
            </div>

            {authScreen === 'register' && (
              <input 
                placeholder="Username" 
                value={authForm.username}
                onChange={(e) => setAuthForm({...authForm, username: e.target.value})}
                style={{ 
                  backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.sunken, border: 'none', outline: 'none', 
                  padding: '16px 20px', width: '100%', color: theme.colors.textMain, marginBottom: '20px', fontSize: '1rem'
                }} 
              />
            )}

            <input 
              placeholder="Email Address" 
              value={authForm.email}
              onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
              style={{ 
                backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.sunken, border: 'none', outline: 'none', 
                padding: '16px 20px', width: '100%', color: theme.colors.textMain, marginBottom: '20px', fontSize: '1rem'
              }} 
            />
            
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={authForm.password}
              onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
              style={{ 
                backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.sunken, border: 'none', outline: 'none', 
                padding: '16px 20px', width: '100%', color: theme.colors.textMain, marginBottom: authScreen === 'register' ? '20px' : '15px', fontSize: '1rem'
              }} 
            />

            {authScreen === 'login' && (
              <button 
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  backgroundColor: 'transparent', border: 'none', color: theme.colors.textLight, cursor: 'pointer', 
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '30px', alignSelf: 'flex-start', marginLeft: '5px'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} Show password
              </button>
            )}

            {authScreen === 'register' && (
              <>
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="CONFIRM PASSWORD"
                  value={authForm.confirm}
                  onChange={(e) => setAuthForm({...authForm, confirm: e.target.value})} 
                  style={{ 
                    backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.sunken, border: 'none', outline: 'none', 
                    padding: '16px 20px', width: '100%', color: theme.colors.textMain, marginBottom: '15px', fontSize: '1rem'
                  }} 
                />
                <button 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    backgroundColor: 'transparent', border: 'none', color: theme.colors.textLight, cursor: 'pointer', 
                    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', marginBottom: '30px', alignSelf: 'flex-start', marginLeft: '5px'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />} Show password
                </button>
              </>
            )}

            <button 
              onClick={handleAuthSubmit}
              style={{ 
                backgroundColor: theme.colors.accent, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '16px', 
                color: isDarkMode ? '#1a1b1e' : 'white', fontWeight: 'bold', width: '100%', cursor: 'pointer', fontSize: '1.1rem', marginBottom: '20px'
              }}
            >
              {authScreen === 'login' ? 'Sign In' : 'Register'}
            </button>

            <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: theme.colors.textLight, opacity: 0.3 }}></div>
              <span style={{ color: theme.colors.textLight, fontSize: '0.85rem' }}>OR</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: theme.colors.textLight, opacity: 0.3 }}></div>
            </div>

            <button 
              onClick={() => alert("Google Auth via OAuth 2.0 requires Google Cloud Console setup!")}
              style={{ 
                backgroundColor: theme.colors.googleBtnBg, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '14px', 
                color: theme.colors.googleBtnText, fontWeight: 'bold', width: '100%', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
              }}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <p style={{ color: theme.colors.textLight, marginTop: '25px', fontSize: '0.95rem' }}>
              {authScreen === 'login' ? "Don't have an account? " : "Already have an account? "}
              <span 
                onClick={() => { setAuthScreen(authScreen === 'login' ? 'register' : 'login'); setShowPassword(false); setAuthError(''); setAuthForm({ username: '', email: '', password: '', confirm: '' }); }}
                style={{ color: theme.colors.accent, cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
              >
                {authScreen === 'login' ? "Register" : "Login"}
              </span>
            </p>
          </div>
        </div>
      ) : (
      <>
        {/* --- RENDER: MAIN CHAT APP --- */}
      <div className="main-wrapper">
        
        {/* --- Column 1: Sidebar --- */}
        <div className="layout-col sidebar" style={{ backgroundColor: theme.colors.bg, boxShadow: theme.shadows.raised }}>
          <button 
            onClick={handleNewSession}
            style={{ 
              backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '14px', 
              color: theme.colors.textMain, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', marginBottom: '30px', flexShrink: 0
            }}
          >
            <Plus size={18} /> New Chat
          </button>
          
          <h3 style={{ color: theme.colors.textLight, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '15px', paddingLeft: '5px', flexShrink: 0 }}>Recent</h3>
          
          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
              {chatHistory.length === 0 ? (
                <p style={{ color: theme.colors.textLight, fontSize: '0.85rem', paddingLeft: '5px', fontStyle: 'italic' }}>No recent chats...</p>
              ) : (
                chatHistory.map((chat, idx) => (
                  <div key={chat.id || idx} onClick={() => loadChat(chat)} style={{ 
                    padding: '12px', borderRadius: '12px', color: theme.colors.textMain, fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    boxShadow: theme.shadows.sunken, backgroundColor: isDarkMode ? '#292a2f' : 'rgba(163,177,198, 0.1)', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s'
                  }}>
                    <MessageSquare size={14} color={theme.colors.textLight} style={{ flexShrink: 0 }} /> 
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{chat.title}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.7 }}>
               <MessageSquare size={30} color={theme.colors.textLight} style={{ marginBottom: '10px' }} />
               <p style={{ color: theme.colors.textLight, fontSize: '0.85rem', textAlign: 'center' }}>Sign in to view your<br/>chat history.</p>
            </div>
          )}
        </div>

        {/* --- Column 2: Image Context --- */}
        <div className="layout-col vision-panel" style={{ backgroundColor: theme.colors.bg, boxShadow: theme.shadows.raised }}>
          <h2 style={{ color: theme.colors.textMain, textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', flexShrink: 0 }}>Vision Engine</h2>
          <div 
            onClick={() => fileInputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleImageSelection(e.dataTransfer.files[0]); }}
            style={{ 
              backgroundColor: theme.colors.bg, borderRadius: '20px', boxShadow: theme.shadows.sunken, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
              cursor: 'pointer', overflow: 'hidden', padding: previewUrl ? '10px' : '20px', border: '2px dashed transparent', transition: 'border 0.3s'
            }}
          >
            {previewUrl ? (
              <img src={previewUrl} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }} alt="Preview" />
            ) : (
              <>
                <Upload size={40} color={theme.colors.textLight} />
                <p style={{ color: theme.colors.textLight, marginTop: '15px', fontWeight: '500', textAlign: 'center', fontSize: '0.9rem' }}>Click, Drag, or Paste Image Here</p>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleImageSelection(e.target.files[0])} style={{display: 'none'}} />
          <button 
            onClick={handleNewSession}
            style={{ 
              backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '15px', marginTop: '20px', 
              color: theme.colors.textMain, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold', flexShrink: 0
            }}
          >
            <RefreshCcw size={16} /> Clear Session
          </button>
        </div>

        {/* --- Column 3: Main Chat Interface --- */}
        <div className="layout-col chat-panel" style={{ backgroundColor: theme.colors.bg, boxShadow: theme.shadows.raised }}>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              title="Toggle Theme"
              style={{ 
                backgroundColor: theme.colors.inverseBtnBg, borderRadius: '50%', width: '42px', height: '42px', 
                boxShadow: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.colors.inverseBtnColor, transition: 'all 0.3s'
              }}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {!isLoggedIn ? (
              <button 
                onClick={() => { setAuthScreen('login'); setAuthError(''); setAuthForm({ username: '', email: '', password: '', confirm: '' }); }}
                style={{ 
                  backgroundColor: theme.colors.bg, borderRadius: '15px', boxShadow: theme.shadows.raised, border: 'none', padding: '10px 20px', 
                  color: theme.colors.textMain, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'
                }}
              >
                <LogIn size={16} /> Sign In
              </button>
            ) : (
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  title="Account Details"
                  style={{ 
                    backgroundColor: theme.colors.accent, borderRadius: '50%', width: '42px', height: '42px', 
                    boxShadow: theme.shadows.raised, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isDarkMode ? '#1a1b1e' : '#fff', fontWeight: 'bold', fontSize: '1.2rem', transition: 'all 0.3s'
                  }}
                >
                  {currentEmail ? currentEmail.charAt(0).toUpperCase() : 'U'}
                </button>

                {showProfileMenu && (
                  <div style={{ 
                    position: 'absolute', top: '55px', right: '0', backgroundColor: theme.colors.bg, boxShadow: theme.shadows.raised, 
                    borderRadius: '15px', padding: '15px', width: '220px', zIndex: 100, border: `1px solid ${isDarkMode ? '#36373c' : '#d1d8e0'}`,
                    display: 'flex', flexDirection: 'column'
                  }}>
                    <p style={{ margin: '0 0 5px 0', color: theme.colors.textMain, fontWeight: 'bold', fontSize: '1rem' }}>{currentUser}</p>
                    <p style={{ margin: '0 0 15px 0', color: theme.colors.textLight, fontSize: '0.85rem', wordBreak: 'break-all' }}>{currentEmail}</p>
                    <button 
                      onClick={handleLogout}
                      style={{ 
                        width: '100%', padding: '10px', backgroundColor: theme.colors.micBtn, color: theme.colors.bg, 
                        border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' 
                      }}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '15px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.length === 0 && (
              <div style={{ margin: 'auto', textAlign: 'center', color: theme.colors.textLight }}>
                <ImageIcon size={50} style={{ opacity: 0.4, margin: '0 auto 15px auto' }} />
                <p>Upload an image and ask a question to begin.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'You' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  // FIXED TYPO: Now correctly uses the userBubbleBg color!
                  backgroundColor: m.sender === 'You' ? theme.colors.userBubbleBg : theme.colors.aiBubbleBg, 
                  padding: '15px 25px', maxWidth: '80%', 
                  borderRadius: m.sender === 'You' ? '25px 25px 5px 25px' : '25px 25px 25px 5px',
                  boxShadow: m.sender === 'You' ? theme.shadows.bubbleUser : theme.shadows.bubbleAI,
                }}>
                  <span style={{ 
                    fontSize: '0.75rem', fontWeight: 'bold', display: 'block', 
                    color: m.sender === 'You' ? theme.colors.userBubbleText : theme.colors.accent, 
                    marginBottom: '8px', textTransform: 'uppercase', opacity: 0.9
                  }}>
                    {m.sender}
                  </span>
                  <p style={{ 
                    margin: 0, 
                    // Ensures text contrasts well with the user bubble background
                    color: m.sender === 'You' ? theme.colors.userBubbleText : theme.colors.aiBubbleText, 
                    whiteSpace: 'pre-wrap', lineHeight: '1.6' 
                  }}>
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                 <div style={{ backgroundColor: theme.colors.aiBubbleBg, padding: '15px 25px', borderRadius: '25px 25px 25px 5px', boxShadow: theme.shadows.bubbleAI, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Loader2 className="animate-spin" color={theme.colors.accent} size={18} />
                    <span style={{ color: theme.colors.aiBubbleText, fontSize: '0.9rem' }}>Analyzing...</span>
                 </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', position: 'relative', flexShrink: 0 }}>
            {isListening && (
              <div style={{ position: 'absolute', top: '-30px', left: '0', display: 'flex', gap: '3px', alignItems: 'flex-end', height: '20px' }}>
                {audioLevels.map((level, i) => (
                  <div key={i} style={{ width: '6px', height: `${Math.max(level, 3)}px`, backgroundColor: theme.colors.micActive, borderRadius: '3px', transition: 'height 0.1s' }} />
                ))}
              </div>
            )}
            
            <button 
              onClick={startVoiceInput}
              title="Click to Speak"
              style={{ 
                backgroundColor: isListening ? theme.colors.micActive : theme.colors.micBtn, 
                borderRadius: '50%', width: '55px', height: '55px', flexShrink: 0,
                boxShadow: isListening ? theme.shadows.glowActive : theme.shadows.raised, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.colors.bg, 
                transition: 'all 0.3s ease'
              }}
            >
              <Mic size={24} />
            </button>
            
            <textarea 
              ref={textareaRef}
              value={prompt}
              onChange={handleTextareaInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the image..."
              style={{ 
                backgroundColor: theme.colors.bg, borderRadius: '20px', boxShadow: theme.shadows.sunken, border: 'none', outline: 'none', padding: '16px 20px', flex: 1, color: theme.colors.textMain, resize: 'none', 
                height: '55px', overflowY: 'auto', fontFamily: 'inherit', fontSize: '1rem', lineHeight: '1.4', transition: 'all 0.3s'
              }}
            />
            
            <button 
              onClick={handleSend}
              disabled={isLoading || !prompt.trim()}
              style={{ 
                backgroundColor: (isLoading || !prompt.trim()) ? theme.colors.bg : theme.colors.sendBtn, 
                borderRadius: '50%', width: '55px', height: '55px', flexShrink: 0,
                boxShadow: theme.shadows.raised, border: 'none', cursor: (isLoading || !prompt.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: (isLoading || !prompt.trim()) ? theme.colors.textLight : theme.colors.bg, 
                transition: 'all 0.3s'
              }}
            >
              <Send size={20} style={{ marginLeft: '3px' }} />
            </button>
          </div>
        </div>
      </div>
      </>
      )}
    </>
  );
}
