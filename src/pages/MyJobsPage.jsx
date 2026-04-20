import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

export default function MyJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    pickup_city: '',
    pickup_district: '',
    dropoff_city: '',
    dropoff_district: '',
    job_date: '',
    expiry_date: '',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadJobs() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/auth';
        return;
      }

      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getStatus(job) {
    if (job.status === 'closed') {
      return {
        text: 'Kapalı',
        className: 'bg-red-500/10 text-red-400',
      };
    }

    const today = new Date();
    const expiry = job.expiry_date ? new Date(job.expiry_date) : null;

    if (expiry && expiry < new Date(today.toDateString())) {
      return {
        text: 'Süresi Doldu',
        className: 'bg-red-500/10 text-red-400',
      };
    }

    return {
      text: 'Aktif',
      className: 'bg-green-500/10 text-green-400',
    };
  }

  function isExpiringSoon(expiryDate) {
    if (!expiryDate) return false;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffMs = expiry - today;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 0 && diffDays <= 3;
  }

  function openEdit(job) {
    setEditingJob(job);
    setEditForm({
      title: job.title || '',
      description: job.description || '',
      pickup_city: job.pickup_city || '',
      pickup_district: job.pickup_district || '',
      dropoff_city: job.dropoff_city || '',
      dropoff_district: job.dropoff_district || '',
      job_date: job.job_date || '',
      expiry_date: job.expiry_date || '',
    });
    setShowEditModal(true);
  }

  async function updateJob() {
    try {
      if (!editingJob) return;

      setEditSaving(true);

      const { error } = await supabase
        .from('job_posts')
        .update({
          title: editForm.title,
          description: editForm.description,
          pickup_city: editForm.pickup_city,
          pickup_district: editForm.pickup_district,
          dropoff_city: editForm.dropoff_city,
          dropoff_district: editForm.dropoff_district,
          job_date: editForm.job_date,
          expiry_date: editForm.expiry_date,
        })
        .eq('id', editingJob.id);

      if (error) throw error;

      alert('İlan güncellendi');
      setShowEditModal(false);
      setEditingJob(null);
      loadJobs();
    } catch (err) {
      alert(err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function deleteJob(id) {
    const ok = window.confirm('Bu ilanı silmek istediğine emin misin?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('job_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setJobs((prev) => prev.filter((job) => job.id !== id));
      alert('İlan silindi');
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return jobs;

    return jobs.filter((job) => {
      return (
        (job.title || '').toLowerCase().includes(q) ||
        (job.description || '').toLowerCase().includes(q) ||
        (job.pickup_city || '').toLowerCase().includes(q) ||
        (job.pickup_district || '').toLowerCase().includes(q) ||
        (job.dropoff_city || '').toLowerCase().includes(q) ||
        (job.dropoff_district || '').toLowerCase().includes(q)
      );
    });
  }, [jobs, search]);

  const customerMenu = [
    { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
    { label: '➕ Yeni İlan Oluştur', path: '/ilan-olustur', onClick: () => (window.location.href = '/ilan-olustur') },
    { label: '📋 İlanlarım', path: '/ilanlarim', onClick: () => {} },
    { label: '💬 Gelen Teklifler', path: '/gelen-teklifler', onClick: () => (window.location.href = '/gelen-teklifler') },
    { label: '👤 Profilim', path: '/profilim', onClick: () => (window.location.href = '/profilim') },
    { label: '🚪 Çıkış Yap', onClick: handleLogout },
  ];

  return (
    <MainLayout title="İlanlarım" menuItems={customerMenu}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl text-white mb-2">İlanlarım</h1>
          <p className="text-gray-400">
            Oluşturduğun ilanları görüntüle, düzenle veya sil.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-4 py-2 rounded-xl text-sm ${
                viewMode === 'grid'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1c20] text-gray-400 border border-[#2a2d33]'
              }`}
            >
              🟦 Pano
            </button>

            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-xl text-sm ${
                viewMode === 'list'
                  ? 'bg-orange-500 text-white'
                  : 'bg-[#1a1c20] text-gray-400 border border-[#2a2d33]'
              }`}
            >
              📄 Liste
            </button>
          </div>

          <input
            placeholder="İlan ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111315] border border-[#2a2d33] p-3 rounded-xl text-white w-full md:w-80"
          />
        </div>

        {loading ? (
          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 text-gray-400">
            Yükleniyor...
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredJobs.length === 0 ? (
              <div className="col-span-full bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 text-gray-400">
                Henüz ilan oluşturmadın.
              </div>
            ) : (
              filteredJobs.map((job) => {
                const status = getStatus(job);

                return (
                  <div
                    key={job.id}
                    className="group bg-[#171a1f] border border-[#2a2d33] rounded-[24px] overflow-hidden hover:border-orange-500/40 hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)] transition-all duration-300"
                  >
                    <div className="relative overflow-hidden">
                      {job.image_url ? (
                        <img
                          src={job.image_url}
                          alt={job.title}
                          className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="h-52 bg-[#111315] flex items-center justify-center text-gray-500 border-b border-[#2a2d33]">
                          📷 Fotoğraf Yok
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

                      <div className="absolute top-3 left-3">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur max-w-[200px] truncate inline-block">
                          📍 {job.pickup_city || '-'} / {job.pickup_district || '-'}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur ${status.className}`}>
                          {status.text}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-white font-semibold text-xl leading-snug">
                          {job.title}
                        </h3>

                        <div className="shrink-0 text-right">
                          <div className="text-xs text-gray-400">Rota</div>
                          <div className="text-orange-400 font-bold text-sm leading-5">
                            {job.pickup_city || '-'} → {job.dropoff_city || '-'}
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-300 mt-4 min-h-[60px]">
                        {job.description || 'Açıklama bulunmuyor.'}
                      </p>

                      <div className="text-sm text-gray-300 mt-4 space-y-1">
                        <p>📍 Alınacak: {job.pickup_city || '-'} / {job.pickup_district || '-'}</p>
                        <p>🚚 Bırakılacak: {job.dropoff_city || '-'} / {job.dropoff_district || '-'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-3">
                          <div className="text-xs text-gray-400">İş Tarihi</div>
                          <div className="text-sm text-white mt-1">
                            {job.job_date || '-'}
                          </div>
                        </div>

                        <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-3">
                          <div className="text-xs text-gray-400">Bitiş Tarihi</div>
                          <div className="text-sm text-white mt-1">
                            {job.expiry_date || '-'}
                          </div>
                        </div>
                      </div>

                      {isExpiringSoon(job.expiry_date) && (
                        <div className="mt-3 text-xs text-yellow-400">
                          ⏳ Bu ilanın süresi yaklaşıyor
                        </div>
                      )}

                      <div className="flex gap-2 mt-5">
                        <button
                          onClick={() => openEdit(job)}
                          className="flex-1 bg-[#23272f] hover:bg-[#2c313a] text-white px-4 py-3 rounded-xl text-sm font-medium transition"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          onClick={() => deleteJob(job.id)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition"
                        >
                          🗑 Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-[#1a1c20] rounded-2xl overflow-hidden border border-[#2a2d33]">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-gray-400 border-b border-[#2a2d33] bg-[#141618]">
                <tr>
                  <th className="p-4 text-left">İlan</th>
                  <th className="p-4 text-left">Tarih Bilgisi</th>
                  <th className="p-4 text-left">Durum</th>
                  <th className="p-4 text-left">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredJobs.map((job) => {
                  const status = getStatus(job);

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#2a2d33] hover:bg-[#202329] align-top transition"
                    >
                      <td className="p-4">
                        <div className="flex items-start gap-4">
                          {job.image_url ? (
                            <img
                              src={job.image_url}
                              alt={job.title}
                              className="w-24 h-20 object-cover rounded-xl border border-[#2a2d33] shrink-0"
                            />
                          ) : (
                            <div className="w-24 h-20 rounded-xl bg-[#111315] border border-[#2a2d33] flex items-center justify-center text-xs text-gray-500 shrink-0">
                              Fotoğraf Yok
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-semibold text-white text-base">
                              {job.title}
                            </div>

                            <div className="text-gray-400 text-sm mt-1">
                              📍 {job.pickup_city || '-'} / {job.pickup_district || '-'}
                            </div>

                            <div className="text-gray-500 text-xs mt-2">
                              🚚 {job.dropoff_city || '-'} / {job.dropoff_district || '-'}
                            </div>

                            <div className="text-gray-500 text-xs mt-2">
                              {job.description || 'Açıklama bulunmuyor.'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="space-y-3">
                          <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-2">
                            <div className="text-xs text-gray-400">İş Tarihi</div>
                            <div className="text-sm text-white mt-1">
                              {job.job_date || '-'}
                            </div>
                          </div>

                          <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-2">
                            <div className="text-xs text-gray-400">Bitiş Tarihi</div>
                            <div className="text-sm text-white mt-1">
                              {job.expiry_date || '-'}
                            </div>
                          </div>

                          {isExpiringSoon(job.expiry_date) && (
                            <div className="text-yellow-400 text-xs">
                              ⏳ Süresi yaklaşıyor
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.text}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => openEdit(job)}
                            className="bg-[#23272f] hover:bg-[#2c313a] text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                          >
                            ✏️ Düzenle
                          </button>

                          <button
                            onClick={() => deleteJob(job.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                          >
                            🗑 Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {showEditModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-2xl bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-4">İlanı Düzenle</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="İlan başlığı"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.job_date}
                  onChange={(e) => setEditForm({ ...editForm, job_date: e.target.value })}
                  type="date"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.pickup_city}
                  onChange={(e) => setEditForm({ ...editForm, pickup_city: e.target.value })}
                  placeholder="Alınacak il"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.pickup_district}
                  onChange={(e) => setEditForm({ ...editForm, pickup_district: e.target.value })}
                  placeholder="Alınacak ilçe"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.dropoff_city}
                  onChange={(e) => setEditForm({ ...editForm, dropoff_city: e.target.value })}
                  placeholder="Bırakılacak il"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.dropoff_district}
                  onChange={(e) => setEditForm({ ...editForm, dropoff_district: e.target.value })}
                  placeholder="Bırakılacak ilçe"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={editForm.expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                  type="date"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white md:col-span-2"
                />

                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Açıklama"
                  rows={4}
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white md:col-span-2"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateJob}
                  disabled={editSaving}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl disabled:opacity-50"
                >
                  {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>

                <button
                  onClick={() => setShowEditModal(false)}
                  className="bg-[#2a2d33] hover:bg-[#343944] text-white px-5 py-3 rounded-xl"
                >
                  Vazgeç
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}