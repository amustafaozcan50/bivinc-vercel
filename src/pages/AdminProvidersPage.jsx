import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const API_URL = import.meta.env.VITE_API_URL;


export default function AdminProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadProviders() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('provider_profiles')
        .select(`
          id,
          user_id,
          operator_name,
          experience_years,
          license_number,
          certificate_url,
          identity_url,
          approved,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        setProviders([]);
        return;
      }

      const userIds = data.map((item) => item.user_id);

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, phone, city')
        .in('id', userIds);

      if (usersError) throw usersError;

      const merged = data.map((provider) => {
        const user = usersData?.find((u) => u.id === provider.user_id);
        return {
          ...provider,
          user_full_name: user?.full_name || '',
          user_email: user?.email || '',
          user_phone: user?.phone || '',
          user_city: user?.city || '',
        };
      });

      setProviders(merged);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function approveProvider(userId) {
    try {
      const res = await fetch(
         `${API_URL}/api/admin/providers/${userId}/approval`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
          },
          body: JSON.stringify({ approved: true }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Onaylama başarısız');
      }

      alert('Hizmet veren onaylandı');
      await loadProviders();
    } catch (err) {
      alert(err.message);
    }
  }

  async function rejectProvider(userId) {
    try {
      const res = await fetch(
          `${API_URL}/api/admin/providers/${userId}/approval`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
          },
          body: JSON.stringify({ approved: false }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Reddetme başarısız');
      }

      alert('Hizmet veren reddedildi');
      await loadProviders();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <MainLayout
      title="Hizmet Veren Evrakları"
      menuItems={[
        { label: '🛠 Admin Teklifleri', onClick: () => (window.location.href = '/admin') },
        { label: '📄 Provider Evrakları', onClick: () => {} },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
      ]}
    >
      <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
        <h2 className="text-2xl text-orange-500 mb-4">Hizmet Veren Belgeleri</h2>

        {loading ? (
          <p className="text-gray-400">Yükleniyor...</p>
        ) : providers.length === 0 ? (
          <p className="text-gray-400">Henüz yüklenmiş provider evrağı yok.</p>
        ) : (
          <div className="space-y-4">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="border border-[#2a2d33] rounded-xl p-5 bg-[#141618]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl text-white font-semibold">
                    {provider.user_full_name || 'İsimsiz Kullanıcı'}
                  </h3>

                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      provider.approved
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                    }`}
                  >
                    {provider.approved ? '✅ Onaylı' : '⏳ Onay Bekliyor'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300 mb-4">
                  <p><strong>Ad Soyad:</strong> {provider.user_full_name || '-'}</p>
                  <p><strong>Email:</strong> {provider.user_email || '-'}</p>
                  <p><strong>Telefon:</strong> {provider.user_phone || '-'}</p>
                  <p><strong>Şehir:</strong> {provider.user_city || '-'}</p>
                  <p><strong>Operatör Adı:</strong> {provider.operator_name || '-'}</p>
                  <p><strong>Deneyim:</strong> {provider.experience_years || '-'}</p>
                  <p><strong>Belge No:</strong> {provider.license_number || '-'}</p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {provider.certificate_url && (
                    <a
                      href={provider.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl"
                    >
                      Operatörlük Belgesini Aç
                    </a>
                  )}

                  {provider.identity_url && (
                    <a
                      href={provider.identity_url}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-xl"
                    >
                      Kimlik / Evrakı Aç
                    </a>
                  )}
                </div>

                {!provider.approved ? (
                <div className="flex gap-3 mt-4">
                    <button
                    type="button"
                    onClick={() => approveProvider(provider.user_id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
                    >
                    ✅ Onayla
                    </button>

                    <button
                    type="button"
                    onClick={() => rejectProvider(provider.user_id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
                    >
                    ❌ Reddet
                    </button>
                </div>
                ) : (
                <div className="mt-4">
                    <span className="inline-block px-4 py-2 rounded-xl bg-green-500/10 text-green-400 font-semibold">
                    ✅ Bu hizmet veren onaylandı
                    </span>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}