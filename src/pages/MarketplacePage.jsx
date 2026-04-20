import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const API_URL = import.meta.env.VITE_API_URL;

export default function MarketplacePage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [providerApproved, setProviderApproved] = useState(false);
  const [providerProfileExists, setProviderProfileExists] = useState(false);

  const [detailJob, setDetailJob] = useState(null);
  const [offeredJobIds, setOfferedJobIds] = useState([]);

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [pickupCityFilter, setPickupCityFilter] = useState('all');
  const [dropoffCityFilter, setDropoffCityFilter] = useState('all');

  const [selectedJob, setSelectedJob] = useState(null);
  const [offerForm, setOfferForm] = useState({
    price: '',
    note: '',
  });

  const cityOptions = useMemo(() => {
    const allCities = new Set();

    jobs.forEach((job) => {
      if (job.pickup_city) allCities.add(job.pickup_city);
      if (job.dropoff_city) allCities.add(job.dropoff_city);
    });

    return Array.from(allCities).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [jobs]);

  useEffect(() => {
    loadJobs();
    loadProviderApproval();
    loadMyOffers();
  }, []);

  async function loadMyOffers() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('offers')
        .select('job_post_id')
        .eq('provider_user_id', user.id);

      if (error) throw error;

      setOfferedJobIds((data || []).map((item) => item.job_post_id));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadJobs() {
    try {
      setLoading(true);

      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('job_posts')
        .select('*')
        .eq('status', 'open')
        .gte('expiry_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadProviderApproval() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('provider_profiles')
        .select('approved')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProviderProfileExists(true);
        setProviderApproved(!!data.approved);
      } else {
        setProviderProfileExists(false);
        setProviderApproved(false);
      }
    } catch (err) {
      alert(err.message);
    }
  }

  async function sendOffer() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !selectedJob) {
        throw new Error('Eksik veri');
      }

      if (!offerForm.price) {
        throw new Error('Lütfen fiyat gir.');
      }

      const { data: existingOffer, error: existingError } = await supabase
        .from('offers')
        .select('id')
        .eq('job_post_id', selectedJob.id)
        .eq('provider_user_id', user.id)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingOffer) {
        throw new Error('Bu ilana zaten teklif verdin.');
      }

      const { error } = await supabase.from('offers').insert([
        {
          job_post_id: selectedJob.id,
          provider_user_id: user.id,
          price: offerForm.price,
          note: offerForm.note,
        },
      ]);

      if (error) throw error;

      try {
        const notifyRes = await fetch(
            `${API_URL}/api/notifications/create-offer-notification`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job_post_id: selectedJob.id,
            }),
          }
        );

        if (notifyRes.ok) {
          await notifyRes.json().catch(() => null);
        }
      } catch {
        // bildirim başarısız olsa da teklif gönderimi bozulmasın
      }

      alert('Teklif gönderildi');
      setOfferedJobIds((prev) => [...prev, selectedJob.id]);

      setOfferForm({
        price: '',
        note: '',
      });
      setSelectedJob(null);
    } catch (err) {
      alert(err.message);
    }
  }

  function statusText(job) {
    const today = new Date();
    const expiry = job.expiry_date ? new Date(job.expiry_date) : null;

    if (expiry && expiry < new Date(today.toDateString())) {
      return {
        text: 'Süresi Doldu',
        className: 'bg-red-500/20 text-red-400',
      };
    }

    return {
      text: 'Açık İlan',
      className: 'bg-green-500/20 text-green-400',
    };
  }

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        (job.title || '').toLowerCase().includes(q) ||
        (job.description || '').toLowerCase().includes(q) ||
        (job.pickup_city || '').toLowerCase().includes(q) ||
        (job.pickup_district || '').toLowerCase().includes(q) ||
        (job.dropoff_city || '').toLowerCase().includes(q) ||
        (job.dropoff_district || '').toLowerCase().includes(q);

      const matchesPickupCity =
        pickupCityFilter === 'all' || job.pickup_city === pickupCityFilter;

      const matchesDropoffCity =
        dropoffCityFilter === 'all' || job.dropoff_city === dropoffCityFilter;

      return matchesSearch && matchesPickupCity && matchesDropoffCity;
    });
  }, [jobs, search, pickupCityFilter, dropoffCityFilter]);

  return (
    <MainLayout
      title="İlan Pazarı"
      menuItems={[
        { label: '🏠 Anasayfa', onClick: () => (window.location.href = '/') },
        { label: '🛒 İlan Pazarı', onClick: () => {} },
        { label: '🏗️ Vinçlerim', onClick: () => (window.location.href = '/vinclerim') },
        { label: '📨 Verdiğim Teklifler', onClick: () => (window.location.href = '/verdigim-teklifler') },
        { label: '👤 Profilim', onClick: () => (window.location.href = '/profilim') },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
      ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl text-white mb-2">İlan Pazarı</h1>
          <p className="text-gray-400">
            Açık ilanları görüntüleyin ve uygun işlere teklif verin.
          </p>
        </div>

        {providerProfileExists ? (
          providerApproved ? (
            <div className="bg-green-500/10 border border-green-700 rounded-2xl p-4">
              <p className="text-green-400 font-semibold text-lg">
                ✅ Teklif vermeye hazırsın
              </p>
              <p className="text-gray-300 text-sm mt-1">
                Onaylı hizmet veren hesabın ile ilanlara teklif verebilirsin.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-500/10 border border-yellow-700 rounded-2xl p-4">
              <p className="text-yellow-400 font-semibold text-lg">
                ⏳ Admin onayı bekleniyor
              </p>
              <p className="text-gray-300 text-sm mt-1">
                Evrak onayın tamamlanmadan teklif veremezsin.
              </p>
            </div>
          )
        ) : (
          <div className="bg-red-500/10 border border-red-700 rounded-2xl p-4">
            <p className="text-red-400 font-semibold text-lg">
              ⚠️ Profil doğrulaması eksik
            </p>
            <p className="text-gray-300 text-sm mt-1">
              Teklif verebilmek için önce profilinden operatör bilgilerini ve belgelerini tamamlamalısın.
            </p>
            <button
              onClick={() => (window.location.href = '/profilim')}
              className="mt-3 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
            >
              Profile Git
            </button>
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
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

          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="İlan başlığı, açıklama veya konum ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#111315] border border-[#2a2d33] px-4 py-2.5 rounded-xl text-white w-full md:w-64 text-sm"
            />

            <select
              value={pickupCityFilter}
              onChange={(e) => setPickupCityFilter(e.target.value)}
              className="bg-[#111315] border border-[#2a2d33] px-4 py-2.5 rounded-xl text-white w-full md:w-40 text-sm"
            >
              <option value="all">Alınacak İl - Tümü</option>
              {cityOptions.map((city) => (
                <option key={`pickup-${city}`} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <select
              value={dropoffCityFilter}
              onChange={(e) => setDropoffCityFilter(e.target.value)}
              className="bg-[#111315] border border-[#2a2d33] px-4 py-2.5 rounded-xl text-white w-full md:w-40 text-sm"
            >
              <option value="all">Bırakılacak İl - Tümü</option>
              {cityOptions.map((city) => (
                <option key={`dropoff-${city}`} value={city}>
                  {city}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setSearch('');
                setPickupCityFilter('all');
                setDropoffCityFilter('all');
              }}
              className="bg-[#1a1c20] border border-[#2a2d33] hover:bg-[#202329] text-white px-4 py-2.5 rounded-xl text-sm whitespace-nowrap"
            >
              Temizle
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 text-gray-400">
            Yükleniyor...
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 text-gray-400">
            Uygun ilan bulunamadı.
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredJobs.map((job) => {
              const status = statusText(job);

              return (
                <div
                  key={job.id}
                  className="group bg-[#171a1f] border border-[#2a2d33] rounded-[24px] overflow-hidden transition-all duration-300 hover:border-orange-500/40 hover:shadow-[0_12px_35px_rgba(0,0,0,0.35)]"
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
                        📋 İlan Görseli Yok
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-80" />

                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-black/60 text-white backdrop-blur max-w-[220px] truncate inline-block">
                        📍 {job.pickup_city || '-'} → {job.dropoff_city || '-'}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur ${status.className}`}>
                        {status.text}
                      </span>

                      {offeredJobIds.includes(job.id) && (
                        <div className="mt-2">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">
                            Teklif Verildi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-white font-semibold text-xl leading-snug line-clamp-2">
                        {job.title}
                      </h3>

                      <div className="shrink-0 text-right">
                        <div className="text-xs text-gray-400">Rota</div>
                        <div className="text-orange-400 font-bold text-sm leading-5">
                          {job.pickup_city || '-'} → {job.dropoff_city || '-'}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-gray-300 mt-4 space-y-1">
                      <p>📍 Alınacak: {job.pickup_city || '-'} / {job.pickup_district || '-'}</p>
                      <p>🚚 Bırakılacak: {job.dropoff_city || '-'} / {job.dropoff_district || '-'}</p>
                    </div>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                        `${job.pickup_district || ''} ${job.pickup_city || ''} Türkiye`
                      )}&destination=${encodeURIComponent(
                        `${job.dropoff_district || ''} ${job.dropoff_city || ''} Türkiye`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 mt-4 bg-[#111315] border border-[#2a2d33] hover:border-orange-500/40 text-white px-4 py-2 rounded-xl text-sm transition"
                    >
                      🗺 Rotayı Haritada Aç
                    </a>

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

                    <div className="flex gap-2 mt-5">
                      <button
                        type="button"
                        onClick={() => setDetailJob(job)}
                        className="flex-1 bg-[#23272f] hover:bg-[#2c313a] text-white px-4 py-3 rounded-xl text-sm font-medium transition"
                      >
                        Detay
                      </button>

                      <button
                        onClick={() => {
                          if (!providerApproved) {
                            alert('Teklif verebilmek için önce admin onayı almalısın.');
                            return;
                          }

                          if (offeredJobIds.includes(job.id)) {
                            alert('Bu ilana zaten teklif verdin.');
                            return;
                          }

                          setSelectedJob(job);
                        }}
                        className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                          providerApproved
                            ? 'bg-orange-500 hover:bg-orange-600 text-white'
                            : 'bg-gray-600 cursor-not-allowed text-white'
                        }`}
                      >
                        {providerApproved ? 'Teklif Ver' : 'Onay Bekleniyor'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#1a1c20] rounded-2xl overflow-hidden border border-[#2a2d33]">
            <table className="w-full text-sm">
              <thead className="text-gray-400 border-b border-[#2a2d33] bg-[#141618]">
                <tr>
                  <th className="p-4 text-left">İlan</th>
                  <th className="p-4 text-left">Rota</th>
                  <th className="p-4 text-left">İş Tarihi</th>
                  <th className="p-4 text-left">Durum</th>
                  <th className="p-4 text-left">İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredJobs.map((job) => {
                  const status = statusText(job);

                  return (
                    <tr
                      key={job.id}
                      className="border-b border-[#2a2d33] hover:bg-[#202329] align-top"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white text-base">{job.title}</div>
                        <div className="text-gray-500 text-xs mt-1 line-clamp-2">
                          {job.description || '-'}
                        </div>
                      </td>

                      <td className="p-4 text-gray-300">
                        <div>{job.pickup_city || '-'} / {job.pickup_district || '-'}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          → {job.dropoff_city || '-'} / {job.dropoff_district || '-'}
                        </div>
                      </td>

                      <td className="p-4 text-gray-300">
                        {job.job_date || '-'}
                        <div className="text-gray-500 text-xs mt-1">
                          Bitiş: {job.expiry_date || '-'}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                          {status.text}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => {
                            if (offeredJobIds.includes(job.id)) {
                              alert('Bu ilana zaten teklif verdin.');
                              return;
                            }

                            if (!providerApproved) {
                              alert('Teklif verebilmek için önce admin onayı almalısın.');
                              return;
                            }

                            setSelectedJob(job);
                          }}
                          className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                            offeredJobIds.includes(job.id)
                              ? 'bg-blue-600 text-white cursor-not-allowed'
                              : providerApproved
                              ? 'bg-orange-500 hover:bg-orange-600 text-white'
                              : 'bg-gray-600 cursor-not-allowed text-white'
                          }`}
                        >
                          {offeredJobIds.includes(job.id)
                            ? 'Teklif Verildi'
                            : providerApproved
                            ? 'Teklif Ver'
                            : 'Onay Bekleniyor'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {detailJob && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-3xl bg-[#1a1c20] rounded-2xl border border-[#2a2d33] overflow-hidden">
              {detailJob.image_url ? (
                <img
                  src={detailJob.image_url}
                  alt={detailJob.title}
                  className="w-full h-72 object-cover"
                />
              ) : (
                <div className="w-full h-72 bg-[#111315] flex items-center justify-center text-gray-500">
                  📋 İlan Görseli Yok
                </div>
              )}

              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{detailJob.title}</h2>
                    <p className="text-gray-400 mt-2">
                      📍 {detailJob.pickup_city || '-'} / {detailJob.pickup_district || '-'}
                    </p>
                    <p className="text-gray-500 mt-1">
                      🚚 {detailJob.dropoff_city || '-'} / {detailJob.dropoff_district || '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-400">Rota</div>
                    <div className="text-xl font-bold text-orange-400">
                      {detailJob.pickup_city || '-'} → {detailJob.dropoff_city || '-'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">İş Tarihi</div>
                    <div className="text-white mt-1">{detailJob.job_date || '-'}</div>
                  </div>

                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">İlan Bitiş Tarihi</div>
                    <div className="text-white mt-1">{detailJob.expiry_date || '-'}</div>
                  </div>

                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4">
                    <div className="text-xs text-gray-400">Durum</div>
                    <div className="text-white mt-1">{statusText(detailJob).text}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="text-sm text-gray-400 mb-2">Açıklama</div>
                  <div className="bg-[#111315] border border-[#2a2d33] rounded-xl p-4 text-gray-200 leading-7">
                    {detailJob.description || 'Açıklama bulunmuyor.'}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setDetailJob(null)}
                    className="bg-[#2a2d33] hover:bg-[#343944] text-white px-5 py-3 rounded-xl"
                  >
                    Kapat
                  </button>

                  <button
                    onClick={() => {
                      setDetailJob(null);

                      if (offeredJobIds.includes(detailJob.id)) {
                        alert('Bu ilana zaten teklif verdin.');
                        return;
                      }

                      if (!providerApproved) {
                        alert('Teklif verebilmek için önce admin onayı almalısın.');
                        return;
                      }

                      setSelectedJob(detailJob);
                    }}
                    className={`px-5 py-3 rounded-xl text-white ${
                      offeredJobIds.includes(detailJob.id)
                        ? 'bg-blue-600 cursor-not-allowed'
                        : providerApproved
                        ? 'bg-orange-500 hover:bg-orange-600'
                        : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    {offeredJobIds.includes(detailJob.id)
                      ? 'Teklif Verildi'
                      : providerApproved
                      ? 'Teklif Ver'
                      : 'Onay Bekleniyor'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedJob && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="w-full max-w-xl bg-[#1a1c20] rounded-2xl border border-[#2a2d33] p-6">
              <h2 className="text-2xl font-bold text-white">Teklif Ver</h2>
              <p className="text-gray-400 mt-1">{selectedJob.title}</p>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-sm text-gray-400">Fiyat</label>
                  <input
                    value={offerForm.price}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, price: e.target.value })
                    }
                    placeholder="Örn. 25000"
                    className="mt-2 w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400">Not</label>
                  <textarea
                    value={offerForm.note}
                    onChange={(e) =>
                      setOfferForm({ ...offerForm, note: e.target.value })
                    }
                    rows={4}
                    placeholder="Teklif notu"
                    className="mt-2 w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={sendOffer}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-3 rounded-xl"
                >
                  Teklifi Gönder
                </button>

                <button
                  onClick={() => setSelectedJob(null)}
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