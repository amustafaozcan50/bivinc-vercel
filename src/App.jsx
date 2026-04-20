import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

import AuthPage from './pages/AuthPage';
import CustomerDashboard from './pages/CustomerDashboard';
import ProviderDashboard from './pages/ProviderDashboard';

function getCurrentPath() {
  const hash = window.location.hash || '#/auth';
  return hash.replace(/^#/, '');
}

export default function App() {
  const [path, setPath] = useState(getCurrentPath());
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    function handleHashChange() {
      setPath(getCurrentPath());
    }

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(user || null);

      if (!window.location.hash) {
        window.location.hash = '#/auth';
      }

      setBooting(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const role = useMemo(() => user?.user_metadata?.role || null, [user]);

  if (booting) {
    return (
      <div className="min-h-screen bg-[#0c0d10] text-white flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (path === '/customer') {
    return <CustomerDashboard />;
  }

  if (path === '/provider') {
    return <ProviderDashboard />;
  }

  if (path === '/auth') {
    if (role === 'customer') {
      window.location.hash = '#/customer';
      return null;
    }

    if (role === 'provider') {
      window.location.hash = '#/provider';
      return null;
    }

    return <AuthPage />;
  }

  if (role === 'customer') {
    window.location.hash = '#/customer';
    return null;
  }

  if (role === 'provider') {
    window.location.hash = '#/provider';
    return null;
  }

  return <AuthPage />;
}