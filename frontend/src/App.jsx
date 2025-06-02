import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('join');
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isNameTaken, setIsNameTaken] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const channel = {
    id: 1,
    name: 'General Chat',
    description: 'Welcome to the general chat room'
  };

  const setupWebSocket = () => {
    const userId = crypto.randomUUID();
    socketRef.current = new WebSocket(`ws://localhost:8000/ws/chat/${userId}`);

    socketRef.current.onopen = () => {
      console.log('WebSocket connected');
      socketRef.current.send(JSON.stringify({
        type: "join_channel",
        user_info: { name: username }
      }));
    };

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received:", message);
      
      if (message.type === "username_taken") {
        setJoinError(`Username '${username}' is already taken. Please choose another name.`);
        setIsJoining(false);  // Reset joining state
        setIsNameTaken(true); // Mark name as taken
        
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      
        // Auto-clear error after 3 seconds and allow retry
        setTimeout(() => {
          setIsNameTaken(false);
          setJoinError('');
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
        id: Date.now(),
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
          id: Date.now(),
          text: "Connection lost. Trying to reconnect...",
          sender: { id: 0, name: 'System' },
          timestamp: new Date().toLocaleTimeString(),
          isCurrentUser: false,
          isSystem: true
        }]);
      } else {
        // ✅ Add this block to handle disconnect while joining
        if (isJoining) {
          setIsJoining(false);
          setJoinError("Connection failed. Please try again.");
        }
      }
    };
  };

  useEffect(() => {
    if (currentView === 'chat') {
      return () => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }
      };
    }
  }, [currentView]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() === '') return;

    // Optimistic UI update
    const newMessage = {
      id: Date.now(),
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

  // const handleJoinChat = (e) => {
  //   e.preventDefault();
  //   if (username.trim() === '' || isJoining || isNameTaken) return;
    
  //   setJoinError('');
  //   setIsJoining(true);
  //   setupWebSocket();
  // };

  const handleJoinChat = (e) => {
    e.preventDefault();
    if (username.trim() === '' || isJoining) return;
    
    setJoinError('');
    setIsJoining(true);
    setIsNameTaken(false);
    setupWebSocket();
    setTimeout(() => {
      if (isJoining) {
        setJoinError("Join request timed out. Please try again.");
        setIsJoining(false);
        if (socketRef.current) {
          socketRef.current.close();
          socketRef.current = null;
        }
      }
    }, 5000);
    // return
  };
  
  // Then in the WebSocket onmessage handler:
  // if (message.type === "username_taken") {
  //   setJoinError(`Username '${username}' is already taken. Please choose another name.`);
  //   setIsNameTaken(true);
  //   setIsJoining(false);
    
  //   if (socketRef.current) {
  //     socketRef.current.close();
  //     socketRef.current = null;
  //   }
  //   return;
  // }

  return (
    <div className="app">
      {currentView === 'join' ? (
        <div className="join-view">
          <div className="join-form">
            <h1>Kamen Chat</h1>
            <h2>Join the Chat</h2>
            {joinError && <div className="error-message">{joinError}</div>}
            <form onSubmit={handleJoinChat}>
                <div className="form-group">
                  <label>Enter Your Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (isNameTaken) setIsNameTaken(false);
                    }}
                    placeholder="Your name"
                    required
                    autoFocus
                    disabled={isJoining}
                  />
                </div>
                <button 
                  type="submit" 
                  className={`join-button ${isJoining || isNameTaken ? 'disabled-button' : ''}`}
                  disabled={isJoining || isNameTaken}
                >
                  {isJoining ? 'Joining...' : 'Join Chat'}
                </button>
              </form>

          </div>
        </div>
      ) : (
        <div className="chat-view">
          <header className="chat-header">
            <h2>#{channel.name}</h2>
            <div className="channel-description">{channel.description}</div>
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

// socketRef.current = new WebSocket(`ws://localhost:8000/ws/chat/${userId}`);
// const userId = crypto.randomUUID();