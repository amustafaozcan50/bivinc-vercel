import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    email: '',
    phone: '',
    role: '',
    full_name: '',
    city: '',
    district: '',
    avatar_url: '',
    profile_completed: false,
    edit_count: 0,
    edit_reset_date: null,
  });

  const [providerProfile, setProviderProfile] = useState({
    operator_name: '',
    experience_years: '',
    license_number: '',
    certificate_url: '',
    identity_url: '',
    approved: false,
  });

  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);

  const [avatarFile, setAvatarFile] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [identityFile, setIdentityFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);

  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestForm, setRequestForm] = useState({
    field_name: '',
    requested_value: '',
    note: '',
  });

  useEffect(() => {
    loadProfile();
    loadCities();
  }, []);

  useEffect(() => {
    if (profile.city) {
      loadDistricts(profile.city);
    } else {
      setDistricts([]);
    }
  }, [profile.city]);

  const canEditProfile = useMemo(() => {
    if (!profile.profile_completed) return true;
    if (!profile.edit_reset_date) return true;

    const diff = Date.now() - new Date(profile.edit_reset_date).getTime();

    if (diff > FOURTEEN_DAYS_MS) {
      return true;
    }

    return (profile.edit_count || 0) < 2;
  }, [profile.profile_completed, profile.edit_reset_date, profile.edit_count]);

  const msRemaining = useMemo(() => {
    if (!profile.edit_reset_date) return 0;

    const diff =
      FOURTEEN_DAYS_MS -
      (Date.now() - new Date(profile.edit_reset_date).getTime());

    return diff > 0 ? diff : 0;
  }, [profile.edit_reset_date]);

  const remainingDaysText = useMemo(() => {
    if (!msRemaining) return '';
    const days = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));
    return `${days} gün sonra hakların sıfırlanır`;
  }, [msRemaining]);

  const remainingEditText = useMemo(() => {
    if (!profile.profile_completed) return 'İlk profil tamamlaması';
    if (!profile.edit_reset_date) return 'Kalan hak: 2/2';

    const diff = Date.now() - new Date(profile.edit_reset_date).getTime();

    if (diff > FOURTEEN_DAYS_MS) {
      return 'Kalan hak: 2/2';
    }

    const used = profile.edit_count || 0;
    const left = Math.max(0, 2 - used);
    return `Kalan hak: ${left}/2`;
  }, [profile.profile_completed, profile.edit_reset_date, profile.edit_count]);

  function normalizeApiList(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.response)) return payload.response;
    return [];
  }

  async function loadCities() {
    try {
      setLoadingCities(true);

      const res = await fetch(
        'https://turkiyeapi.dev/api/v1/provinces?fields=name&limit=100'
      );
      const json = await res.json();
      const list = normalizeApiList(json);

      const cityNames = list
        .map((item) => item?.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'tr'));

      setCities(cityNames);
    } catch (err) {
      console.error('İller yüklenemedi:', err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  }

  async function loadDistricts(cityName) {
    try {
      setLoadingDistricts(true);

      const res = await fetch(
        `https://turkiyeapi.dev/api/v1/districts?province=${encodeURIComponent(
          cityName
        )}&fields=name&limit=1000`
      );

      const json = await res.json();
      const list = normalizeApiList(json);

      const districtNames = list
        .map((item) => item?.name)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'tr'));

      setDistricts(districtNames);
    } catch (err) {
      console.error('İlçeler yüklenemedi:', err);
      setDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  }

  async function loadProfile() {
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
        .from('users')
        .select(
          'email, phone, role, full_name, city, district, email_notifications, avatar_url, profile_completed, edit_count, edit_reset_date'
        )
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile({
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
        full_name: data.full_name || '',
        city: data.city || '',
        district: data.district || '',
        avatar_url: data.avatar_url || '',
        profile_completed: data.profile_completed || false,
        edit_count: data.edit_count || 0,
        edit_reset_date: data.edit_reset_date || null,
      });

      setEmailNotifications(data.email_notifications ?? true);

      if (data.role === 'provider') {
        const { data: providerData, error: providerError } = await supabase
          .from('provider_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (providerError) throw providerError;

        if (providerData) {
          setProviderProfile({
            operator_name: providerData.operator_name || '',
            experience_years: providerData.experience_years || '',
            license_number: providerData.license_number || '',
            certificate_url: providerData.certificate_url || '',
            identity_url: providerData.identity_url || '',
            approved: providerData.approved || false,
          });

          setProfile((prev) => ({
            ...prev,
            avatar_url: providerData.avatar_url || prev.avatar_url || '',
          }));
        }
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!profile.profile_completed) {
      alert('Önce profil bilgilerini tamamlamalısın.');
      return;
    }

    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function createUpdateRequest() {
    try {
      setRequestSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Kullanıcı bulunamadı');

      let currentValue = '';

      if (['full_name', 'city', 'district'].includes(requestForm.field_name)) {
        currentValue = profile[requestForm.field_name] || '';
      } else {
        currentValue = providerProfile[requestForm.field_name] || '';
      }

      const { error } = await supabase.from('profile_update_requests').insert([
        {
          user_id: user.id,
          role: profile.role,
          field_name: requestForm.field_name,
          current_value: String(currentValue),
          requested_value: requestForm.requested_value,
          note: requestForm.note,
        },
      ]);

      if (error) throw error;

      alert('Talep gönderildi');
      setShowRequestForm(false);
      setRequestForm({
        field_name: '',
        requested_value: '',
        note: '',
      });
    } catch (err) {
      alert(err.message);
    } finally {
      setRequestSaving(false);
    }
  }

  async function uploadFile(file, folderName) {
    if (!file) return '';

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error('Kullanıcı bulunamadı');

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${folderName}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('provider-docs')
      .upload(fileName, file, {
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('provider-docs')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function uploadProfilePhoto(file, userId) {
    if (!file) return null;

    const ext = file.name.split('.').pop();
    const fileName = `${userId}/avatar-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, { upsert: true });

    if (error) throw error;

    const { data } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function saveProfile() {
    try {
      setSaving(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Kullanıcı bulunamadı');

      if (!profile.full_name.trim()) throw new Error('Ad soyad zorunlu');
      if (!profile.phone.trim()) throw new Error('Telefon zorunlu');
      if (!profile.city.trim()) throw new Error('İl seçimi zorunlu');
      if (!profile.district.trim()) throw new Error('İlçe seçimi zorunlu');

      if (profile.role === 'provider') {
        if (!providerProfile.operator_name.trim()) {
          throw new Error('Operatör adı zorunlu');
        }
        if (!String(providerProfile.experience_years).trim()) {
          throw new Error('Deneyim yılı zorunlu');
        }
        if (!providerProfile.license_number.trim()) {
          throw new Error('Belge numarası zorunlu');
        }
      }

      let newEditCount = profile.edit_count || 0;
      let newResetDate = profile.edit_reset_date;

      if (profile.profile_completed) {
        if (!profile.edit_reset_date) {
          newResetDate = new Date().toISOString();
          newEditCount = 1;
        } else {
          const diff =
            Date.now() - new Date(profile.edit_reset_date).getTime();

          if (diff > FOURTEEN_DAYS_MS) {
            newResetDate = new Date().toISOString();
            newEditCount = 1;
          } else {
            newEditCount += 1;
          }
        }

        if (newEditCount > 2) {
          throw new Error('14 gün içinde en fazla 2 kez düzenleme yapabilirsin');
        }
      } else {
        newEditCount = 0;
        newResetDate = null;
      }

      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        avatarUrl = await uploadProfilePhoto(avatarFile, user.id);
      }

      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          city: profile.city,
          district: profile.district,
          email_notifications: emailNotifications,
          avatar_url: avatarUrl,
          profile_completed: true,
          edit_count: newEditCount,
          edit_reset_date: newResetDate,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      if (profile.role === 'provider') {
        let certificateUrl = providerProfile.certificate_url;
        let identityUrl = providerProfile.identity_url;

        if (certificateFile) {
          certificateUrl = await uploadFile(certificateFile, 'certificate');
        }

        if (identityFile) {
          identityUrl = await uploadFile(identityFile, 'identity');
        }

        const payload = {
          user_id: user.id,
          operator_name: providerProfile.operator_name,
          experience_years: providerProfile.experience_years,
          license_number: providerProfile.license_number,
          certificate_url: certificateUrl,
          identity_url: identityUrl,
          avatar_url: avatarUrl,
        };

        const { data: existingProvider } = await supabase
          .from('provider_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingProvider) {
          const { error: providerUpdateError } = await supabase
            .from('provider_profiles')
            .update(payload)
            .eq('user_id', user.id);

          if (providerUpdateError) throw providerUpdateError;
        } else {
          const { error: providerInsertError } = await supabase
            .from('provider_profiles')
            .insert([payload]);

          if (providerInsertError) throw providerInsertError;
        }
      }

      alert(profile.profile_completed ? 'Profil güncellendi' : 'Profil tamamlandı');
      await loadProfile();

      if (!profile.profile_completed) {
        window.location.href = '/';
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const roleText =
    profile.role === 'customer'
      ? 'Hizmet Alan'
      : profile.role === 'provider'
      ? 'Hizmet Veren'
      : 'Belirlenmedi';

  const customerMenu = [
    { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
    { label: '➕ Yeni İlan Oluştur', path: '/ilan-olustur', onClick: () => (window.location.href = '/ilan-olustur') },
    { label: '📋 İlanlarım', path: '/ilanlarim', onClick: () => (window.location.href = '/ilanlarim') },
    { label: '💬 Gelen Teklifler', path: '/gelen-teklifler', onClick: () => (window.location.href = '/gelen-teklifler') },
    { label: '👤 Profilim', path: '/profilim', onClick: () => {} },
    { label: '🚪 Çıkış Yap', onClick: handleLogout },
  ];

  const providerMenu = [
    { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
    { label: '🛒 İlan Pazarı', path: '/ilan-pazari', onClick: () => (window.location.href = '/ilan-pazari') },
    { label: '🏗️ Vinçlerim', path: '/vinclerim', onClick: () => (window.location.href = '/vinclerim') },
    { label: '📨 Verdiğim Teklifler', path: '/verdigim-teklifler', onClick: () => (window.location.href = '/verdigim-teklifler') },
    { label: '👤 Profilim', path: '/profilim', onClick: () => {} },
    { label: '🚪 Çıkış Yap', onClick: handleLogout },
  ];

  return (
    <MainLayout
      title="Profilim"
      menuItems={profile?.role === 'provider' ? providerMenu : customerMenu}
    >
      <div className="space-y-6">
        {!loading && !profile.profile_completed && (
          <div className="max-w-4xl rounded-2xl border border-orange-500/30 bg-orange-500/10 px-5 py-4 text-orange-200">
            Profilini ilk kez tamamlaman gerekiyor. Kayıtta girdiğin ad soyad ve telefon otomatik geldi; kalan alanları seçip kaydetmen yeterli.
          </div>
        )}

        {!loading && profile.profile_completed && !canEditProfile && (
          <div className="max-w-4xl rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-4 text-yellow-200">
            14 gün içindeki 2 düzenleme hakkını kullandın. {remainingDaysText}
          </div>
        )}

        {!loading && profile.profile_completed && (
          <div className="max-w-4xl rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-blue-200">
            {remainingEditText}
          </div>
        )}

        <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 max-w-4xl">
          <h2 className="text-2xl text-orange-500 mb-6">Kullanıcı Bilgileri</h2>

          <div className="mb-6 flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profil"
                className="w-20 h-20 rounded-full object-cover border border-[#2a2d33]"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#111315] flex items-center justify-center text-white text-2xl">
                👤
              </div>
            )}

            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="text-sm text-white"
                disabled={!canEditProfile}
              />

              <p className="text-xs text-gray-400">Profil fotoğrafı seç</p>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-400">Yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Ad Soyad</label>
                <input
                  value={profile.full_name}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, full_name: e.target.value }))
                  }
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Telefon</label>
                <input
                  value={profile.phone}
                  disabled
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">İl</label>
                <select
                  value={profile.city}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      city: e.target.value,
                      district: '',
                    }))
                  }
                  disabled={!canEditProfile || loadingCities}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <option value="">
                    {loadingCities ? 'İller yükleniyor...' : 'İl seç'}
                  </option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">İlçe</label>
                <select
                  value={profile.district}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, district: e.target.value }))
                  }
                  disabled={!canEditProfile || !profile.city || loadingDistricts}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <option value="">
                    {!profile.city
                      ? 'Önce il seç'
                      : loadingDistricts
                      ? 'İlçeler yükleniyor...'
                      : 'İlçe seç'}
                  </option>
                  {districts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">Rol</label>
                <input
                  value={roleText}
                  disabled
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-gray-400"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-400">Email</label>
                <input
                  value={profile.email}
                  disabled
                  className="w-full p-3 rounded bg-[#111315] border border-[#2a2d33] text-gray-400 cursor-not-allowed"
                />
              </div>

              <div className="md:col-span-2 mt-2">
                <label className="flex items-center gap-3 text-white">
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-4 h-4"
                    disabled={!canEditProfile}
                  />
                  <span>Mail yoluyla bildirim almak istiyorum</span>
                </label>
                <p className="text-sm text-gray-400 mt-2">
                  Teklifler, onaylar ve önemli güncellemeler e-posta adresinize gönderilir.
                </p>
              </div>
            </div>
          )}
        </div>

        {!loading && profile.role === 'provider' && (
          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <h2 className="text-2xl text-orange-500">Hizmet Veren Bilgileri</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  providerProfile.approved
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-yellow-500/10 text-yellow-400'
                }`}
              >
                {providerProfile.approved ? '✅ Onaylı' : '⏳ Onay Bekliyor'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400">Operatör Adı</label>
                <input
                  value={providerProfile.operator_name}
                  onChange={(e) =>
                    setProviderProfile((prev) => ({
                      ...prev,
                      operator_name: e.target.value,
                    }))
                  }
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Deneyim (Yıl)</label>
                <input
                  value={providerProfile.experience_years}
                  onChange={(e) =>
                    setProviderProfile((prev) => ({
                      ...prev,
                      experience_years: e.target.value,
                    }))
                  }
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm text-gray-400">Belge Numarası</label>
                <input
                  value={providerProfile.license_number}
                  onChange={(e) =>
                    setProviderProfile((prev) => ({
                      ...prev,
                      license_number: e.target.value,
                    }))
                  }
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="text-sm text-gray-400">Operatörlük Belgesi</label>
                <input
                  type="file"
                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
                {providerProfile.certificate_url && (
                  <a
                    href={providerProfile.certificate_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-orange-400 mt-2 inline-block"
                  >
                    Mevcut belgeyi görüntüle
                  </a>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-400">Kimlik / Evrak</label>
                <input
                  type="file"
                  onChange={(e) => setIdentityFile(e.target.files?.[0] || null)}
                  disabled={!canEditProfile}
                  className={`w-full p-3 rounded border ${
                    canEditProfile
                      ? 'bg-[#111315] border-[#2a2d33] text-white'
                      : 'bg-[#111315] border-[#2a2d33] text-gray-400 cursor-not-allowed'
                  }`}
                />
                {providerProfile.identity_url && (
                  <a
                    href={providerProfile.identity_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-orange-400 mt-2 inline-block"
                  >
                    Mevcut evrağı görüntüle
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {!loading && (
          <div className="max-w-4xl">
            <div className="flex gap-3 flex-wrap">
              {canEditProfile ? (
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold disabled:opacity-50"
                >
                  {saving
                    ? 'Kaydediliyor...'
                    : profile.profile_completed
                    ? 'Profili Güncelle'
                    : 'Profili Tamamla'}
                </button>
              ) : (
                <button
                  onClick={() => setShowRequestForm(true)}
                  className="bg-red-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold"
                >
                  📝 Güncelleme Talebi Oluştur
                </button>
              )}

              {profile.profile_completed && (
                <button
                  onClick={() => (window.location.href = '/sifre-degistir')}
                  className="bg-[#2a2d33] hover:bg-[#343944] text-white px-6 py-3 rounded-xl font-semibold transition"
                >
                  🔐 Şifre Değiştir
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showRequestForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-2xl text-orange-500 mb-4">Güncelleme Talebi</h2>

            <div className="space-y-4">
              <select
                value={requestForm.field_name}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, field_name: e.target.value })
                }
                className="w-full p-3 rounded bg-[#111315] text-white"
              >
                <option value="">Alan seç</option>
                <option value="full_name">Ad Soyad</option>
                <option value="city">İl</option>
                <option value="district">İlçe</option>

                {profile.role === 'provider' && (
                  <>
                    <option value="operator_name">Operatör Adı</option>
                    <option value="experience_years">Deneyim</option>
                    <option value="license_number">Belge No</option>
                  </>
                )}
              </select>

              <input
                placeholder="Yeni değer"
                value={requestForm.requested_value}
                onChange={(e) =>
                  setRequestForm({
                    ...requestForm,
                    requested_value: e.target.value,
                  })
                }
                className="w-full p-3 rounded bg-[#111315] text-white"
              />

              <textarea
                placeholder="Not (opsiyonel)"
                value={requestForm.note}
                onChange={(e) =>
                  setRequestForm({ ...requestForm, note: e.target.value })
                }
                className="w-full p-3 rounded bg-[#111315] text-white"
                rows={4}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createUpdateRequest}
                disabled={requestSaving}
                className="bg-orange-500 px-5 py-3 rounded-xl text-white disabled:opacity-50"
              >
                {requestSaving ? 'Gönderiliyor...' : 'Gönder'}
              </button>

              <button
                onClick={() => setShowRequestForm(false)}
                className="bg-gray-600 px-5 py-3 rounded-xl text-white"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}