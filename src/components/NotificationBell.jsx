import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: null,
    targetId: null,
  });

  const dropdownRef = useRef(null);
  const toastTimerRef = useRef(null);

  useEffect(() => {
    loadNotifications();

    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  function showToast({ title, message, type = 'info' }) {
    setToast({ id: Date.now(), title, message, type });

    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }

  async function loadNotifications() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      setNotifications(data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  function askDeleteOne(id) {
    setConfirmState({
      open: true,
      type: 'one',
      targetId: id,
    });
  }

  function askDeleteAll() {
    setConfirmState({
      open: true,
      type: 'all',
      targetId: null,
    });
  }

  function closeConfirm() {
    setConfirmState({
      open: false,
      type: null,
      targetId: null,
    });
  }

  async function deleteAllNotifications() {
    try {
      if (notifications.length === 0) return;

      const ids = notifications.map((n) => n.id);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setNotifications([]);
      closeConfirm();

      showToast({
        title: 'Bildirimler temizlendi',
        message: 'Tüm bildirimler silindi.',
        type: 'success',
      });
    } catch (err) {
      alert(err.message);
    }
  }

  async function deleteOne(id) {
    try {
      const deletedItem = notifications.find((n) => n.id === id);

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => prev.filter((n) => n.id !== id));
      closeConfirm();

      showToast({
        title: 'Bildirim silindi',
        message: deletedItem?.title || 'Bildirim kaldırıldı.',
        type: 'success',
      });
    } catch (err) {
      console.error(err.message);
    }
  }

  function confirmAction() {
    if (confirmState.type === 'all') {
      deleteAllNotifications();
      return;
    }

    if (confirmState.type === 'one' && confirmState.targetId) {
      deleteOne(confirmState.targetId);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';

    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const unreadCount = notifications.length;

  const toastStyles = {
    info: 'border-orange-500/30 bg-[#181b20] text-white',
    success: 'border-green-500/30 bg-[#181b20] text-white',
    error: 'border-red-500/30 bg-[#181b20] text-white',
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => {
            setOpen(!open);
            if (!open) loadNotifications();
          }}
          className="relative w-10 h-10 rounded-full bg-[#1a1d22] hover:bg-[#23272f] border border-[#2a2d33] flex items-center justify-center text-lg transition shadow-sm"
          title="Bildirimler"
        >
          🔔

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] bg-[#181b20] border border-[#2a2d33] rounded-2xl shadow-2xl overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2d33]">
              <div>
                <h3 className="text-white font-semibold">Bildirimler</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {unreadCount} bildirim
                </p>
              </div>

              <button
                onClick={askDeleteAll}
                className="text-xs text-orange-400 hover:text-orange-300 transition"
              >
                Tümünü temizle
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto">
              {loading ? (
                <div className="p-4 text-sm text-gray-400">Yükleniyor...</div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">
                  Henüz bildirimin yok.
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => askDeleteOne(item.id)}
                    className="w-full text-left px-4 py-4 border-b border-[#23272d] transition bg-orange-500/5 hover:bg-[#1f2329]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                          <div className="text-sm font-semibold text-white">
                            {item.title}
                          </div>
                        </div>

                        <div className="text-sm text-gray-300 mt-2 leading-6">
                          {item.message}
                        </div>

                        <div className="text-xs text-gray-500 mt-2">
                          {formatDate(item.created_at)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[110]">
          <div
            className={`w-[340px] max-w-[90vw] rounded-2xl border shadow-2xl px-4 py-4 ${toastStyles[toast.type]}`}
          >
            <div className="flex items-start gap-3">
              <div className="text-lg">
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '⚠️' : '🔔'}
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold">{toast.title}</div>
                <div className="text-sm text-gray-300 mt-1 leading-6">
                  {toast.message}
                </div>
              </div>

              <button
                onClick={() => setToast(null)}
                className="ml-auto text-gray-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[130] px-4">
          <div className="w-full max-w-md rounded-2xl border border-[#2a2d33] bg-[#181b20] shadow-2xl p-5">
            <h3 className="text-lg font-semibold text-white">Emin misin?</h3>

            <p className="text-sm text-gray-300 mt-2 leading-6">
              {confirmState.type === 'all'
                ? 'Tüm bildirimler kalıcı olarak silinecek.'
                : 'Bu bildirim kalıcı olarak silinecek.'}
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={confirmAction}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl"
              >
                Evet, sil
              </button>

              <button
                onClick={closeConfirm}
                className="bg-[#2a2d33] hover:bg-[#343944] text-white px-4 py-2 rounded-xl"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}