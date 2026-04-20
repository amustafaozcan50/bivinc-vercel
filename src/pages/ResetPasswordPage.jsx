import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const passwordStrength = useMemo(() => {
    let score = 0;

    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) {
      return { text: 'Zayıf', color: 'text-red-400' };
    }
    if (score <= 4) {
      return { text: 'Orta', color: 'text-yellow-400' };
    }
    return { text: 'Güçlü', color: 'text-green-400' };
  }, [password]);

  async function handleResetPassword(e) {
    e.preventDefault();

    if (!password || !passwordRepeat) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      alert('Şifre en az 6 karakter olmalı.');
      return;
    }

    if (password !== passwordRepeat) {
      alert('Şifreler eşleşmiyor.');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      alert('Şifreniz başarıyla güncellendi. Giriş ekranına yönlendiriliyorsunuz.');
      window.location.href = '/auth';
    } catch (err) {
      console.error(err);
      alert(err.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0e10] text-white">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0e10] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-white mb-2">Yeni Şifre Belirle</h1>
        <p className="text-gray-400 mb-6">
          Hesabınız için yeni şifrenizi belirleyin.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Yeni Şifre
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yeni şifre"
                className="w-full bg-[#111315] border border-[#2a2d33] p-3 pr-12 rounded-xl text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                👁
              </button>
            </div>

            {password && (
              <p className={`mt-2 text-sm ${passwordStrength.color}`}>
                Şifre gücü: {passwordStrength.text}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Yeni Şifre Tekrar
            </label>

            <div className="relative">
              <input
                type={showPasswordRepeat ? 'text' : 'password'}
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                placeholder="Yeni şifre tekrar"
                className="w-full bg-[#111315] border border-[#2a2d33] p-3 pr-12 rounded-xl text-white outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPasswordRepeat(!showPasswordRepeat)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                👁
              </button>
            </div>

            {passwordRepeat && password !== passwordRepeat && (
              <p className="mt-2 text-sm text-red-400">
                Şifreler eşleşmiyor.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white py-3 rounded-xl font-semibold"
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}