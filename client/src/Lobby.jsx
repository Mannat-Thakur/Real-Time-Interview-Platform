import { useState } from 'react';

function Lobby({ onEnterRoom }) {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const createSession = async () => {
    setError('');
    setCreating(true);
    try {
      const res = await fetch('http://localhost:3000/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
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
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center px-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
         <h1 className="text-2xl font-bold tracking-tight text-white">Start an Interview</h1>
          <p className="text-neutral-500 text-sm mt-1">Create a new session or join an existing one</p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-8 border border-neutral-800/80 shadow-2xl">
          <button
            onClick={createSession}
            disabled={creating}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 transition-all text-white font-medium rounded-lg py-2.5 shadow-lg shadow-blue-600/20 mb-6"
          >
            {creating ? 'Creating...' : '+ Create New Session'}
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

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Lobby;