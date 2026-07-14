import { useState, useEffect } from 'react';

function Lobby({ onEnterRoom }) {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [testCases, setTestCases] = useState([
    { input: '', expectedOutput: '', isHidden: false },
  ]);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/sessions/mine', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await res.json();
        if (res.ok) setHistory(data.sessions);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', expectedOutput: '', isHidden: false }]);
  };

  const removeTestCase = (index) => {
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const updateTestCase = (index, field, value) => {
    const updated = [...testCases];
    updated[index][field] = value;
    setTestCases(updated);
  };

  const createSession = async () => {
    setError('');

    if (!title.trim() || !description.trim()) {
      setError('Please add a title and description');
      return;
    }
    const validTestCases = testCases.filter((tc) => tc.expectedOutput.trim());
    if (validTestCases.length === 0) {
      setError('Add at least one test case with an expected output');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('http://localhost:3000/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ title, description, testCases: validTestCases }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Failed to create session');
        setCreating(false);
        return;
      }

      onEnterRoom(data.roomId);
    } catch (err) {
      setError('Could not reach server');
      setCreating(false);
    }
  };

  const joinSession = () => {
    if (!joinRoomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    onEnterRoom(joinRoomId.trim());
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center px-4 py-10">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">Start an Interview</h1>
          <p className="text-neutral-500 text-sm mt-1">Create a new session or join an existing one</p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-8 border border-neutral-800/80 shadow-2xl">
          {!showCreateForm ? (
            <>
              <button
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all text-white font-medium rounded-lg py-2.5 shadow-lg shadow-blue-600/20 mb-6"
              >
                + Create New Session
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-neutral-800" />
                <span className="text-neutral-600 text-xs uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-neutral-800" />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Room ID</label>
                  <input
                    placeholder="Paste a room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all font-mono text-sm"
                  />
                </div>
                <button
                  onClick={joinSession}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors text-white font-medium rounded-lg py-2.5"
                >
                  Join Session
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">New Problem</p>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-neutral-500 hover:text-neutral-300 text-sm"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Reverse a String"
                  className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all text-sm"
                />
              </div>

              <div>
                <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the problem, input format, constraints..."
                  rows={4}
                  className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all text-sm resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-neutral-400 text-xs font-medium">Test Cases</label>
                  <button
                    onClick={addTestCase}
                    className="text-blue-400 hover:text-blue-300 text-xs font-medium"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-3">
                  {testCases.map((tc, i) => (
                    <div key={i} className="bg-neutral-800/40 border border-neutral-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500 text-xs">Case {i + 1}</span>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 text-neutral-500 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={tc.isHidden}
                              onChange={(e) => updateTestCase(i, 'isHidden', e.target.checked)}
                              className="accent-blue-500"
                            />
                            Hidden
                          </label>
                          {testCases.length > 1 && (
                            <button
                              onClick={() => removeTestCase(i)}
                              className="text-neutral-600 hover:text-red-400 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        value={tc.input}
                        onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                        placeholder="e.g. 5 (raw value passed via stdin)"
                        className="w-full bg-neutral-900 text-white placeholder-neutral-600 rounded-md px-3 py-1.5 outline-none border border-neutral-800 focus:border-blue-500/50 text-xs font-mono"
                      />
                      <input
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                        placeholder="Expected output"
                        className="w-full bg-neutral-900 text-white placeholder-neutral-600 rounded-md px-3 py-1.5 outline-none border border-neutral-800 focus:border-blue-500/50 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={createSession}
                disabled={creating}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 transition-all text-white font-medium rounded-lg py-2.5 shadow-lg shadow-blue-600/20"
              >
                {creating ? 'Creating...' : 'Create Session'}
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {!loadingHistory && history.length > 0 && (
          <div className="mt-6 bg-neutral-900/60 backdrop-blur-xl rounded-2xl border border-neutral-800/80 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-800">
              <p className="text-neutral-300 text-sm font-medium">Past Sessions</p>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-neutral-800">
              {history.map((s) => (
                <button
                  key={s.roomId}
                  onClick={() => onEnterRoom(s.roomId)}
                  className="w-full text-left px-5 py-3 hover:bg-neutral-800/40 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm">{s.title}</p>
                    <p className="text-neutral-500 text-xs mt-0.5">
                      {s.role === 'interviewer' ? 'You interviewed' : 'You were interviewed'} ·{' '}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      s.status === 'completed'
                        ? 'bg-neutral-700/50 text-neutral-400'
                        : 'bg-green-500/15 text-green-400'
                    }`}
                  >
                    {s.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lobby;