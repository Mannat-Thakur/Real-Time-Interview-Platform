import { useState } from 'react';

function Lobby({ onEnterRoom }) {
  const [joinRoomId, setJoinRoomId] = useState('');
  const [error, setError] = useState('');

  const createSession = async () => {
    setError('');
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
        return;
      }

      onEnterRoom(data.roomId);
    } catch (err) {
      setError('Could not reach server');
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
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto', color: 'white' }}>
      <h2>Start an Interview Session</h2>

      <button onClick={createSession} style={{ marginBottom: '30px', width: '100%' }}>
        + Create New Session
      </button>

      <hr />

      <h3>Or Join an Existing Session</h3>
      <input
        placeholder="Enter Room ID"
        value={joinRoomId}
        onChange={(e) => setJoinRoomId(e.target.value)}
        style={{ display: 'block', marginBottom: '10px', width: '100%' }}
      />
      <button onClick={joinSession} style={{ width: '100%' }}>
        Join Session
      </button>

      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}

export default Lobby;