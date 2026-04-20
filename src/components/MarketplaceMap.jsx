import { Fragment, useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';

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

function isValidCoord(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);

  return (
    Number.isFinite(latNum) &&
    Number.isFinite(lngNum) &&
    latNum >= -90 &&
    latNum <= 90 &&
    lngNum >= -180 &&
    lngNum <= 180
  );
}

function FitToJobs({ jobs, focusedJobId }) {
  const map = useMap();

  useEffect(() => {
    const bounds = [];

    jobs.forEach((job) => {
      if (isValidCoord(job.pickup_lat, job.pickup_lng)) {
        bounds.push([Number(job.pickup_lat), Number(job.pickup_lng)]);
      }
      if (isValidCoord(job.dropoff_lat, job.dropoff_lng)) {
        bounds.push([Number(job.dropoff_lat), Number(job.dropoff_lng)]);
      }
    });

    if (focusedJobId) {
      const target = jobs.find((j) => j.id === focusedJobId);
      if (target && isValidCoord(target.pickup_lat, target.pickup_lng)) {
        map.setView([Number(target.pickup_lat), Number(target.pickup_lng)], 10, {
          animate: true,
        });
        return;
      }
    }

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [jobs, focusedJobId, map]);

  return null;
}

function BoundsReporter({ onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    function report() {
      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    }

    report();
    map.on('moveend', report);
    map.on('zoomend', report);

    return () => {
      map.off('moveend', report);
      map.off('zoomend', report);
    };
  }, [map, onBoundsChange]);

  return null;
}

export default function MarketplaceMap({
  jobs = [],
  focusedJobId = null,
  onSelectJob,
  onBoundsChange,
  height = 520,
}) {
  const safeJobs = useMemo(() => {
    return jobs.filter((job) => {
      return (
        isValidCoord(job.pickup_lat, job.pickup_lng) ||
        isValidCoord(job.dropoff_lat, job.dropoff_lng)
      );
    });
  }, [jobs]);

  const center = useMemo(() => {
    const first = safeJobs.find((j) =>
      isValidCoord(j.pickup_lat, j.pickup_lng)
    );

    if (first) {
      return [Number(first.pickup_lat), Number(first.pickup_lng)];
    }

    return [39, 35];
  }, [safeJobs]);

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[#2a2d33] bg-[#111315]">
      <MapContainer
        center={center}
        zoom={6}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitToJobs jobs={safeJobs} focusedJobId={focusedJobId} />
        <BoundsReporter onBoundsChange={onBoundsChange} />

        {safeJobs.map((job) => {
          const pickupPos = isValidCoord(job.pickup_lat, job.pickup_lng)
            ? [Number(job.pickup_lat), Number(job.pickup_lng)]
            : null;

          const dropoffPos = isValidCoord(job.dropoff_lat, job.dropoff_lng)
            ? [Number(job.dropoff_lat), Number(job.dropoff_lng)]
            : null;

          return (
            <Fragment key={job.id}>
              {pickupPos && (
                <Marker
                  position={pickupPos}
                  icon={pickupIcon}
                  eventHandlers={{
                    click: () => onSelectJob?.(job),
                  }}
                >
                  <Tooltip>
                    📍 {job.title}
                    <br />
                    Alınacak: {job.pickup_city || '-'} / {job.pickup_district || '-'}
                  </Tooltip>
                </Marker>
              )}

              {dropoffPos && (
                <Marker
                  position={dropoffPos}
                  icon={dropoffIcon}
                  eventHandlers={{
                    click: () => onSelectJob?.(job),
                  }}
                >
                  <Tooltip>
                    🚚 {job.title}
                    <br />
                    Bırakılacak: {job.dropoff_city || '-'} / {job.dropoff_district || '-'}
                  </Tooltip>
                </Marker>
              )}

              {pickupPos && dropoffPos && (
                <Polyline
                  positions={[pickupPos, dropoffPos]}
                  pathOptions={{
                    color: focusedJobId === job.id ? '#f97316' : '#60a5fa',
                    weight: focusedJobId === job.id ? 5 : 3,
                    opacity: 0.9,
                  }}
                  eventHandlers={{
                    click: () => onSelectJob?.(job),
                  }}
                />
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}