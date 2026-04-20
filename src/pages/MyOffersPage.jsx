import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const API_URL = import.meta.env.VITE_API_URL;

export default function MyOffersPage() {
  const [offers, setOffers] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadOffers();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  function hasAcceptedOffer(jobPostId) {
    return offers.some(
      (offer) =>
        offer.job_post_id === jobPostId &&
        offer.customer_decision === 'accepted'
    );
  }

  async function loadOffers() {
    try {
      setLoading(true);
      setContacts({});

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOffers([]);
        return;
      }

      const { data: jobs, error: jobsError } = await supabase
        .from('job_posts')
        .select('id, title')
        .eq('user_id', user.id);

      if (jobsError) throw jobsError;

      const jobIds = (jobs || []).map((job) => job.id);

      if (jobIds.length === 0) {
        setOffers([]);
        return;
      }

      const jobsMap = Object.fromEntries(
        (jobs || []).map((job) => [job.id, job.title || 'İlan'])
      );

      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .in('job_post_id', jobIds)
        .order('created_at', { ascending: false });

      if (offersError) throw offersError;

      const providerIds = [
        ...new Set(
          (offersData || [])
            .map((offer) => offer.provider_user_id)
            .filter(Boolean)
        ),
      ];

      let usersMap = {};

      if (providerIds.length > 0) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, phone')
          .in('id', providerIds);

        if (usersError) throw usersError;

        usersMap = Object.fromEntries(
          (usersData || []).map((u) => [
            u.id,
            {
              name: u.full_name || u.email || 'Hizmet Veren',
              phone: u.phone || '',
            },
          ])
        );
      }

      const mergedOffers = (offersData || []).map((offer) => ({
        ...offer,
        provider_name:
          usersMap[offer.provider_user_id]?.name || 'Hizmet Veren',
        provider_phone_raw:
          usersMap[offer.provider_user_id]?.phone || '',
        job_title: jobsMap[offer.job_post_id] || 'İlan',
      }));

      setOffers(mergedOffers);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Teklifler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(offerId, decision) {
    try {
      const selectedOffer = offers.find((offer) => offer.id === offerId);

      if (!selectedOffer) {
        throw new Error('Teklif bulunamadı');
      }

      if (decision === 'accepted') {
        if (hasAcceptedOffer(selectedOffer.job_post_id)) {
          alert('Bu ilan için zaten bir teklif kabul edilmiş.');
          return;
        }

        const { error: rejectOthersError } = await supabase
          .from('offers')
          .update({ customer_decision: 'rejected' })
          .eq('job_post_id', selectedOffer.job_post_id);

        if (rejectOthersError) throw rejectOthersError;

        const { error: acceptError } = await supabase
          .from('offers')
          .update({ customer_decision: 'accepted' })
          .eq('id', offerId);

        if (acceptError) throw acceptError;

        // 🔔 Provider'a bildirim gönder
        await fetch(`${API_URL}/api/notifications/create-offer-accepted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            offer_id: offerId,
        }),
        });

      } else {
        const { error } = await supabase
          .from('offers')
          .update({ customer_decision: 'rejected' })
          .eq('id', offerId);

        if (error) throw error;
      }

      alert('Karar kaydedildi');
      loadOffers();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Karar kaydedilemedi');
    }
  }

  async function fetchContact(offerId) {
    try {
      const res = await fetch(
         `${API_URL}/api/offers/${offerId}/contact/customer`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'İletişim alınamadı');
      }

      setContacts((prev) => ({
        ...prev,
        [offerId]: data.provider_phone || '',
      }));
    } catch (err) {
      console.error(err);
      alert(err.message || 'İletişim alınamadı');
    }
  }

  function statusBadge(offer) {
    if (offer.admin_approval === 'approved') {
      return {
        text: 'Onaylandı',
        className: 'bg-green-500/20 text-green-400',
      };
    }

    if (
      offer.customer_decision === 'rejected' ||
      offer.admin_approval === 'rejected'
    ) {
      return {
        text: 'Reddedildi',
        className: 'bg-red-500/20 text-red-400',
      };
    }

    if (offer.customer_decision === 'accepted') {
      return {
        text: 'Admin Bekliyor',
        className: 'bg-yellow-500/20 text-yellow-400',
      };
    }

    return {
      text: 'Beklemede',
      className: 'bg-blue-500/20 text-blue-400',
    };
  }

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;

    return offers.filter((offer) => {
      return (
        (offer.provider_name || '').toLowerCase().includes(q) ||
        (offer.job_title || '').toLowerCase().includes(q) ||
        String(offer.price || '').toLowerCase().includes(q)
      );
    });
  }, [offers, search]);

  const total = offers.length;
  const approved = offers.filter(
    (offer) => offer.admin_approval === 'approved'
  ).length;
  const pending = offers.filter(
    (offer) => offer.customer_decision === 'pending'
  ).length;

  return (
    <MainLayout
      title="Gelen Teklifler"
      menuItems={[
        { label: '🏠 Anasayfa', onClick: () => (window.location.href = '/') },
        { label: '📋 İlanlarım', onClick: () => (window.location.href = '/ilanlarim') },
        { label: '💬 Gelen Teklifler', onClick: () => {} },
        { label: '👤 Profilim', onClick: () => (window.location.href = '/profilim') },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
    ]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl text-white mb-2">Teklifler</h1>
          <p className="text-gray-400">
            {total} teklif · {pending} beklemede
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Stat title="Toplam Teklif" value={total} />
          <Stat title="Onaylanan" value={approved} green />
          <Stat title="Beklemede" value={pending} yellow />
        </div>

        <div className="flex justify-end">
          <input
            placeholder="Teklif veren veya ilan ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#111315] border border-[#2a2d33] p-3 rounded-xl text-white w-full md:w-80"
          />
        </div>

        <div className="bg-[#1a1c20] rounded-2xl overflow-hidden border border-[#2a2d33]">
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-[#2a2d33] bg-[#141618]">
              <tr>
                <th className="p-4 text-left">Teklif Veren</th>
                <th className="p-4 text-left">İlan</th>
                <th className="p-4 text-left">Fiyat</th>
                <th className="p-4 text-left">Durum</th>
                <th className="p-4 text-left">Tarih</th>
                <th className="p-4 text-left">İşlem</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-6 text-gray-400">
                    Yükleniyor...
                  </td>
                </tr>
              ) : filteredOffers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-6 text-gray-400">
                    Teklif bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOffers.map((offer) => {
                  const badge = statusBadge(offer);

                  return (
                    <tr
                      key={offer.id}
                      className="border-b border-[#2a2d33] hover:bg-[#202329] align-top"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-white">
                          {offer.provider_name}
                        </div>
                      </td>

                      <td className="p-4 text-gray-300">
                        {offer.job_title}
                      </td>

                      <td className="p-4 font-bold text-white">
                        ₺{Number(offer.price || 0).toLocaleString('tr-TR')}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
                        >
                          {badge.text}
                        </span>
                      </td>

                      <td className="p-4 text-gray-300">
                        {offer.created_at
                          ? new Date(offer.created_at).toLocaleDateString('tr-TR')
                          : '-'}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2">
                          {offer.customer_decision === 'pending' &&
                            !hasAcceptedOffer(offer.job_post_id) && (
                              <>
                                <button
                                  onClick={() =>
                                    handleDecision(offer.id, 'accepted')
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl"
                                >
                                  Kabul Et
                                </button>

                                <button
                                  onClick={() =>
                                    handleDecision(offer.id, 'rejected')
                                  }
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl"
                                >
                                  Reddet
                                </button>
                              </>
                            )}

                          {offer.contact_unlocked ? (
                            <>
                              <button
                                onClick={() => fetchContact(offer.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl"
                              >
                                📞 Numarayı Göster
                              </button>

                              {contacts[offer.id] && (
                                <>
                                  <p className="text-green-400 text-sm">
                                    Hizmet veren telefon: {contacts[offer.id]}
                                  </p>

                                  <a
                                    href={`https://wa.me/90${contacts[
                                      offer.id
                                    ].replace(/\D/g, '')}?text=Merhaba, ilanınız için yazıyorum.`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-block bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-center"
                                  >
                                    💬 WhatsApp
                                  </a>
                                </>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-500 text-xs">
                              İletişim henüz açılmadı
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
}

function Stat({ title, value, green, yellow }) {
  return (
    <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-5">
      <p className="text-gray-400 text-sm">{title}</p>
      <h2
        className={`text-4xl font-bold mt-2 ${
          green ? 'text-green-400' : yellow ? 'text-yellow-400' : 'text-white'
        }`}
      >
        {value}
      </h2>
    </div>
  );
}