import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pendingProviders: 0,
    pendingOffers: 0,
    unlockedContacts: 0,
    totalJobs: 0,
    pendingProfileRequests: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const { data: providers } = await supabase
        .from('provider_profiles')
        .select('id')
        .eq('approved', false);

      const { data: offers } = await supabase
        .from('offers')
        .select('*');

      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id');

      const { data: profileRequests } = await supabase
        .from('profile_update_requests')
        .select('id')
        .eq('status', 'pending');

      const allOffers = offers || [];

      setStats({
        pendingProviders: providers?.length || 0,
        pendingOffers: allOffers.filter(
          (o) => o.customer_decision === 'accepted' && o.admin_approval !== 'approved'
        ).length,
        unlockedContacts: allOffers.filter(
          (o) => o.contact_unlocked === true
        ).length,
        totalJobs: jobs?.length || 0,
        pendingProfileRequests: profileRequests?.length || 0,
      });
    } catch (err) {
      alert(err.message);
    }
  }

  const adminMenu = [
    { label: '🏠 Admin Paneli', path: '/admin', onClick: () => {} },
    { label: '📨 Teklifler', path: '/admin/offers', onClick: () => (window.location.href = '/admin/offers') },
    { label: '🏗️ Hizmet Verenler', path: '/admin/providers', onClick: () => (window.location.href = '/admin/providers') },
    { label: '🛠️ Talepler', path: '/admin/talepler', onClick: () => (window.location.href = '/admin/talepler') },
    {
      label: '🚪 Çıkış Yap',
      onClick: () => {
        localStorage.removeItem('admin_token');
        window.location.href = '/admin/login';
      },
    },
  ];

  return (
    <MainLayout title="Admin Paneli" menuItems={adminMenu}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-orange-500 mb-2">
            Admin Paneli
          </h1>
          <p className="text-gray-400">
            Sistem genelindeki onayları, talepleri ve teklifleri buradan yönet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
          <button
            onClick={() => (window.location.href = '/admin/providers')}
            className="text-left bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 hover:border-orange-500 hover:bg-[#202329] transition"
          >
            <h2 className="text-lg text-gray-400">Onay Bekleyen Provider</h2>
            <p className="text-4xl font-bold mt-2">{stats.pendingProviders}</p>
            <p className="text-sm text-gray-500 mt-3">Detayları aç</p>
          </button>

          <button
            onClick={() => (window.location.href = '/admin/offers')}
            className="text-left bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 hover:border-orange-500 hover:bg-[#202329] transition"
          >
            <h2 className="text-lg text-gray-400">Onay Bekleyen Teklif</h2>
            <p className="text-4xl font-bold mt-2">{stats.pendingOffers}</p>
            <p className="text-sm text-gray-500 mt-3">Teklifleri incele</p>
          </button>

          <button
            onClick={() => (window.location.href = '/admin/offers')}
            className="text-left bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 hover:border-orange-500 hover:bg-[#202329] transition"
          >
            <h2 className="text-lg text-gray-400">Açılan İletişim</h2>
            <p className="text-4xl font-bold mt-2">{stats.unlockedContacts}</p>
            <p className="text-sm text-gray-500 mt-3">Onaylı işleri gör</p>
          </button>

          <button
            onClick={() => (window.location.href = '/admin/talepler')}
            className="text-left bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 hover:border-orange-500 hover:bg-[#202329] transition"
          >
            <h2 className="text-lg text-gray-400">Profil Talepleri</h2>
            <p className="text-4xl font-bold mt-2">{stats.pendingProfileRequests}</p>
            <p className="text-sm text-gray-500 mt-3">Talepleri incele</p>
          </button>

          <button
            onClick={() => (window.location.href = '/admin/offers')}
            className="text-left bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 hover:border-orange-500 hover:bg-[#202329] transition"
          >
            <h2 className="text-lg text-gray-400">Toplam İlan</h2>
            <p className="text-4xl font-bold mt-2">{stats.totalJobs}</p>
            <p className="text-sm text-gray-500 mt-3">Genel durumu gör</p>
          </button>
        </div>

        <div className="mt-2 flex gap-4 flex-wrap">
          <button
            onClick={() => (window.location.href = '/admin/offers')}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl"
          >
            🛠 Teklifleri Yönet
          </button>

          <button
            onClick={() => (window.location.href = '/admin/providers')}
            className="bg-orange-500 hover:bg-orange-600 px-5 py-2.5 rounded-xl"
          >
            📄 Provider Evrakları
          </button>

          <button
            onClick={() => (window.location.href = '/admin/talepler')}
            className="bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-xl"
          >
            📝 Güncelleme Talepleri
          </button>
        </div>
      </div>
    </MainLayout>
  );
}