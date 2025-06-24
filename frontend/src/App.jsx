import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [currentView, setCurrentView] = useState('join');
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [joinError, setJoinError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isNameTaken, setIsNameTaken] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const channel = {
    id: 1,
    name: 'Welcome to the general chat room',
  };

  const setupWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    const userId = uuidv4();
    const backendHost = window.location.hostname === 'localhost' 
    ? 'localhost' 
    : window.location.hostname.replace("5173","8000");
    socketRef.current = new WebSocket(`wss://${backendHost}/ws/chat/${userId}`);

    socketRef.current.onopen = () => {
      console.log('WebSocket connected');
      socketRef.current.send(JSON.stringify({
        type: "join_channel",
        user_info: { name: username }
      }));
      setJoinError('');
      setIsNameTaken(false);
      setIsJoining(false);
    };

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received:", message);
      
      
      if (message.type === "error") {
        setJoinError(`Username "${username}" is already taken. Please choose another.`);
        console.log("here");
        setIsJoining(false);
        setIsNameTaken(true);
        
        // Close the WebSocket connection
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
        
        // Clear the error after 3 seconds
        setTimeout(() => {
          setJoinError('');
          setIsNameTaken(false);
        }, 3000);
        return;
      }
      
      if (message.type === "join_success") {
        setJoinError('');
        setIsNameTaken(false);
        setCurrentView('chat');
        setIsJoining(false);
        return;
      }
      
      const isCurrentUser = message.sender?.name === username;
      const isSystem = message.sender?.name === 'System';
      
      setMessages(prev => [...prev, {
        id: uuidv4(),
        text: message.content || message.message,
        sender: {
          id: isCurrentUser ? 1 : (isSystem ? 0 : 2),
          name: message.sender?.name || 'System'
        },
        timestamp: message.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isCurrentUser,
        isSystem
      }]);
    };

    socketRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setJoinError("Failed to connect. Please try again.");
      setIsJoining(false);
    };

    socketRef.current.onclose = (event) => {
      console.log('WebSocket disconnected', event);
      if (currentView !== 'join') {
        setMessages(prev => [...prev, {
          id: uuidv4(),
          text: "Connection lost. Trying to reconnect...",
          sender: { id: 0, name: 'System' },
          timestamp: new Date().toLocaleTimeString(),
          isCurrentUser: false,
          isSystem: true
        }]);
      } else {
        // handle disconnect while joining
        if (isJoining) {
          setIsJoining(false);
          setJoinError("Connection failed. Please try again.");
        }
      }
    };
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    // Optimistic UI update
    const newMessage = {
      id: uuidv4(),
      text: inputValue,
      sender: {
        id: 1,
        name: username
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isCurrentUser: true,
      isSystem: false
    };
    setMessages(prev => [...prev, newMessage]);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "send_message",
        content: inputValue,
        sender: { name: username }
      }));
    }

    setInputValue('');
  };

  const timeoutRef = useRef();

  const handleJoinChat = (e) => {
    e.preventDefault();
    if (username.trim() === '' || isJoining) return;

    // Reset all error/join states
    setJoinError('');
    setIsJoining(true);
    setIsNameTaken(false);
    // console.log("here");

    // Force WebSocket reconnection
    setupWebSocket();

    // Timeout fallback (if server doesn't respond)
    timeoutRef.current = setTimeout(() => {
      if (isJoining) {
        setJoinError("Connection timed out. Please try again.");
        setIsJoining(false);
        if (socketRef.current) socketRef.current.close();
      }
    }, 5000);
  };

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="app">
      {currentView === 'join' ? (
        <div className="join-view">
          <div className="join-form">
              <h1>Kamen Chat</h1>
              <h2>Join the Chat</h2>              
              {
                <div className="error-message" style={{display: joinError ? 'flex' : 'none'}}>
                  {joinError}
                </div>
              }
              
              <form onSubmit={handleJoinChat}>
                <div className="form-group">
                  <label>Enter Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setJoinError('');
                    }}
                    placeholder="Your name"
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining || isNameTaken}
                  className={`join-button ${isJoining ? 'joining' : ''}`}
                >
                  {isJoining ? 'Joining...' : 'Join Chat'}
                </button>
              </form>
            </div>
        </div>
      ) : (
        <div className="chat-view">
          <header className="chat-header">
            <h2>{channel.name}</h2>
            <div className="user-info">Logged in as: {username}</div>
          </header>
          
          <div className="chat-container">
            <div className="messages-container">
              {messages.map((message, index) => (
                <div 
                  key={`${message.id}-${index}`} 
                  className={`message ${message.isCurrentUser ? 'sent' : 
                                   message.isSystem ? 'system' : 'received'}`}
                >
                  <div className="message-content">
                    {message.isSystem ? (
                      <div className="system-message-content">
                        <div className="message-text">{message.text}</div>
                      </div>
                    ) : (
                      <>
                        {!message.isCurrentUser && (
                          <span className="sender-name">{message.sender.name}</span>
                        )}
                        <div className="message-bubble">
                          <div className="message-text">{message.text}</div>
                          <span className="message-time">{message.timestamp}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="message-form">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Message #${channel.name}`}
                className="message-input"
                autoFocus
              />
              <button type="submit" className="send-button">Send</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;