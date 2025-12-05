import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useTranslation } from '../state/LanguageContext'
import { LanguageSelector } from './LanguageSelector'

type AuthMode = 'login' | 'register'

type FieldErrors = {
  username?: string
  email?: string
  password?: string
}

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const { login, register } = useAuth()
  const { t } = useTranslation()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    const newErrors: FieldErrors = {}
    if (!username.trim()) {
      newErrors.username = t('validation.required')
    }

    if (mode === 'register') {
      if (!email.trim()) {
        newErrors.email = t('validation.required')
      } else {
        // Simple email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email.trim())) {
          newErrors.email = t('validation.emailRequired')
        }
      }
    }

    if (!password) {
      newErrors.password = t('validation.required')
    } else if (password.length < 6) {
      newErrors.password = t('validation.passwordMin')
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors)
      return
    }

    setFieldErrors({})
    setIsLoading(true)

    try {
      if (mode === 'login') {
        await login(username, password)
      } else {
        if (!email) {
          setError(t('validation.emailRequired'))
          setIsLoading(false)
          return
        }
        await register(username, email, password)
      }
    } catch (err: any) {
      setError(err.message || t('auth.errors.generic'))
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError(null)
    setFieldErrors({})
    setPassword('')
  }

  const submitLabel =
    mode === 'login' ? t('auth.actions.login') : t('auth.actions.register')

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            width: '100%',
          }}
        >
          <h1>{t('auth.title')}</h1>
          <LanguageSelector />
        </div>
        <p className="auth-subtitle">{t('auth.subtitle')}</p>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            {t('auth.tabs.login')}
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            {t('auth.tabs.register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {error && <div className="auth-error">{error}</div>}

          <div className="form-field">
            <label htmlFor="username">{t('auth.fields.username')}</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value)
                if (fieldErrors.username) {
                  setFieldErrors((prev) => ({ ...prev, username: undefined }))
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
              <label htmlFor="email">{t('auth.fields.email')}</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
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
            <label htmlFor="password">{t('auth.fields.password')}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
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
              mode === 'register' && <small>{t('auth.hints.passwordLength')}</small>
            )}
          </div>

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? t('common.loading') : submitLabel}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <p>
              {t('auth.switch.toRegister')}{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                {t('auth.switch.registerCta')}
              </button>
            </p>
          ) : (
            <p>
              {t('auth.switch.toLogin')}{' '}
              <button type="button" onClick={toggleMode} className="link-button">
                {t('auth.switch.loginCta')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

