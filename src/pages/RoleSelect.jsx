import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function RoleSelect({ userId, onRoleSelected }) {
  const [loadingRole, setLoadingRole] = useState('');
  const [error, setError] = useState('');

  async function selectRole(role) {
    try {
      setLoadingRole(role);
      setError('');

      if (!userId) {
        throw new Error('Kullanıcı bulunamadı');
      }

      const res = await fetch(`${API_URL}/api/user/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Rol kaydedilemedi');
      }

      onRoleSelected(role);
    } catch (err) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoadingRole('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-3">Rolünü Seç</h1>
        <p className="text-gray-500 mb-6">
          Sistemi kullanmaya devam etmek için rolünü seç.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => selectRole('customer')}
            disabled={!!loadingRole}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loadingRole === 'customer' ? 'Kaydediliyor...' : 'Hizmet Almak İstiyorum'}
          </button>

          <button
            onClick={() => selectRole('provider')}
            disabled={!!loadingRole}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {loadingRole === 'provider' ? 'Kaydediliyor...' : 'Hizmet Vermek İstiyorum'}
          </button>
        </div>
      </div>
    </div>
  );
}