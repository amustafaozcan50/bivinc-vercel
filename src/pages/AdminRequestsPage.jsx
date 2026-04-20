import { useEffect, useState } from 'react';
import MainLayout from '../components/MainLayout';
import { supabase } from '../lib/supabase';

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      const { data, error } = await supabase
        .from('profile_update_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(req) {
    try {
      // 🔥 1) Asıl tabloyu güncelle
      if (['full_name', 'phone', 'city', 'address'].includes(req.field_name)) {
        await supabase
          .from('users')
          .update({
            [req.field_name]: req.requested_value,
          })
          .eq('id', req.user_id);
      } else {
        await supabase
          .from('provider_profiles')
          .update({
            [req.field_name]: req.requested_value,
          })
          .eq('user_id', req.user_id);
      }

      // 🔥 2) request status update
      await supabase
        .from('profile_update_requests')
        .update({ status: 'approved' })
        .eq('id', req.id);

      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleReject(id) {
    try {
      await supabase
        .from('profile_update_requests')
        .update({ status: 'rejected' })
        .eq('id', id);

      loadRequests();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <MainLayout title="Admin - Güncelleme Talepleri">
      <div className="p-6 space-y-4">
        <h2 className="text-2xl text-orange-500">Güncelleme Talepleri</h2>

        {loading ? (
          <p>Yükleniyor...</p>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-[#1a1c20] border border-[#2a2d33] p-4 rounded-xl"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Alan:</span>
                    <div>{req.field_name}</div>
                  </div>

                  <div>
                    <span className="text-gray-400">Eski:</span>
                    <div>{req.current_value}</div>
                  </div>

                  <div>
                    <span className="text-gray-400">Yeni:</span>
                    <div className="text-orange-400">{req.requested_value}</div>
                  </div>

                  <div>
                    <span className="text-gray-400">Durum:</span>
                    <div>{req.status}</div>
                  </div>
                </div>

                {req.note && (
                  <div className="mt-2 text-xs text-gray-400">
                    Not: {req.note}
                  </div>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => handleApprove(req)}
                      className="bg-green-600 px-4 py-2 rounded text-white"
                    >
                      Onayla
                    </button>

                    <button
                      onClick={() => handleReject(req.id)}
                      className="bg-red-600 px-4 py-2 rounded text-white"
                    >
                      Reddet
                    </button>
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