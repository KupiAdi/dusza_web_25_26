import { useState } from 'react';
import { useAuth } from '../state/AuthContext';

type AuthMode = 'login' | 'register';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        if (!email) {
          setError('Email cím megadása kötelező');
          setIsLoading(false);
          return;
        }
        await register(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Hiba történt');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Damareen</h1>
        <p className="auth-subtitle">
          Gyűjtögetős fantasy kártya kaland
        </p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Bejelentkezés
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Regisztráció
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="form-field">
            <label htmlFor="username">Felhasználónév</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="email">Email cím</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="password">Jelszó</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={isLoading}
            />
            {mode === 'register' && (
              <small>Legalább 6 karakter hosszú</small>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading
              ? 'Betöltés...'
              : mode === 'login'
              ? 'Bejelentkezés'
              : 'Regisztráció'}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              Még nincs fiókod?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Regisztrálj most
              </button>
            </p>
          ) : (
            <p>
              Már van fiókod?{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                Jelentkezz be
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

