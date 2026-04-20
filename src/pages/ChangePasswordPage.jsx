import { useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function handleChangePassword(e) {
    e.preventDefault();

    if (!currentPassword || !password || !passwordRepeat) {
      alert('Lütfen tüm alanları doldurun.');
      return;
    }

    if (password.length < 6) {
      alert('Yeni şifre en az 6 karakter olmalı.');
      return;
    }

    if (password !== passwordRepeat) {
      alert('Yeni şifreler eşleşmiyor.');
      return;
    }

    try {
      setLoading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.email) {
        throw new Error('Kullanıcı bilgisi alınamadı.');
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error('Mevcut şifre hatalı.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      alert('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setPassword('');
      setPasswordRepeat('');
    } catch (err) {
      console.error(err);
      alert(err.message || 'Şifre güncellenemedi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout
      title="Şifre Değiştir"
      menuItems={[
        { label: '🏠 Dashboard', onClick: () => (window.location.href = '/') },
        {
          label: '➕ Yeni İlan Oluştur',
          onClick: () => (window.location.href = '/ilan-olustur'),
        },
        {
          label: '📋 İlanlarım',
          onClick: () => (window.location.href = '/ilanlarim'),
        },
        {
          label: '💬 Gelen Teklifler',
          onClick: () => (window.location.href = '/gelen-teklifler'),
        },
        {
          label: '👤 Profilim',
          onClick: () => (window.location.href = '/profilim'),
        },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
      ]}
    >
      <div className="max-w-xl">
        <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Şifre Değiştir</h2>
          <p className="text-gray-400 mb-6">
            Mevcut şifrenizi doğrulayın ve yeni şifrenizi belirleyin.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Mevcut Şifre
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Mevcut şifre"
                className="w-full bg-[#111315] border border-[#2a2d33] p-3 rounded-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Yeni Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Yeni şifre"
                className="w-full bg-[#111315] border border-[#2a2d33] p-3 rounded-xl text-white outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Yeni Şifre Tekrar
              </label>
              <input
                type="password"
                value={passwordRepeat}
                onChange={(e) => setPasswordRepeat(e.target.value)}
                placeholder="Yeni şifre tekrar"
                className="w-full bg-[#111315] border border-[#2a2d33] p-3 rounded-xl text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white px-5 py-3 rounded-xl font-semibold"
            >
              {loading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}