import { useState, useRef, useEffect } from "react";

export default function Header({ title = "Vinç Platformu" }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{
      background: "#111",
      color: "#fff",
      padding: "12px 20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      
      {/* SOL */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <button style={{ fontSize: "20px", background: "none", border: "none", color: "#fff" }}>
          ☰
        </button>
        <h1 style={{ color: "#ff7a00" }}>{title}</h1>
      </div>

      {/* SAĞ */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        
        {/* ZİL */}
        <button style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "#1b1b1b",
          color: "#fff",
          border: "none"
        }}>
          🔔
        </button>

        {/* PROFİL */}
        <div style={{ position: "relative" }} ref={ref}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#1b1b1b",
              color: "#fff",
              border: "none"
            }}
          >
            👤
          </button>

          {menuOpen && (
            <div style={{
              position: "absolute",
              right: 0,
              top: "45px",
              background: "#181818",
              border: "1px solid #333",
              borderRadius: "10px",
              width: "180px"
            }}>
              <button style={btn}>Profil Düzenle</button>
              <button style={btn}>Şifre Değiştir</button>
              <button style={{ ...btn, color: "red" }}>Çıkış Yap</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

const btn = {
  width: "100%",
  padding: "10px",
  textAlign: "left",
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer"
};