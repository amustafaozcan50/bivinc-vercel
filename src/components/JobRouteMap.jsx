import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';

import JobRouteMap from '../components/JobRouteMap';

const pickupIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

async function geocodeText(query) {
  if (!query) return null;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error('Konum çözümlenemedi');
  }

  const data = await res.json();

  if (!data || data.length === 0) return null;

  return {
    lat: Number(data[0].lat),
    lng: Number(data[0].lon),
  };
}

export default function JobRouteMap({
  pickupCity,
  pickupDistrict,
  dropoffCity,
  dropoffDistrict,
  height = 220,
}) {
  const [pickupPoint, setPickupPoint] = useState(null);
  const [dropoffPoint, setDropoffPoint] = useState(null);
  const [loading, setLoading] = useState(true);

  const pickupText = useMemo(
    () => [pickupDistrict, pickupCity, 'Türkiye'].filter(Boolean).join(', '),
    [pickupCity, pickupDistrict]
  );

  const dropoffText = useMemo(
    () => [dropoffDistrict, dropoffCity, 'Türkiye'].filter(Boolean).join(', '),
    [dropoffCity, dropoffDistrict]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPoints() {
      try {
        setLoading(true);

        const [pickup, dropoff] = await Promise.all([
          geocodeText(pickupText),
          geocodeText(dropoffText),
        ]);

        if (!cancelled) {
          setPickupPoint(pickup);
          setDropoffPoint(dropoff);
        }
      } catch (err) {
        if (!cancelled) {
          setPickupPoint(null);
          setDropoffPoint(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (pickupText && dropoffText) {
      loadPoints();
    } else {
      setPickupPoint(null);
      setDropoffPoint(null);
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [pickupText, dropoffText]);

  if (loading) {
    return (
      <div
        className="w-full rounded-2xl border border-[#2a2d33] bg-[#111315] flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        Harita yükleniyor...
      </div>
    );
  }

  if (!pickupPoint || !dropoffPoint) {
    return (
      <div
        className="w-full rounded-2xl border border-[#2a2d33] bg-[#111315] flex items-center justify-center text-gray-400"
        style={{ height }}
      >
        Konumlar çözümlenemedi
      </div>
    );
  }

  const line = [
    [pickupPoint.lat, pickupPoint.lng],
    [dropoffPoint.lat, dropoffPoint.lng],
  ];

  const center = [
    (pickupPoint.lat + dropoffPoint.lat) / 2,
    (pickupPoint.lng + dropoffPoint.lng) / 2,
  ];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#2a2d33]">
      <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom={false}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[pickupPoint.lat, pickupPoint.lng]} icon={pickupIcon}>
          <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
            Alınacak Konum
          </Tooltip>
        </Marker>

        <Marker position={[dropoffPoint.lat, dropoffPoint.lng]} icon={dropoffIcon}>
          <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent={false}>
            Bırakılacak Konum
          </Tooltip>
        </Marker>

        <Polyline positions={line} pathOptions={{ color: '#f97316', weight: 4 }} />
      </MapContainer>
    </div>
  );
}