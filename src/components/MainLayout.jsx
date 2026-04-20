import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import NotificationBell from './NotificationBell';

export default function MainLayout({ title = '', menuItems = [], children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState({
    full_name: '',
    role: '',
    avatar_url: '',
  });

  useEffect(() => {
    loadHeaderProfile();
  }, []);

  async function loadHeaderProfile() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      let avatarUrl = data.avatar_url || '';

      if (data.role === 'provider') {
        const { data: providerData } = await supabase
          .from('provider_profiles')
          .select('avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (providerData?.avatar_url) {
          avatarUrl = providerData.avatar_url;
        }
      }

      setUserProfile({
        full_name: data.full_name || '',
        role: data.role || '',
        avatar_url: avatarUrl || '',
      });
    } catch (err) {
      console.error(err.message);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <aside
        className={`${
          sidebarOpen ? 'w-[290px]' : 'w-[84px]'
        } transition-all duration-300 border-r border-[#20242b] bg-[#0d1117] flex flex-col justify-between`}
      >
        <div>
          <div className="px-6 py-5 border-b border-[#20242b]">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-orange-500" />
              {sidebarOpen && (
                <div>
                  <div className="text-[22px] font-bold">BiVinç</div>
                  <div className="text-xs text-gray-500 tracking-[0.2em] mt-2">
                    VINÇ PLATFORMU
                  </div>
                </div>
              )}
            </div>
          </div>

          <nav className="px-4 py-6 space-y-2">
            {menuItems.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[#151a21] transition text-white"
                title={item.label}
              >
                <span className="text-lg min-w-[24px]">
                  {item.label.split(' ')[0]}
                </span>
                {sidebarOpen && (
                  <span className="text-[15px] font-medium">
                    {item.label.replace(/^[^\s]+\s*/, '')}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-[#20242b]">
          <button
                onClick={() => (window.location.href = '/profilim')}
                className="w-full bg-[#12171f] border border-[#242b35] rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-[#171d26] transition"
            >
            {userProfile.avatar_url ? (
              <img
                src={userProfile.avatar_url}
                alt="Profil"
                className="w-12 h-12 rounded-full object-cover border border-[#2a2d33]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#1d2430] flex items-center justify-center text-white">
                👤
              </div>
            )}

            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-white font-semibold truncate hover:text-orange-400 transition">
                  {userProfile.full_name || 'Hesabım'}
                </p>
                <p className="text-gray-400 text-sm">
                  {userProfile.role === 'provider'
                    ? 'Panel erişimi'
                    : 'Panel erişimi'}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="h-[74px] border-b border-[#20242b] bg-[#0f1318] flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="w-12 h-12 rounded-2xl border border-[#2a2d33] bg-[#151a21] hover:bg-[#1a2028] flex items-center justify-center text-white text-xl transition"
            >
              ☰
            </button>

            <h1 className="text-[20px] md:text-[22px] font-bold">{title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <button
                onClick={() => (window.location.href = '/profilim')}
                className="rounded-full transition hover:scale-[1.03]"
                title="Profilim"
                >
                {userProfile.avatar_url ? (
                    <img
                    src={userProfile.avatar_url}
                    alt="Profil"
                    className="w-11 h-11 rounded-full object-cover border border-[#2a2d33]"
                    />
                ) : (
                    <div className="w-11 h-11 rounded-full border border-[#2a2d33] bg-[#151a21] flex items-center justify-center text-white">
                    👤
                    </div>
                )}
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}