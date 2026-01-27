import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import { useBrandingStore } from '../store/brandingStore';
import { useThemeStore } from '../store/themeStore';
import { shm_login, authenticateWithPasskey } from '../lib/shm_request';

function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { branding, fetchBranding, refetchBranding } = useBrandingStore();
  const { colors, applyTheme } = useThemeStore();
  const [isLoading, setIsLoading] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    fetchBranding();
    applyTheme();
    setPasskeySupported(!!window.PublicKeyCredential);
  }, [fetchBranding, applyTheme]);

  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    try {
      const result = await authenticateWithPasskey();
      const { user, sessionId } = result;
      setAuth(user, sessionId);
      await refetchBranding();
      toast.success('Успешный вход с Passkey!');
      navigate('/');
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error('Аутентификация отменена');
      } else {
        toast.error(error.message || 'Ошибка входа с Passkey');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!login.trim()) {
      toast.error('Введите логин');
      return;
    }

    if (!password) {
      toast.error('Введите пароль');
      return;
    }

    if (showOtp && !otpToken) {
      toast.error('Введите OTP код');
      return;
    }

    setIsLoading(true);
    try {
      const result = await shm_login(login, password, showOtp ? otpToken : undefined);

      if (result.otpRequired) {
        setShowOtp(true);
        toast.success('Введите код двухфакторной аутентификации');
        setIsLoading(false);
        return;
      }

      const { user, sessionId } = result;
      setAuth(user, sessionId);
      await refetchBranding();
      toast.success('Успешный вход!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Ошибка входа');
      if (showOtp) {
        setOtpToken('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--theme-content-bg)' }}
    >
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.primaryColorHover})`,
                  boxShadow: `0 10px 25px ${colors.primaryColor}30`
                }}
              >
                <LogIn className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h2
            className="mt-6 text-center text-3xl font-extrabold"
            style={{ color: 'var(--theme-content-text)' }}
          >
            {branding.name}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="on">
          <div className="rounded-md space-y-4">
            <div>
              <label
                htmlFor="login"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--theme-content-text)' }}
              >
                Логин
              </label>
              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                className="input"
                placeholder="login"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={showOtp}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--theme-content-text)' }}
              >
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={showOtp}
              />
            </div>

            {showOtp && (
              <div>
                <label
                  htmlFor="otp"
                  className="block text-sm font-medium mb-1"
                  style={{ color: 'var(--theme-content-text)' }}
                >
                  Код двухфакторной аутентификации
                </label>
                <input
                  id="otp"
                  type="text"
                  autoComplete="one-time-code"
                  className="input"
                  placeholder="000000"
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary flex justify-center items-center gap-2"
              style={{ background: `linear-gradient(135deg, ${colors.primaryColor}, ${colors.primaryColorHover})` }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Войти
                </>
              )}
            </button>

            {passkeySupported && (
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={isLoading}
                className="btn-secondary flex justify-center items-center gap-2"
              >
                <Key className="w-5 h-5" />
                Войти с Passkey
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
