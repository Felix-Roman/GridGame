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

  const handleLogin = () => {
    navigate(`/LoginForm`);
  };

  const handleCreateAccount = () => {
    navigate(`/CreateAccountForm`);
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
        <button 
          onClick={handleLogin}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Login
        </button>
        <button 
          onClick={handleCreateAccount}
          style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
        >
          Make Account
        </button>
      </div>
    </div>
  );
}











/*
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

//add user accounts and sign up/login. 

export default function Home() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
        <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
                required
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

/*
const LoginForm = ( ) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
  
    const handleSubmit = (e: any) => {
        e.preventDefault();
        alert(`Welcome, ${username}!`);
        const handlePlay = () => {
    if (!username.trim()) return;
    
    // Generate a random 5-character string for the unique game instance
    const roomId = Math.random().toString(36).substring(2, 7);
    
    // Navigate to the game screen and pass the username in the state
    navigate(`/game/${roomId}`, { state: { username } });
  };
    };

    return(
        <div className="wrapper">
            <form onSubmit={handleSubmit}>
            <h2>Login</h2>
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type="submit">Login</button>
            </form>
        </div>
    );
};

export default LoginForm;

//import React from "react":
//import { render } from "react-dom";
//import { App } from 'Base/View';

//render(<App />, document.getElementByID("app"))

*/
