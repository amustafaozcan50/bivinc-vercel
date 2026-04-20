export default function AppLoader() {
  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#1e232b_1px,transparent_1px),linear-gradient(to_bottom,#1e232b_1px,transparent_1px)] bg-[size:48px_48px]" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-orange-500 text-2xl animate-pulse">⬡</span>
          <span className="text-4xl tracking-[0.18em] font-bold">BIVINC</span>
        </div>

        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#2a2e36]" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-orange-500 animate-spin" />
        </div>

        <p className="text-[#98a2b3] text-lg tracking-[0.08em]">Yükleniyor...</p>
      </div>
    </div>
  );
}