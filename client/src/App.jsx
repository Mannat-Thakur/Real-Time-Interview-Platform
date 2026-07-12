import { useState } from 'react';
import Login from './Login';
import Lobby from './Lobby';
import Editor from './Editor';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [currentRoom, setCurrentRoom] = useState(null);

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  if (!currentRoom) {
    return <Lobby onEnterRoom={(roomId) => setCurrentRoom(roomId)} />;
  }

  return (
    <Editor
      roomId={currentRoom}
      onLogout={() => {
        setIsLoggedIn(false);
        setCurrentRoom(null);
      }}
    />
  );
}

export default App;