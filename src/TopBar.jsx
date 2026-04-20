import { useState } from 'react';

export default function TopBar({ title = 'Vinç Platformu', menuItems = [] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{title}</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg transition"
          >
            👤
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
              {menuItems.length === 0 ? (
                <div className="px-4 py-3 text-sm text-gray-500">
                  Menü bulunmuyor
                </div>
              ) : (
                menuItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setOpen(false);
                      item.onClick?.();
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}