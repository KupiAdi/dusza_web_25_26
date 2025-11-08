import { useState } from 'react';
import { useAuth } from '../state/AuthContext';

type AuthMode = 'login' | 'register';

type FieldErrors = {
  username?: string;
  email?: string;
  password?: string;
};

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const newErrors: FieldErrors = {};
    if (!username.trim()) {
      newErrors.username = 'Kérjük, töltse ki a mezőt';
    }

    if (mode === 'register' && !email.trim()) {
      newErrors.email = 'Kérjük, töltse ki a mezőt';
    }

    if (!password) {
      newErrors.password = 'Kérjük, töltse ki a mezőt';
    } else if (password.length < 6) {
      newErrors.password = 'Legalább 6 karakteres jelszó szükséges';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
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
    setFieldErrors({});
    setPassword('');
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

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-field">
            <label htmlFor="username">Felhasználónév</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }));
                }
              }}
              autoComplete="username"
              disabled={isLoading}
              aria-invalid={fieldErrors.username ? 'true' : 'false'}
              aria-describedby={fieldErrors.username ? 'username-error' : undefined}
            />
            {fieldErrors.username && (
              <span className="field-error" id="username-error">
                {fieldErrors.username}
              </span>
            )}
          </div>

          {mode === 'register' && (
            <div className="form-field">
              <label htmlFor="email">Email cím</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
              />
              {fieldErrors.email && (
                <span className="field-error" id="email-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>
          )}

          <div className="form-field">
            <label htmlFor="password">Jelszó</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              disabled={isLoading}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            />
            {fieldErrors.password ? (
              <span className="field-error" id="password-error">
                {fieldErrors.password}
              </span>
            ) : (
              mode === 'register' && (
                <small>Legalább 6 karakteres jelszó szükséges</small>
              )
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

