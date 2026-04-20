import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const API_URL = import.meta.env.VITE_API_URL;

export default function MySentOffersPage() {
  const [offers, setOffers] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);

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
      setContacts({});

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setOffers([]);
        return;
      }

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('provider_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOffers(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchContact(offerId) {
    try {
      const res = await fetch(`${API_URL}/api/offers/${offerId}/contact/provider`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'İletişim alınamadı');
      }

      setContacts((prev) => ({
        ...prev,
        [offerId]: data.customer_phone || '',
      }));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <MainLayout
      title="Verdiğim Teklifler"
      menuItems={[
        { label: '🏠 Anasayfa', onClick: () => (window.location.href = '/') },
        { label: '🛒 İlan Pazarı', onClick: () => (window.location.href = '/ilan-pazari') },
        { label: '🏗️ Vinçlerim', onClick: () => (window.location.href = '/vinclerim') },
        { label: '📨 Verdiğim Teklifler', onClick: () => {} },
        { label: '👤 Profilim', onClick: () => (window.location.href = '/profilim') },
        { label: '🚪 Çıkış Yap', onClick: handleLogout },
    ]}
    >
      <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6">
        <h2 className="text-2xl text-orange-500 mb-4">Gönderdiğim Teklifler</h2>

        {loading ? (
          <p className="text-gray-400">Yükleniyor...</p>
        ) : offers.length === 0 ? (
          <p className="text-gray-400">Henüz teklif vermedin.</p>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="border border-[#2a2d33] rounded-xl p-4 bg-[#141618]"
              >
                <p className="text-gray-300 mb-1"><strong>Fiyat:</strong> {offer.price}</p>
                <p className="text-gray-300 mb-1"><strong>Not:</strong> {offer.note}</p>
                <p className="text-gray-300 mb-1"><strong>Müşteri Kararı:</strong> {offer.customer_decision}</p>
                <p className="text-gray-300 mb-1"><strong>Admin Onayı:</strong> {offer.admin_approval}</p>

                {offer.contact_unlocked ? (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-700">
                    <p className="text-green-400 font-semibold">📞 İletişim bilgileri açıldı</p>

                    <button
                      onClick={() => fetchContact(offer.id)}
                      className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg"
                    >
                      Numarayı Göster
                    </button>

                    {contacts[offer.id] && (
                      <>
                        <p className="text-green-400 text-sm mt-2">
                          Hizmet alan telefon: {contacts[offer.id]}
                        </p>

                        <a
                          href={`https://wa.me/90${contacts[offer.id].replace(/\D/g, '')}?text=Merhaba, teklif verdiğim ilan için yazıyorum.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl text-center mt-2"
                        >
                          💬 WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-lg bg-gray-700/20 border border-[#2a2d33]">
                    <p className="text-sm text-gray-400">
                      🔒 İletişim bilgileri admin onayı sonrası açılır
                    </p>
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