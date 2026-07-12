import { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const endpoint = isSignup ? '/api/auth/signup' : '/api/auth/login';
    const body = isSignup ? { name, email, password } : { email, password };

    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong');
        return;
      }

      // Save the token so future requests/socket connections can use it
      localStorage.setItem('token', data.token);
      onLoginSuccess();
    } catch (err) {
      setError('Could not reach server');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '0 auto' }}>
      <h2>{isSignup ? 'Sign Up' : 'Log In'}</h2>
      <form onSubmit={handleSubmit}>
        {isSignup && (
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: 'block', marginBottom: '10px', width: '100%' }}
          />
        )}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', marginBottom: '10px', width: '100%' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', marginBottom: '10px', width: '100%' }}
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit">{isSignup ? 'Sign Up' : 'Log In'}</button>
      </form>
      <button onClick={() => setIsSignup(!isSignup)} style={{ marginTop: '10px' }}>
        {isSignup ? 'Already have an account? Log In' : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
}

export default Login;