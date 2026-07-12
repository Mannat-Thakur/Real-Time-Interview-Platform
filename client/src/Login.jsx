import { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

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
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      onLoginSuccess();
    } catch (err) {
      setError('Could not reach server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex items-center justify-center px-4">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px]" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isSignup ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            {isSignup ? 'Start running live interviews in minutes' : 'Log in to continue your session'}
          </p>
        </div>

        <div className="bg-neutral-900/80 backdrop-blur-xl rounded-2xl p-8 border border-neutral-800/80 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all"
                  placeholder="Jane Doe"
                />
              </div>
            )}

            <div>
              <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="text-neutral-400 text-xs font-medium mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-neutral-800/60 text-white placeholder-neutral-600 rounded-lg px-4 py-2.5 pr-11 outline-none border border-transparent focus:border-blue-500/50 focus:bg-neutral-800 transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-60 transition-all text-white font-medium rounded-lg py-2.5 shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Please wait...' : isSignup ? 'Sign Up' : 'Log In'}
            </button>
          </form>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full text-neutral-500 hover:text-neutral-300 text-sm mt-5 transition-colors"
          >
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <span className="text-blue-400">{isSignup ? 'Log In' : 'Sign Up'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;