import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

// Read room name from URL, e.g. ?room=test-room
const params = new URLSearchParams(window.location.search);
const ROOM_NAME = params.get('room') || 'default-room';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    socket.emit('join-room', ROOM_NAME);

    socket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, []);

  const sendMessage = () => {
    socket.emit('send-message', { room: ROOM_NAME, message: input });
    setInput('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Socket.io Test — Room: {ROOM_NAME}</h2>
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