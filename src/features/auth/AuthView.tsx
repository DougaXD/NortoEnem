import React, { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { useRouter } from '../../app/router/RouterContext';
import { Card } from '../../components/ui/DesignSystem';
import { AlertCircle, Compass, Loader2 } from 'lucide-react';

const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const AuthView: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { signInWithGoogle } = useAuth();
  const { navigate } = useRouter();

  const handleGoogleSignIn = async () => {
    if (submitting) return;

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const nextRoute = await signInWithGoogle();
      if (nextRoute) {
        navigate(nextRoute);
      }
    } catch (err: any) {
      const code = err?.code || '';

      // Fechamento intencional da janela de autenticação ou cancelamento pelo usuário
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        console.info('[Norto Auth] Janela de login com Google fechada pelo usuário.');
        return;
      }

      console.error('Falha no login com Google:', err);
      let msg = 'Não foi possível concluir o login. Tente novamente.';

      if (code === 'auth/popup-blocked') {
        msg = 'O navegador bloqueou a janela de login. Permita pop-ups para continuar.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Problema de conexão. Verifique sua internet e tente novamente.';
      } else if (code === 'auth/user-disabled') {
        msg = 'Esta conta foi desativada. Entre em contato com o suporte.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'Domínio não autorizado para autenticação no Firebase.';
      }

      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="auth-container" className="w-full max-w-md mx-auto my-auto py-8 px-4 sm:px-6">
      <Card
        variant="elevated"
        padding="lg"
        className="border-slate-800/80 shadow-2xl bg-slate-900/90 backdrop-blur-md rounded-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-600/30 mb-4 ring-1 ring-white/20">
            <Compass className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            NORTO ENEM
          </h1>
          <p className="text-sm text-slate-300 mt-2 font-medium">
            Sua preparação para o ENEM em um só lugar.
          </p>
        </div>

        {errorMsg && (
          <div
            id="auth-error-alert"
            role="alert"
            className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-red-300 text-xs leading-relaxed"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block text-red-200 mb-0.5">Falha no acesso</span>
              {errorMsg}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={submitting}
            aria-label={submitting ? 'Entrando com Google...' : 'Continuar com Google'}
            className="w-full h-12 bg-white hover:bg-slate-50 text-slate-900 font-semibold text-sm rounded-xl shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center gap-3 border border-slate-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer disabled:opacity-80 disabled:cursor-wait"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 text-slate-700 animate-spin" />
                <span className="text-slate-800">Entrando com Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-5 h-5 shrink-0" />
                <span className="text-slate-800 font-medium text-[15px]">Continuar com Google</span>
              </>
            )}
          </button>

          <p className="text-xs text-slate-400 text-center font-normal">
            Use sua conta Google para acessar sua preparação.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade do Norto ENEM.
          </p>
        </div>
      </Card>
    </div>
  );
};
