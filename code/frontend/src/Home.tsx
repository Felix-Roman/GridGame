import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handlePlay = () => {
    if (!username.trim()) return;
    
    // Generate a random 5-character string for the unique game instance
    const roomId = Math.random().toString(36).substring(2, 7);
    
    // Navigate to the game screen and pass the username in the state
    navigate(`/game/${roomId}`, { state: { username } });
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Welcome to Grid Game</h1>
      <div>
        <input 
          type="text" 
          placeholder="Enter Username" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
        />
        <button 
          onClick={handlePlay}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Play
        </button>
      </div>
    </div>
  );
}