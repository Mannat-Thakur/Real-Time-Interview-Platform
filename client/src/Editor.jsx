import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import MonacoEditor from '@monaco-editor/react';

function Editor({ roomId, onLogout }) {
  const [code, setCode] = useState('// Start typing code here');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const debounceTimer = useRef(null);
  const isRemoteChange = useRef(false);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io('http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });
    socketRef.current = socket;

    socket.on('connect_error', (err) => {
      console.error('Socket connection failed:', err.message);
      if (err.message.includes('Authentication')) {
        localStorage.removeItem('token');
        onLogout();
      }
    });

    socket.emit('join-room', roomId);

    socket.on('receive-code-change', (newCode) => {
      isRemoteChange.current = true;
      setCode(newCode);
    });

    socket.on('code-result', (result) => {
      setIsRunning(false);
      setOutput(result.success ? result.output : `Error: ${result.output}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleEditorChange = (value) => {
    setCode(value);

    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      socketRef.current.emit('send-code-change', { room: roomId, code: value });
    }, 300);
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput('Running...');
    socketRef.current.emit('run-code', { room: roomId, code });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#1e1e1e', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button onClick={runCode} disabled={isRunning}>
          {isRunning ? 'Running...' : 'Run Code'}
        </button>
        <button onClick={handleLogout}>Log Out</button>
        <span style={{ color: '#888', marginLeft: 'auto' }}>Room: {roomId}</span>
      </div>
      <div style={{ flex: 1 }}>
        <MonacoEditor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
        />
      </div>
      <div style={{ height: '150px', background: '#000', color: '#0f0', padding: '10px', overflow: 'auto', fontFamily: 'monospace' }}>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

export default Editor;