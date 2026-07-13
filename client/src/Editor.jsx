import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import MonacoEditor from '@monaco-editor/react';

const LANGUAGE_DEFAULTS = {
  javascript: '// Start typing code here',
  python: '# Start typing code here',
};

function Editor({ roomId, onLogout }) {
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.javascript);
  const [language, setLanguage] = useState('javascript');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
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

    socket.on('load-code', (savedCode) => {
      isRemoteChange.current = true;
      setCode(savedCode);
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

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setCode(LANGUAGE_DEFAULTS[newLanguage]);
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput('Running...');
    socketRef.current.emit('run-code', { room: roomId, code, language });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    onLogout();
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3 bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-800/80">
        <button
          onClick={runCode}
          disabled={isRunning}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 transition-all text-white text-sm font-medium rounded-lg px-4 py-2 shadow-lg shadow-blue-600/20"
        >
          {isRunning ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Running
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Run Code
            </>
          )}
        </button>

        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 text-neutral-300 text-sm rounded-lg px-3 py-2 outline-none cursor-pointer"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
        </select>

        <button
          onClick={copyRoomId}
          className="flex items-center gap-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 transition-colors text-neutral-300 text-sm rounded-lg px-3 py-2"
        >
          <span className="font-mono text-neutral-400">{roomId}</span>
          <span className="text-xs text-blue-400 font-medium">{copied ? 'Copied!' : 'Copy'}</span>
        </button>

        <button
          onClick={handleLogout}
          className="ml-auto text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
        >
          Log Out
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={code}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{ fontSize: 14, padding: { top: 16 }, fontFamily: "'Fira Code', monospace" }}
        />
      </div>

      {/* Output console */}
      <div className="h-40 bg-black/60 backdrop-blur-xl border-t border-neutral-800/80 px-5 py-3 overflow-auto">
        <p className="text-neutral-600 text-xs uppercase tracking-wider font-medium mb-2">Output</p>
        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">{output || 'Run your code to see output here...'}</pre>
      </div>
    </div>
  );
}

export default Editor;