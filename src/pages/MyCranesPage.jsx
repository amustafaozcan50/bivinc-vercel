import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

export default function MyCranesPage() {
  const [cranes, setCranes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingCrane, setEditingCrane] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    crane_type: '',
    plate: '',
    tonnage: '',
    city: '',
    model_year: '',
  });

  useEffect(() => {
    loadCranes();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadCranes() {
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
        .from('cranes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCranes(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openEditForm(crane) {
    setEditingCrane(crane);
    setForm({
      crane_type: crane.crane_type || '',
      plate: crane.plate || '',
      tonnage: crane.tonnage || '',
      city: crane.city || '',
      model_year: crane.model_year || '',
    });
    setShowForm(true);
  }

  async function saveCrane() {
    try {
      if (!editingCrane) return;

      setSaving(true);

      const { error } = await supabase
        .from('cranes')
        .update({
          crane_type: form.crane_type,
          plate: form.plate,
          tonnage: form.tonnage,
          city: form.city,
          model_year: form.model_year,
        })
        .eq('id', editingCrane.id);

      if (error) throw error;

      alert('Vinç güncellendi');
      setShowForm(false);
      setEditingCrane(null);
      loadCranes();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteCrane(id) {
    const ok = window.confirm('Bu vinci silmek istediğine emin misin?');
    if (!ok) return;

    try {
      const { error } = await supabase
        .from('cranes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCranes((prev) => prev.filter((crane) => crane.id !== id));
      alert('Vinç silindi');
    } catch (err) {
      alert(err.message);
    }
  }

  const filteredCranes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cranes;

    return cranes.filter((crane) => {
      return (
        (crane.crane_type || '').toLowerCase().includes(q) ||
        (crane.plate || '').toLowerCase().includes(q) ||
        (crane.city || '').toLowerCase().includes(q) ||
        String(crane.tonnage || '').toLowerCase().includes(q)
      );
    });
  }, [cranes, search]);

  const providerMenu = [
    { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
    { label: '🛒 İlan Pazarı', path: '/ilan-pazari', onClick: () => (window.location.href = '/ilan-pazari') },
    { label: '🏗️ Vinçlerim', path: '/vinclerim', onClick: () => {} },
    { label: '📨 Verdiğim Teklifler', path: '/verdigim-teklifler', onClick: () => (window.location.href = '/verdigim-teklifler') },
    { label: '👤 Profilim', path: '/profilim', onClick: () => (window.location.href = '/profilim') },
    { label: '🚪 Çıkış Yap', onClick: handleLogout },
  ];

  return (
    <MainLayout title="Vinçlerim" menuItems={providerMenu}>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl text-white mb-2">Vinçlerim</h1>
          <p className="text-gray-400">
            Kayıtlı vinçlerini görüntüle, düzenle veya sil.
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
            placeholder="Vinç ara..."
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
            {filteredCranes.length === 0 ? (
              <div className="col-span-full bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 text-gray-400">
                Henüz vinç eklemedin.
              </div>
            ) : (
              filteredCranes.map((crane) => (
                <div
                  key={crane.id}
                  className="group bg-[#171a1f] border border-[#2a2d33] rounded-[24px] overflow-hidden hover:border-orange-500/40 hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)] transition-all duration-300"
                >
                  <div className="relative overflow-hidden">
                    {crane.image_url ? (
                      <img
                        src={crane.image_url}
                        alt="vinç"
                        className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="h-52 bg-[#111315] flex items-center justify-center text-gray-500 border-b border-[#2a2d33]">
                        📷 Fotoğraf Yok
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur">
                        📍 {crane.city || '-'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 backdrop-blur">
                        {crane.status || 'active'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-white font-semibold text-xl leading-snug">
                        {crane.crane_type || 'Vinç'}
                      </h3>

                      <div className="shrink-0 text-right">
                        <div className="text-xs text-gray-400">Tonaj</div>
                        <div className="text-orange-400 font-bold text-lg">
                          {crane.tonnage ? `${crane.tonnage}T` : '-'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-3">
                        <div className="text-xs text-gray-400">Plaka</div>
                        <div className="text-sm text-white mt-1">
                          {crane.plate || '-'}
                        </div>
                      </div>

                      <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-3">
                        <div className="text-xs text-gray-400">Model Yılı</div>
                        <div className="text-sm text-white mt-1">
                          {crane.model_year || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-5">
                      <button
                        onClick={() => openEditForm(crane)}
                        className="flex-1 bg-[#23272f] hover:bg-[#2c313a] text-white px-4 py-3 rounded-xl text-sm font-medium transition"
                      >
                        ✏️ Düzenle
                      </button>

                      <button
                        onClick={() => deleteCrane(crane.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-sm font-semibold transition"
                      >
                        🗑 Sil
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="bg-[#1a1c20] rounded-2xl overflow-hidden border border-[#2a2d33]">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="text-gray-400 border-b border-[#2a2d33] bg-[#141618]">
                <tr>
                  <th className="p-4 text-left">Vinç</th>
                  <th className="p-4 text-left">Teknik Bilgiler</th>
                  <th className="p-4 text-left">Durum</th>
                  <th className="p-4 text-left">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredCranes.map((crane) => (
                  <tr
                    key={crane.id}
                    className="border-b border-[#2a2d33] hover:bg-[#202329] align-top transition"
                  >
                    <td className="p-4">
                      <div className="flex items-start gap-4">
                        {crane.image_url ? (
                          <img
                            src={crane.image_url}
                            alt="vinç"
                            className="w-24 h-20 object-cover rounded-xl border border-[#2a2d33] shrink-0"
                          />
                        ) : (
                          <div className="w-24 h-20 rounded-xl bg-[#111315] border border-[#2a2d33] flex items-center justify-center text-xs text-gray-500 shrink-0">
                            Fotoğraf Yok
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="font-semibold text-white text-base">
                            {crane.crane_type || '-'}
                          </div>

                          <div className="text-gray-400 text-sm mt-1">
                            📍 {crane.city || '-'}
                          </div>

                          <div className="text-gray-500 text-xs mt-2">
                            Plaka: {crane.plate || '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-2">
                          <div className="text-xs text-gray-400">Model Yılı</div>
                          <div className="text-sm text-white mt-1">
                            {crane.model_year || '-'}
                          </div>
                        </div>

                        <div className="bg-[#111315] border border-[#2a2d33] rounded-xl px-3 py-2">
                          <div className="text-xs text-gray-400">Tonaj</div>
                          <div className="text-sm text-orange-400 font-semibold mt-1">
                            {crane.tonnage ? `${crane.tonnage} Ton` : '-'}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                        {crane.status || 'active'}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => openEditForm(crane)}
                          className="bg-[#23272f] hover:bg-[#2c313a] text-white px-4 py-2 rounded-xl text-sm font-medium transition"
                        >
                          ✏️ Düzenle
                        </button>

                        <button
                          onClick={() => deleteCrane(crane.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                        >
                          🗑 Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-2xl bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
              <h2 className="text-2xl text-orange-500 mb-4">Vinç Düzenle</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={form.crane_type}
                  onChange={(e) => setForm({ ...form, crane_type: e.target.value })}
                  placeholder="Vinç tipi"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value })}
                  placeholder="Plaka"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={form.tonnage}
                  onChange={(e) => setForm({ ...form, tonnage: e.target.value })}
                  placeholder="Tonaj"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Şehir"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white"
                />

                <input
                  value={form.model_year}
                  onChange={(e) => setForm({ ...form, model_year: e.target.value })}
                  placeholder="Model yılı"
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-white md:col-span-2"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={saveCrane}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl disabled:opacity-50"
                >
                  {saving ? 'Kaydediliyor...' : 'Kaydet'}
                </button>

                <button
                  onClick={() => setShowForm(false)}
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