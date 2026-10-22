import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';

const LoginForm = ( ) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const handleSubmit = (e: any) => {
        e.preventDefault();
        alert(`Welcome, ${username}!`);
        navigate('/Account'); 
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
                style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
                required
            />
            <button type="submit"
                style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
            >
                Login
            </button>
            </form>
        </div>
    );
};

export default LoginForm;

/*
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';

export default function LoginForm( ){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const handleSubmit = (e: any) => {
        e.preventDefault();
        alert(`Welcome, ${username}!`);
        navigate('/Account'); 
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
*/