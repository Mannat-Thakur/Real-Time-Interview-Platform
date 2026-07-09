import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';

const socket = io('http://localhost:3000');

const params = new URLSearchParams(window.location.search);
const ROOM_NAME = params.get('room') || 'default-room';

function App() {
  const [code, setCode] = useState('// Start typing code here');
  const debounceTimer = useRef(null);
  const isRemoteChange = useRef(false);

  useEffect(() => {
    socket.emit('join-room', ROOM_NAME);

    socket.on('receive-code-change', (newCode) => {
      isRemoteChange.current = true; // mark this so our onChange doesn't re-broadcast it
      setCode(newCode);
    });

    return () => {
      socket.off('receive-code-change');
    };
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);

    // If this change came from the server (another user), don't re-broadcast it
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    // Debounce: clear any pending timer, start a new one
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      socket.emit('send-code-change', { room: ROOM_NAME, code: value });
    }, 300);
  };

  return (
    <div style={{ height: '100vh' }}>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        value={code}
        onChange={handleEditorChange}
        theme="vs-dark"
      />
    </div>
  );
}

export default App;