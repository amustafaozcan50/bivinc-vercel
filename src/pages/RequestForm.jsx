import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import MainLayout from '../components/MainLayout';
import {
  getCities,
  getDistrictsByCityCode,
} from 'turkey-neighbourhoods';

export default function RequestForm() {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    pickup_city: '',
    pickup_district: '',
    dropoff_city: '',
    dropoff_district: '',
    job_date: '',
    expiry_date: '',
  });

  const cityOptions = useMemo(() => getCities(), []);

  const pickupCityCode = useMemo(() => {
    const city = cityOptions.find((c) => c.name === form.pickup_city);
    return city?.code || '';
  }, [cityOptions, form.pickup_city]);

  const dropoffCityCode = useMemo(() => {
    const city = cityOptions.find((c) => c.name === form.dropoff_city);
    return city?.code || '';
  }, [cityOptions, form.dropoff_city]);

  const pickupDistricts = useMemo(() => {
    if (!pickupCityCode) return [];
    return getDistrictsByCityCode(pickupCityCode);
  }, [pickupCityCode]);

  const dropoffDistricts = useMemo(() => {
    if (!dropoffCityCode) return [];
    return getDistrictsByCityCode(dropoffCityCode);
  }, [dropoffCityCode]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }

  async function uploadImage(file, userId) {
    if (!file) return '';

    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/job-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function geocodeLocationText(query) {
  if (!query) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  );

  if (!res.ok) throw new Error('Konum çözümlenemedi');

  const data = await res.json();
  if (!data || data.length === 0) return null;

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}

  async function createJob(e) {
    e.preventDefault();

    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Kullanıcı bulunamadı');

      if (!form.title.trim()) throw new Error('Lütfen ilan başlığı gir');
      if (!form.description.trim()) throw new Error('Lütfen açıklama gir');
      if (!form.pickup_city || !form.pickup_district) {
        throw new Error('Lütfen alınacak konumu seç');
      }
      if (!form.dropoff_city || !form.dropoff_district) {
        throw new Error('Lütfen bırakılacak konumu seç');
      }
      if (!form.job_date) throw new Error('Lütfen iş tarihi seç');
      if (!form.expiry_date) throw new Error('Lütfen ilan bitiş tarihi seç');
      
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadImage(imageFile, user.id);
      }

      const pickupLocationText = `${form.pickup_district}, ${form.pickup_city}, Türkiye`;
      const dropoffLocationText = `${form.dropoff_district}, ${form.dropoff_city}, Türkiye`;

      const [pickupCoords, dropoffCoords] = await Promise.all([
        geocodeLocationText(pickupLocationText),
        geocodeLocationText(dropoffLocationText),
      ]);

      const { error } = await supabase.from('job_posts').insert([
        {
          user_id: user.id,
          title: form.title,
          description: form.description,
          pickup_city: form.pickup_city,
          pickup_district: form.pickup_district,
          dropoff_city: form.dropoff_city,
          dropoff_district: form.dropoff_district,
          job_date: form.job_date,
          expiry_date: form.expiry_date,
          image_url: imageUrl,
          status: 'open',

          pickup_lat: pickupCoords?.lat || null,
          pickup_lng: pickupCoords?.lng || null,
          dropoff_lat: dropoffCoords?.lat || null,
          dropoff_lng: dropoffCoords?.lng || null,
        },
      ]);

      if (error) throw error;

      alert('İlan oluşturuldu');

      setForm({
        title: '',
        description: '',
        pickup_city: '',
        pickup_district: '',
        dropoff_city: '',
        dropoff_district: '',
        job_date: '',
        expiry_date: '',
        budget: '',
      });
      setImageFile(null);

      window.location.href = '/ilanlarim';
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const customerMenu = [
    { label: '🏠 Anasayfa', path: '/', onClick: () => (window.location.href = '/') },
    { label: '➕ Yeni İlan Oluştur', path: '/ilan-olustur', onClick: () => {} },
    { label: '📋 İlanlarım', path: '/ilanlarim', onClick: () => (window.location.href = '/ilanlarim') },
    { label: '💬 Gelen Teklifler', path: '/gelen-teklifler', onClick: () => (window.location.href = '/gelen-teklifler') },
    { label: '👤 Profilim', path: '/profilim', onClick: () => (window.location.href = '/profilim') },
    { label: '🚪 Çıkış Yap', onClick: handleLogout },
  ];

  return (
    <MainLayout title="Yeni İlan Oluştur" menuItems={customerMenu}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Yeni İlan Oluştur</h1>
          <p className="text-gray-400 mt-2">
            Alınacak ve bırakılacak konumu seçerek yeni taşıma ilanı oluştur.
          </p>
        </div>

        <form
          onSubmit={createJob}
          className="bg-[#1a1c20] border border-[#2a2d33] rounded-2xl p-6 space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">İlan Başlığı</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn. İstanbul içi konteyner taşıma işi"
                className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="İş detayını yazın"
                rows={4}
                className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
              />
            </div>
          </div>

          <div className="border-t border-[#2a2d33] pt-6">
            <h2 className="text-xl text-orange-500 mb-4">Alınacak Konum</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">İl</label>
                <select
                  value={form.pickup_city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      pickup_city: e.target.value,
                      pickup_district: '',
                    })
                  }
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                >
                  <option value="">Seçiniz...</option>
                  {cityOptions.map((city) => (
                    <option key={city.code} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">İlçe</label>
                <select
                  value={form.pickup_district}
                  onChange={(e) =>
                    setForm({ ...form, pickup_district: e.target.value })
                  }
                  disabled={!form.pickup_city}
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white disabled:opacity-50"
                >
                  <option value="">Seçiniz...</option>
                  {pickupDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2a2d33] pt-6">
            <h2 className="text-xl text-orange-500 mb-4">Bırakılacak Konum</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">İl</label>
                <select
                  value={form.dropoff_city}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dropoff_city: e.target.value,
                      dropoff_district: '',
                    })
                  }
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                >
                  <option value="">Seçiniz...</option>
                  {cityOptions.map((city) => (
                    <option key={city.code} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">İlçe</label>
                <select
                  value={form.dropoff_district}
                  onChange={(e) =>
                    setForm({ ...form, dropoff_district: e.target.value })
                  }
                  disabled={!form.dropoff_city}
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white disabled:opacity-50"
                >
                  <option value="">Seçiniz...</option>
                  {dropoffDistricts.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-[#2a2d33] pt-6">
            <h2 className="text-xl text-orange-500 mb-4">Tarih</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">İş Tarihi</label>
                <input
                  type="date"
                  value={form.job_date}
                  onChange={(e) => setForm({ ...form, job_date: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">İlan Bitiş Tarihi</label>
                <input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="w-full p-3 rounded-xl bg-[#111315] border border-[#2a2d33] text-white"
                />
              </div>

            </div>
          </div>

          <div className="border-t border-[#2a2d33] pt-6">
            <h2 className="text-xl text-orange-500 mb-4">İlan Görseli</h2>

            <div className="border border-dashed border-[#2a2d33] rounded-2xl p-6 bg-[#111315]">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-white"
              />

              {imageFile && (
                <p className="text-sm text-gray-400 mt-3">
                  Seçilen dosya: {imageFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => (window.location.href = '/ilanlarim')}
              className="bg-[#2a2d33] hover:bg-[#343944] text-white px-6 py-3 rounded-xl font-semibold transition"
            >
              İptal
            </button>

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition disabled:opacity-50"
            >
              {loading ? 'Oluşturuluyor...' : 'İlanı Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </MainLayout>
  );
}