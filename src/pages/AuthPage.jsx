import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SITE_URL = import.meta.env.VITE_SITE_URL;

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [kvkkApproved, setKvkkApproved] = useState(false);
  const [showKvkkModal, setShowKvkkModal] = useState(false);

  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [emailNotifications, setEmailNotifications] = useState(true);

  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const role = user?.user_metadata?.role;

        if (role === 'customer') {
          window.location.hash = '#/customer';
        } else if (role === 'provider') {
          window.location.hash = '#/provider';
        }
      }
    }

    checkUser();
  }, []);

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '').slice(0, 10);

    if (digits.length === 0) return '';
    if (digits.length < 4) return `(${digits}`;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length < 9) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }

    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }

  function handlePhoneChange(e) {
    setPhone(formatPhone(e.target.value));
  }

  function getPhoneDigits() {
    return phone.replace(/\D/g, '');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (!email || !password) {
        throw new Error('E-posta ve şifre gerekli');
      }

      if (mode === 'register') {
        if (!fullName.trim()) {
          throw new Error('Ad soyad gerekli');
        }

        if (!phone) {
          throw new Error('Telefon numarası gerekli');
        }

        if (getPhoneDigits().length !== 10) {
          throw new Error('Telefon numarası eksik veya hatalı');
        }

        if (!role) {
          throw new Error('Lütfen bir rol seç');
        }

        if (!confirmPassword) {
          throw new Error('Lütfen şifre tekrar alanını doldurun');
        }

        if (password !== confirmPassword) {
          throw new Error('Şifreler eşleşmiyor');
        }

        if (!kvkkApproved) {
          throw new Error('Kayıt olmak için KVKK sözleşmesini kabul etmelisiniz');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: SITE_URL ? `${SITE_URL}/#/auth` : undefined,
            data: {
              full_name: fullName.trim(),
              phone,
              role,
              email_notifications: emailNotifications,
              kvkk_approved: true,
              profile_completed: false,
            },
          },
        });

        if (signUpError) throw signUpError;

        setMessage('Kayıt başarılı. Mail doğrulaması gerekiyorsa e-posta kutunu kontrol et. Sonra giriş yapabilirsin.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        setKvkkApproved(false);
        setFullName('');
        setPhone('');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        const role = user?.user_metadata?.role;

        if (role === 'customer') {
          window.location.hash = '#/customer';
        } else if (role === 'provider') {
          window.location.hash = '#/provider';
        } else {
          setMessage('Giriş başarılı ama rol bulunamadı');
        }
      }
    } catch (err) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();

    if (!resetEmail) {
      alert('Lütfen email gir.');
      return;
    }

    try {
      setResetLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: SITE_URL ? `${SITE_URL}/#/reset-password` : undefined,
      });

      if (error) throw error;

      alert('Şifre sıfırlama maili gönderildi.');
      setForgotOpen(false);
      setResetEmail('');
    } catch (err) {
      alert(err.message || 'Mail gönderilemedi.');
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col lg:flex-row overflow-y-auto">
      <div className="w-full lg:w-[460px] lg:min-h-screen border-r border-[#23262d] flex flex-col justify-between bg-[#121419]">
        <div className="p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="text-orange-500 text-xl">⬡</span>
              <span className="text-[32px] tracking-[0.18em] font-bold">BiVinç</span>
            </div>

            <p className="text-[#7d8593] text-sm tracking-[0.12em] uppercase leading-7">
              Profesyonel vinç kiralama platformu
            </p>
          </div>

          <div className="bg-[#1a1d23] border border-[#2a2e36] rounded-[24px] p-8 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
            <h1 className="text-4xl mb-2 leading-none">
              {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
            </h1>

            <p className="text-[#98a2b3] mb-6 text-lg leading-8">
              {mode === 'login'
                ? 'Hesabınıza erişmek için bilgilerinizi girin'
                : 'Yeni hesap oluşturup platformu kullanmaya başlayın'}
            </p>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                  E-Posta Adresi
                </label>
                <input
                  type="email"
                  placeholder="ornek@sirket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-3.5 text-white outline-none focus:border-orange-500"
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                      Ad Soyad
                    </label>
                    <input
                      type="text"
                      placeholder="Ad Soyad"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-3.5 text-white outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                      Telefon
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="(5XX) XXX XX XX"
                      value={phone}
                      onChange={handlePhoneChange}
                      className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-3.5 text-white outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                      Rol Seçimi
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole('customer')}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          role === 'customer'
                            ? 'border-orange-500 bg-orange-500/10 text-white'
                            : 'border-[#2a2e36] bg-[#0c0f14] text-[#9aa4b2]'
                        }`}
                      >
                        <div className="font-semibold">Hizmet Almak</div>
                        <div className="text-xs mt-1">İlan açarım, teklif alırım</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('provider')}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          role === 'provider'
                            ? 'border-orange-500 bg-orange-500/10 text-white'
                            : 'border-[#2a2e36] bg-[#0c0f14] text-[#9aa4b2]'
                        }`}
                      >
                        <div className="font-semibold">Hizmet Vermek</div>
                        <div className="text-xs mt-1">Vinç eklerim, teklif veririm</div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                  Şifre
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-3.5 pr-14 text-white outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7d8593]"
                  >
                    👁
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-sm text-[#9aa4b2] uppercase tracking-[0.08em] mb-3">
                    Şifre Tekrar
                  </label>

                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-3.5 pr-14 text-white outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7d8593]"
                    >
                      👁
                    </button>
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <>
                  <div className="rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-4 py-3">
                    <label className="flex items-center gap-3 text-white">
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Mail yoluyla bildirim almak istiyorum</span>
                    </label>
                    <p className="text-xs text-[#98a2b3] mt-2">
                      Yeni teklifler ve önemli güncellemeler e-posta adresinize gönderilir.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-4 py-3">
                    <label className="flex items-start gap-3 text-white">
                      <input
                        type="checkbox"
                        checked={kvkkApproved}
                        onChange={(e) => setKvkkApproved(e.target.checked)}
                        className="w-4 h-4 mt-1"
                      />
                      <span className="text-sm leading-6">
                        <button
                          type="button"
                          onClick={() => setShowKvkkModal(true)}
                          className="text-orange-400 underline underline-offset-4 hover:opacity-80"
                        >
                          KVKK sözleşmesini
                        </button>{' '}
                        okudum ve kabul ediyorum.
                      </span>
                    </label>
                    <p className="text-xs text-[#98a2b3] mt-2">
                      Sözleşmeyi kabul etmeyen kullanıcılar kayıt olamaz.
                    </p>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-bold tracking-[0.12em] text-xl py-3.5 transition disabled:opacity-50"
              >
                {loading
                  ? 'BEKLEYİN...'
                  : mode === 'login'
                  ? 'GİRİŞ YAP'
                  : 'KAYIT OL'}
              </button>

              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-orange-400 text-sm mt-2"
                >
                  Şifremi unuttum
                </button>
              )}
            </form>

            <p className="text-center text-[#98a2b3] mt-6">
              {mode === 'login' ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError('');
                  setMessage('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                  setPhone('');
                }}
                className="text-orange-500 font-semibold hover:opacity-80"
              >
                {mode === 'login' ? 'Kayıt Olun' : 'Giriş Yapın'}
              </button>
            </p>
          </div>
        </div>

        <div className="px-8 pb-6 text-[#667085] text-sm">
          © 2025 BiVinç · Gizlilik · Kullanım Koşulları
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative bg-[#0b0d12] min-h-screen">
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e232b_1px,transparent_1px),linear-gradient(to_bottom,#1e232b_1px,transparent_1px)] bg-[size:48px_48px]" />

        <div className="relative z-10 w-full px-4 py-4 flex items-center">
          <div className="w-full max-w-5xl mx-auto scale-[0.90] origin-center">
            <div className="grid grid-cols-12 gap-4 items-stretch">
              <div className="col-span-7 rounded-[32px] border border-[#2a2e36] bg-[linear-gradient(135deg,#171a20,#101319)] p-6 shadow-[0_14px_50px_rgba(0,0,0,0.35)]">
                <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm text-orange-400">
                  🚧 Yeni Nesil Vinç Platformu
                </div>

                <h2 className="mt-5 text-4xl leading-[1.05] font-semibold text-white">
                  Vinç kiralama sürecini
                  <br />
                  tek platformda
                  <br />
                  yönetin
                </h2>

                <p className="mt-4 text-base leading-7 text-[#98a2b3] max-w-2xl">
                  İlan oluşturun, teklif alın, hizmet verenlerle eşleşin ve tüm süreci tek panelden takip edin.
                </p>
              </div>

              <div className="col-span-5 flex flex-col gap-4">
                <div className="rounded-[26px] border border-[#2a2e36] bg-[#171a20] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <div className="text-2xl mb-3">📩</div>
                  <div className="text-xl font-semibold text-white leading-tight">
                    Teklifleri tek ekranda yönetin
                  </div>
                  <div className="text-[#98a2b3] text-sm leading-6 mt-3">
                    Müşteriler gelen teklifleri karşılaştırır, hizmet verenler hızlıca dönüş yapar.
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#2a2e36] bg-[#171a20] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <div className="text-2xl mb-3">⚙️</div>
                  <div className="text-xl font-semibold text-white leading-tight">
                    Operasyon sürecini sadeleştirin
                  </div>
                  <div className="text-[#98a2b3] text-sm leading-6 mt-3">
                    İlan, teklif, onay ve iletişim akışlarını tek panelden takip edin.
                  </div>
                </div>

                <div className="rounded-[26px] border border-[#2a2e36] bg-[#171a20] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                  <div className="text-2xl mb-3">🤝</div>
                  <div className="text-xl font-semibold text-white leading-tight">
                    Kurumsal güven, hızlı eşleşme
                  </div>
                  <div className="text-[#98a2b3] text-sm leading-6 mt-3">
                    Sahaya uygun ekipman ve doğru hizmet veren ile daha kısa sürede eşleşin.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {forgotOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-md bg-[#1a1d23] border border-[#2a2e36] rounded-[24px] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <h2 className="text-2xl font-bold text-white mb-2">Şifremi Unuttum</h2>
            <p className="text-[#98a2b3] mb-5">
              E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="w-full rounded-2xl border border-[#2a2e36] bg-[#0c0f14] px-5 py-4 text-white outline-none focus:border-orange-500"
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="flex-1 rounded-2xl bg-[#2a2e36] hover:bg-[#343944] text-white font-semibold py-3 transition"
                >
                  Kapat
                </button>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 transition disabled:opacity-50"
                >
                  {resetLoading ? 'GÖNDERİLİYOR...' : 'MAİL GÖNDER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showKvkkModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="w-full max-w-3xl bg-[#1a1d23] border border-[#2a2e36] rounded-[24px] shadow-[0_10px_40px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="p-6 border-b border-[#2a2e36]">
              <h2 className="text-2xl font-bold text-white">KVKK Sözleşmesi</h2>
              <p className="text-[#98a2b3] mt-2 text-sm">
                Kayıt olmadan önce aşağıdaki metni okuyup kabul etmeniz gerekmektedir.
              </p>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto text-sm leading-7 text-[#d0d5dd] space-y-5">
              <div>
                <h3 className="text-white font-semibold mb-2">1. İş Kazaları ve Güvenlik Sorumluluğu</h3>
                <p>
                  Platform, yalnızca hizmet alan ile hizmet vereni buluşturan bir dijital altyapıdır.
                  Vinç operasyonu sırasında meydana gelebilecek devrilme, halat kopması, yük düşmesi
                  gibi her türlü iş kazasından, yaralanmalardan, maddi hasarlardan veya can
                  kayıplarından Platform hiçbir şekilde sorumlu tutulamaz.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">2. Mesleki Yeterlilik ve Belgelendirme</h3>
                <p>
                  Platform, sisteme kayıt olan operatörlerin evraklarının güncelliğini veya doğruluğunu
                  garanti etmez. Kontrol işi veren tarafın sorumluluğundadır.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">3. Ücret ve Tahsilat Riskleri</h3>
                <p>
                  Taraflar arasındaki ödeme problemlerinden Platform sorumlu değildir.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">4. Makine Arızası ve İş Kaybı</h3>
                <p>
                  Makine arızası, gecikme veya iş kaybı nedeniyle doğacak zararlardan Platform sorumlu değildir.
                </p>
              </div>

              <div>
                <h3 className="text-white font-semibold mb-2">5. Mücbir Sebepler ve Saha Koşulları</h3>
                <p>
                  Hava muhalefeti, zemin uygunsuzluğu veya yasal izinlerin eksikliği gibi nedenlerle
                  işin yapılamamasından Platform sorumlu değildir.
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-[#2a2e36] flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowKvkkModal(false)}
                className="flex-1 rounded-2xl bg-[#2a2e36] hover:bg-[#343944] text-white font-semibold py-3 transition"
              >
                Kapat
              </button>

              <button
                type="button"
                onClick={() => {
                  setKvkkApproved(true);
                  setShowKvkkModal(false);
                }}
                className="flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 text-black font-bold py-3 transition"
              >
                Okudum, Kabul Ediyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
0
pfffff