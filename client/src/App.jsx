import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

// Create the connection once, outside the component,
// so it doesn't reconnect on every re-render
const socket = io('http://localhost:3000');

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    // Listen for messages coming from the server
    socket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    // Cleanup: remove the listener when component unmounts
    return () => {
      socket.off('receive-message');
    };
  }, []);

  const sendMessage = () => {
    socket.emit('send-message', input);
    setInput('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Socket.io Test</h2>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message"
      />
      <button onClick={sendMessage}>Send</button>
      <ul>
        {messages.map((msg, i) => (
          <li key={i}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;