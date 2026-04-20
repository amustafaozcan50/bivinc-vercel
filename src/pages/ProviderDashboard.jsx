import { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { supabase } from '../lib/supabase';

export default function ProviderDashboard() {
  const [loading, setLoading] = useState(true);
  const [cranes, setCranes] = useState([]);
  const [providerApproved, setProviderApproved] = useState(false);
  const [providerProfileExists, setProviderProfileExists] = useState(false);
  const [sentOffersCount, setSentOffersCount] = useState(0);
  const [latestOffer, setLatestOffer] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadDashboard() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data: craneData, error: craneError } = await supabase
        .from('cranes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (craneError) throw craneError;
      setCranes(craneData || []);

      const { data: providerData, error: providerError } = await supabase
        .from('provider_profiles')
        .select('approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (providerError) throw providerError;

      if (providerData) {
        setProviderProfileExists(true);
        setProviderApproved(!!providerData.approved);
      } else {
        setProviderProfileExists(false);
        setProviderApproved(false);
      }

      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('provider_user_id', user.id)
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;

      const allOffers = offersData || [];
      setSentOffersCount(allOffers.length);
      setLatestOffer(allOffers[0] || null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <MainLayout
      title="Hizmet Veren Paneli"
      menuItems={[
        { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
        { label: '🛒 İlan Pazarı', path: '/ilan-pazari', onClick: () => (window.location.href = '/ilan-pazari') },
        { label: '🏗️ Vinçlerim', path: '/vinclerim', onClick: () => (window.location.href = '/vinclerim') },
        { label: '📨 Verdiğim Teklifler', path: '/verdigim-teklifler', onClick: () => (window.location.href = '/verdigim-teklifler') },
        { label: '👤 Profilim', path: '/profilim', onClick: () => (window.location.href = '/profilim') },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
    ]}
    >
      {loading ? (
        <p className="text-gray-400">Yükleniyor...</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl text-white mb-2">Panel</h1>
            <p className="text-gray-400">
              Vinçlerinizi yönetin, ilan pazarını inceleyin ve tekliflerinizi takip edin.
            </p>
          </div>

          {providerProfileExists ? (
            providerApproved ? (
              <div className="bg-green-500/10 border border-green-700 rounded-2xl p-4">
                <p className="text-green-400 font-semibold text-lg">
                  ✅ Hesabın onaylandı
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  Artık ilan pazarındaki işlere teklif verebilir ve tüm hizmet veren özelliklerini kullanabilirsin.
                </p>
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-700 rounded-2xl p-4">
                <p className="text-yellow-400 font-semibold text-lg">
                  ⏳ Evrakların inceleniyor
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  Admin onayı tamamlanana kadar teklif veremezsin.
                </p>
              </div>
            )
          ) : (
            <div className="bg-red-500/10 border border-red-700 rounded-2xl p-4">
              <p className="text-red-400 font-semibold text-lg">
                ⚠️ Doğrulama eksik
              </p>
              <p className="text-gray-300 text-sm mt-1">
                Teklif verebilmek için önce profil sayfasından operatör bilgilerini ve belgelerini tamamlamalısın.
              </p>
              <button
                onClick={() => (window.location.href = '/profilim')}
                className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
              >
                Profile Git
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">Vinçlerim</h2>
              <p className="text-4xl font-bold text-white">{cranes.length}</p>
              <p className="text-gray-400 text-sm mt-2">
                Filona eklediğin toplam vinç sayısı
              </p>
            </div>

            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">Verdiğim Teklifler</h2>
              <p className="text-4xl font-bold text-white">{sentOffersCount}</p>
              <p className="text-gray-400 text-sm mt-2">
                Gönderdiğin toplam teklif sayısı
              </p>
            </div>

            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">Hesap Durumu</h2>
              <p className="text-2xl font-bold text-white">
                {providerApproved ? 'Onaylı' : 'Beklemede'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Teklif verebilmek için hesabın onay durumu
              </p>
            </div>
          </div>

          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
            <h2 className="text-2xl text-orange-500 mb-4">Son Teklifim</h2>

            {!latestOffer ? (
              <p className="text-gray-400">Henüz teklif göndermedin.</p>
            ) : (
              <div className="border border-[#2a2d33] rounded-xl p-4 bg-[#141618]">
                <p className="text-gray-300 mb-2">
                  <strong>Fiyat:</strong> ₺{Number(latestOffer.price || 0).toLocaleString('tr-TR')}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Not:</strong> {latestOffer.note || '-'}
                </p>
                <p className="text-gray-300 mb-2">
                  <strong>Müşteri Kararı:</strong> {latestOffer.customer_decision || '-'}
                </p>
                <p className="text-gray-300 mb-4">
                  <strong>Admin Onayı:</strong> {latestOffer.admin_approval || '-'}
                </p>

                <button
                  onClick={() => (window.location.href = '/verdigim-teklifler')}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
                >
                  Tüm Teklifleri Gör
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
            <h2 className="text-2xl text-orange-500 mb-4">Hızlı İşlemler</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => (window.location.href = '/ilan-pazari')}
                className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl"
              >
                🛒 İlan Pazarına Git
              </button>

              <button
                onClick={() => (window.location.href = '/vinclerim')}
                className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-xl"
              >
                🏗️ Vinçlerimi Yönet
              </button>

              <button
                onClick={() => (window.location.href = '/verdigim-teklifler')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl"
              >
                📨 Tekliflerimi Gör
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}