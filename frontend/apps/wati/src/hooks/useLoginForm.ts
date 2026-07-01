import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../lib/api';
import { useTranslation } from 'react-i18next';

export type AuthView = 'login' | 'register' | 'forgot-password';

interface UseLoginFormProps {
  initialView?: AuthView;
  onSuccess: (userData?: any, view?: AuthView) => void;
}

export function useLoginForm({ initialView = 'login', onSuccess }: UseLoginFormProps) {
  const { t } = useTranslation();
  const { login, register } = useAuth();

  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotSuccess, setIsForgotSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    try {
      if (!email.trim() || !emailRegex.test(email.trim())) {
        setError(t('auth.emailError', { defaultValue: 'Email: Ingresa un correo electrónico válido.' }));
        setIsSubmitting(false);
        return;
      }

      if (view === 'forgot-password') {
        await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
        setIsForgotSuccess(true);
        setIsSubmitting(false);
        return;
      }

      let userData = null;
      if (view === 'register') {
        if (!displayName.trim()) {
          setError(t('auth.nameError', { defaultValue: 'Nombre: Ingresa tu nombre completo.' }));
          setIsSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setError(t('auth.passwordLengthError', { defaultValue: 'Contraseña: Debe tener al menos 8 caracteres.' }));
          setIsSubmitting(false);
          return;
        }
        if (!/[A-Z]/.test(password)) {
          setError(t('auth.passwordUpperError', { defaultValue: 'Contraseña: Debe tener al menos una mayúscula.' }));
          setIsSubmitting(false);
          return;
        }
        if (!/[0-9]/.test(password)) {
          setError(t('auth.passwordNumberError', { defaultValue: 'Contraseña: Debe tener al menos un número.' }));
          setIsSubmitting(false);
          return;
        }
        if (!acceptedTerms) {
          setError(t('auth.termsError', { defaultValue: 'Legal: Debes aceptar los Términos y Condiciones.' }));
          setIsSubmitting(false);
          return;
        }
        userData = await register({ 
          email: email.trim().toLowerCase(), 
          password, 
          displayName: displayName.trim(), 
          acceptedTerms,
          language: 'es' 
        });
      } else {
        userData = await login({ 
          email: email.trim().toLowerCase(), 
          password 
        });
      }
      
      setTimeout(() => {
        onSuccess(userData, view);
      }, 150);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || t('auth.unexpectedError'));
    } finally {
      if (view !== 'forgot-password' || !isForgotSuccess) {
        setIsSubmitting(false);
      }
    }
  };

  return {
    view,
    setView,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    showPassword,
    setShowPassword,
    acceptedTerms,
    setAcceptedTerms,
    error,
    setError,
    isSubmitting,
    isForgotSuccess,
    setIsForgotSuccess,
    handleSubmit
  };
}
