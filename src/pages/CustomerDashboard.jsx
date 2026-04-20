import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

export default function CustomerDashboard() {
  const [stats, setStats] = useState({
    jobsCount: 0,
    pendingOffers: 0,
    unlockedContacts: 0,
  });

  const [latestOffer, setLatestOffer] = useState(null);
  const [loading, setLoading] = useState(true);

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

      const { data: jobs, error: jobsError } = await supabase
        .from('job_posts')
        .select('id')
        .eq('user_id', user.id);

      if (jobsError) throw jobsError;

      const jobIds = (jobs || []).map((job) => job.id);

      if (jobIds.length === 0) {
        setStats({
          jobsCount: 0,
          pendingOffers: 0,
          unlockedContacts: 0,
        });
        setLatestOffer(null);
        return;
      }

      const { data: offers, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .in('job_post_id', jobIds)
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;

      const allOffers = offers || [];

      setStats({
        jobsCount: jobIds.length,
        pendingOffers: allOffers.filter(
          (offer) => offer.customer_decision === 'pending'
        ).length,
        unlockedContacts: allOffers.filter(
          (offer) => offer.contact_unlocked === true
        ).length,
      });

      setLatestOffer(allOffers[0] || null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function decisionText(value) {
    if (value === 'accepted') return 'Kabul Edildi';
    if (value === 'rejected') return 'Reddedildi';
    return 'Beklemede';
  }

  function adminApprovalText(value) {
    if (value === 'approved') return 'Onaylandı';
    if (value === 'rejected') return 'Reddedildi';
    return 'Beklemede';
  }

  return (
    <MainLayout
      title="Hizmet Alan Paneli"
      menuItems={[
        { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
        { label: '➕ Yeni İlan Oluştur', path: '/ilan-olustur', onClick: () => (window.location.href = '/ilan-olustur') },
        { label: '📋 İlanlarım', path: '/ilanlarim', onClick: () => (window.location.href = '/ilanlarim') },
        { label: '💬 Gelen Teklifler', path: '/gelen-teklifler', onClick: () => (window.location.href = '/gelen-teklifler') },
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
              İlanlarını yönet, teklifleri takip et ve süreci tek yerden kontrol et.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">İlanlarım</h2>
              <p className="text-4xl font-bold text-white">{stats.jobsCount}</p>
              <p className="text-gray-400 text-sm mt-2">
                Açtığın toplam ilan sayısı
              </p>
            </div>

            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">Bekleyen Teklifler</h2>
              <p className="text-4xl font-bold text-white">{stats.pendingOffers}</p>
              <p className="text-gray-400 text-sm mt-2">
                Karar vermeni bekleyen teklifler
              </p>
            </div>

            <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-2">Açılan İletişimler</h2>
              <p className="text-4xl font-bold text-white">{stats.unlockedContacts}</p>
              <p className="text-gray-400 text-sm mt-2">
                Admin onayı sonrası iletişimi açılan işler
              </p>
            </div>
          </div>

          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
            <h2 className="text-2xl text-orange-500 mb-4">Son Gelen Teklif</h2>

            {!latestOffer ? (
              <p className="text-gray-400">Henüz teklif bulunmuyor.</p>
            ) : (
              <div className="border border-[#2a2d33] rounded-xl p-4 bg-[#141618]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">Fiyat</div>
                    <div className="text-xl font-bold text-orange-400 mt-1">
                      ₺{Number(latestOffer.price || 0).toLocaleString('tr-TR')}
                    </div>
                  </div>

                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">Not</div>
                    <div className="text-sm text-white mt-1">
                      {latestOffer.note || '-'}
                    </div>
                  </div>

                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">Müşteri Kararı</div>
                    <div className="text-sm text-white mt-1">
                      {decisionText(latestOffer.customer_decision)}
                    </div>
                  </div>

                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">Admin Onayı</div>
                    <div className="text-sm text-white mt-1">
                      {adminApprovalText(latestOffer.admin_approval)}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => (window.location.href = '/gelen-teklifler')}
                  className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
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
                onClick={() => (window.location.href = '/ilan-olustur')}
                className="bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-xl"
              >
                ➕ Yeni İlan Oluştur
              </button>

              <button
                onClick={() => (window.location.href = '/ilanlarim')}
                className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-xl"
              >
                📋 İlanlarımı Yönet
              </button>

              <button
                onClick={() => (window.location.href = '/gelen-teklifler')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl"
              >
                💬 Teklifleri Gör
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}