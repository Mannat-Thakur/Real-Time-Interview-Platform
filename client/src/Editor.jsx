import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import MonacoEditor from "@monaco-editor/react";

const LANGUAGE_DEFAULTS = {
  javascript: "// Start typing code here",
  python: "# Start typing code here",
};

function Editor({ roomId, onLogout }) {
  const [code, setCode] = useState(LANGUAGE_DEFAULTS.javascript);
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [remoteCursors, setRemoteCursors] = useState({});
  const debounceTimer = useRef(null);
  const isRemoteChange = useRef(false);
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const lastCursorSent = useRef(0);



  useEffect(() => {
    const socket = io("http://localhost:3000", {
      auth: {
        token: localStorage.getItem("token"),
      },
    });
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.error("Socket connection failed:", err.message);
      if (err.message.includes("Authentication")) {
        localStorage.removeItem("token");
        onLogout();
      }
    });

    socket.emit("join-room", roomId);

    socket.on("receive-code-change", (newCode) => {
      isRemoteChange.current = true;
      setCode(newCode);
    });

    socket.on("load-code", (savedCode) => {
      isRemoteChange.current = true;
      setCode(savedCode);
    });

    socket.on("code-result", (result) => {
      setIsRunning(false);
      setOutput(result.success ? result.output : `Error: ${result.output}`);
    });

    socket.on("room-users", (userList) => {
      setUsers(userList);
    });

    socket.on("receive-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("receive-cursor", ({ userId, userName, position }) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [userId]: { userName, position },
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);


  const decorationsRef = useRef([]);

useEffect(() => {
  if (!editorRef.current) return;

  const monaco = editorRef.current;
  const newDecorations = Object.entries(remoteCursors).map(([userId, { userName, position }]) => ({
    range: {
      startLineNumber: position.lineNumber,
      startColumn: position.column,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    },
    options: {
      className: 'remote-cursor',
      hoverMessage: { value: userName },
      before: {
        content: '',
        inlineClassName: 'remote-cursor',
      },
    },
  }));

  decorationsRef.current = monaco.deltaDecorations(decorationsRef.current, newDecorations);
}, [remoteCursors]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      const now = Date.now();
      if (now - lastCursorSent.current < 50) return; // throttle: skip if too soon
      lastCursorSent.current = now;

      socketRef.current.emit("cursor-move", {
        room: roomId,
        position: {
          lineNumber: e.position.lineNumber,
          column: e.position.column,
        },
      });
    });
  };

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
      socketRef.current.emit("send-code-change", { room: roomId, code: value });
    }, 300);
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    setCode(LANGUAGE_DEFAULTS[newLanguage]);
  };

  const runCode = () => {
    setIsRunning(true);
    setOutput("Running...");
    socketRef.current.emit("run-code", { room: roomId, code, language });
  };

  const sendMessage = () => {
    if (!chatInput.trim()) return;
    socketRef.current.emit("send-message", {
      room: roomId,
      message: chatInput,
    });
    setChatInput("");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
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
              <svg
                className="animate-spin w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
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
          <span className="text-xs text-blue-400 font-medium">
            {copied ? "Copied!" : "Copy"}
          </span>
        </button>

        <button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 bg-neutral-800/60 hover:bg-neutral-800 border border-neutral-700/50 transition-colors text-neutral-300 text-sm rounded-lg px-3 py-2"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.17 0-2.29-.2-3.32-.56L3 21l1.6-4.8C3.6 14.94 3 13.52 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          Chat {messages.length > 0 && `(${messages.length})`}
        </button>

        <div className="flex items-center gap-2 ml-auto mr-2">
          {users.map((name, i) => (
            <div
              key={i}
              title={name}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold border-2 border-neutral-900"
              style={{ marginLeft: i > 0 ? "-8px" : "0" }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>

        <button
          onClick={handleLogout}
          className="text-neutral-500 hover:text-neutral-300 text-sm transition-colors"
        >
          Log Out
        </button>
      </div>

      {/* Main content: editor + optional chat panel */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <MonacoEditor
              height="100%"
              language={language}
              value={code}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                padding: { top: 16 },
                fontFamily: "'Fira Code', monospace",
              }}
            />
          </div>

          {/* Output console */}
          <div className="h-40 bg-black/60 backdrop-blur-xl border-t border-neutral-800/80 px-5 py-3 overflow-auto">
            <p className="text-neutral-600 text-xs uppercase tracking-wider font-medium mb-2">
              Output
            </p>
            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
              {output || "Run your code to see output here..."}
            </pre>
          </div>
        </div>

        {showChat && (
          <div className="w-72 bg-neutral-900 border-l border-neutral-800 flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-800">
              <p className="text-neutral-300 text-sm font-medium">Chat</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-neutral-600 text-sm text-center mt-4">
                  No messages yet
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i}>
                  <p className="text-blue-400 text-xs font-medium">
                    {msg.user}
                  </p>
                  <p className="text-neutral-300 text-sm">{msg.message}</p>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-neutral-800 flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-800/60 text-white placeholder-neutral-600 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-blue-500/50"
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm rounded-lg px-3"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Editor;
