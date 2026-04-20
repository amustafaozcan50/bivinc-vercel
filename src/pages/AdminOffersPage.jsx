import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const API_URL = import.meta.env.VITE_API_URL;

function durumBilgisi(offer) {
  if (offer.admin_approval === 'approved') {
    return {
      text: '✅ Onaylandı',
      className: 'bg-green-100 text-green-700',
    };
  }

  if (offer.customer_decision === 'rejected') {
    return {
      text: '❌ Reddedildi',
      className: 'bg-red-100 text-red-700',
    };
  }

  if (offer.customer_decision === 'accepted' && offer.admin_approval !== 'approved') {
    return {
      text: '⏳ Admin Onayı Bekliyor',
      className: 'bg-yellow-100 text-yellow-700',
    };
  }

  return {
    text: '🕒 Beklemede',
    className: 'bg-gray-100 text-gray-700',
  };
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadOffers();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function loadOffers() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOffers(data || []);
    } catch (err) {
      alert(err.message || 'Teklifler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  async function approveOffer(id) {
    try {
      setActionLoadingId(id);

      const selectedOffer = offers.find((offer) => offer.id === id);

      if (!selectedOffer) {
        throw new Error('Teklif bulunamadı');
      }

      if (!selectedOffer.provider_user_id) {
        throw new Error('Teklifte hizmet veren bilgisi eksik');
      }

      const { data: providerUser, error: providerError } = await supabase
        .from('users')
        .select('id, phone, full_name, email')
        .eq('id', selectedOffer.provider_user_id)
        .maybeSingle();

      if (providerError) throw providerError;
      if (!providerUser) {
        throw new Error('Hizmet veren kullanıcı bulunamadı');
      }

      let customerUser = null;
      let jobPost = null;

      if (selectedOffer.job_post_id) {
        const { data: fetchedJobPost, error: jobError } = await supabase
          .from('job_posts')
          .select('id, user_id')
          .eq('id', selectedOffer.job_post_id)
          .maybeSingle();

        if (jobError) throw jobError;
        jobPost = fetchedJobPost || null;
      }

      const possibleCustomerId =
        selectedOffer.customer_user_id ||
        jobPost?.user_id ||
        null;

      if (possibleCustomerId) {
        const { data: fetchedCustomerUser, error: customerError } = await supabase
          .from('users')
          .select('id, phone, full_name, email')
          .eq('id', possibleCustomerId)
          .maybeSingle();

        if (customerError) throw customerError;
        customerUser = fetchedCustomerUser || null;
      }

      const { error: updateError } = await supabase
        .from('offers')
        .update({
          admin_approval: 'approved',
          contact_unlocked: true,
          provider_phone: providerUser.phone || '',
          customer_phone: customerUser?.phone || '',
        })
        .eq('id', id);

      if (updateError) throw updateError;

      try {
        const notifyRes = await fetch(
            `${API_URL}/api/notifications/create-admin-approved`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              offer_id: id,
            }),
          }
        );

        if (!notifyRes.ok) {
          const notifyData = await notifyRes.json().catch(() => ({}));
          throw new Error(
            notifyData.error || 'Bildirim oluşturulamadı ama teklif onaylandı'
          );
        }
      } catch (notifyErr) {
        alert(notifyErr.message || 'Bildirim hatası oluştu');
      }

      if (!customerUser) {
        alert(
          'Teklif onaylandı. Ancak müşteri kullanıcı kaydı bulunamadığı için müşteri telefonu boş bırakıldı.'
        );
      } else {
        alert('Teklif onaylandı');
      }

      await loadOffers();
    } catch (err) {
      alert(err.message || 'Teklif onaylanamadı');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function rejectOffer(id) {
    try {
      setActionLoadingId(id);

      const { error } = await supabase
        .from('offers')
        .update({
          admin_approval: 'rejected',
          contact_unlocked: false,
        })
        .eq('id', id);

      if (error) throw error;

      alert('Teklif reddedildi');
      await loadOffers();
    } catch (err) {
      alert(err.message || 'Teklif reddedilemedi');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <MainLayout
      title="Teklifleri Yönet"
      menuItems={[
        { label: '📊 Admin Dashboard', onClick: () => (window.location.href = '/admin') },
        { label: '🛠 Teklifleri Yönet', onClick: () => {} },
        { label: '📄 Provider Evrakları', onClick: () => (window.location.href = '/admin/providers') },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
      ]}
    >
      <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
        <h2 className="text-2xl text-orange-500 mb-4">Teklifler</h2>

        {loading ? (
          <p className="text-gray-400">Yükleniyor...</p>
        ) : offers.length === 0 ? (
          <p className="text-gray-400">Henüz teklif bulunmuyor.</p>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => {
              const durum = durumBilgisi(offer);
              const isBusy = actionLoadingId === offer.id;

              return (
                <div
                  key={offer.id}
                  className="border border-[#2a2d33] rounded-xl p-5 bg-[#141618]"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Teklif #{String(offer.id || '').slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        İlan ID: {offer.job_post_id || '-'}
                      </p>
                    </div>

                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${durum.className}`}
                    >
                      {durum.text}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300 mb-4">
                    <p><strong>Fiyat:</strong> {offer.price || '-'}</p>
                    <p><strong>Teklif Notu:</strong> {offer.note || '-'}</p>
                    <p>
                      <strong>Müşteri Kararı:</strong>{' '}
                      {offer.customer_decision === 'accepted'
                        ? 'Kabul Edildi'
                        : offer.customer_decision === 'rejected'
                        ? 'Reddedildi'
                        : 'Beklemede'}
                    </p>
                    <p>
                      <strong>Admin Onayı:</strong>{' '}
                      {offer.admin_approval === 'approved'
                        ? 'Onaylandı'
                        : offer.admin_approval === 'rejected'
                        ? 'Reddedildi'
                        : 'Beklemede'}
                    </p>
                    <p>
                      <strong>İletişim Açık mı:</strong>{' '}
                      {offer.contact_unlocked ? 'Evet' : 'Hayır'}
                    </p>
                  </div>

                  {offer.customer_decision === 'accepted' &&
                    offer.admin_approval !== 'approved' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => approveOffer(offer.id)}
                          disabled={isBusy}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition disabled:opacity-50"
                        >
                          {isBusy ? 'İşleniyor...' : '✅ Onayla'}
                        </button>

                        <button
                          onClick={() => rejectOffer(offer.id)}
                          disabled={isBusy}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-medium transition disabled:opacity-50"
                        >
                          {isBusy ? 'İşleniyor...' : '❌ Reddet'}
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}