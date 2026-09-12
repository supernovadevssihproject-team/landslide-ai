import React, { useMemo } from 'react';
import { ChevronDown, Layers3, Map, Radio, X } from 'lucide-react';
import { HazardZone, SensorNode } from '../types';
import { HillsRegion } from '../data/hillsData';

interface ThreeDMapViewProps {
  selectedZone: HazardZone;
  zones: HazardZone[];
  sensors?: SensorNode[];
  selectedHillRegion?: HillsRegion | null;
  onClose: () => void;
}

function parseCoordinates(coordStr: string): [number, number] {
  const parts = coordStr.replace(/[°NSEW]/g, '').split(',');
  const latitude = Number.parseFloat(parts[0]?.trim() ?? '');
  const longitude = Number.parseFloat(parts[1]?.trim() ?? '');

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return [latitude, longitude];
  }

  return [27.5312, 88.5134];
}

function isWithinRegion(
  coordinates: [number, number],
  region: HillsRegion,
  radiusDegrees = 2.25
) {
  if (!region.coordinatesVerified || region.latitude === undefined || region.longitude === undefined) {
    return true;
  }

  const latitudeDelta = coordinates[0] - region.latitude;
  const longitudeDelta = (coordinates[1] - region.longitude) * Math.cos((region.latitude * Math.PI) / 180);
  return Math.sqrt(latitudeDelta ** 2 + longitudeDelta ** 2) <= radiusDegrees;
}

export const ThreeDMapView: React.FC<ThreeDMapViewProps> = ({
  selectedZone,
  zones,
  sensors = [],
  selectedHillRegion = null,
  onClose,
}) => {
  const selectedCoordinates = useMemo(() => {
    if (
      selectedHillRegion?.coordinatesVerified &&
      selectedHillRegion.latitude !== undefined &&
      selectedHillRegion.longitude !== undefined
    ) {
      return [selectedHillRegion.latitude, selectedHillRegion.longitude] as [number, number];
    }
    return parseCoordinates(selectedZone.coords);
  }, [selectedHillRegion, selectedZone.coords]);

  const filteredZones = useMemo(
    () => selectedHillRegion
      ? zones.filter((zone) => isWithinRegion(parseCoordinates(zone.coords), selectedHillRegion))
      : zones,
    [selectedHillRegion, zones]
  );

  const filteredSensors = useMemo(
    () => selectedHillRegion
      ? sensors.filter((sensor) => isWithinRegion(parseCoordinates(sensor.coordinates), selectedHillRegion))
      : sensors,
    [selectedHillRegion, sensors]
  );

  const zoneMarkers = useMemo(() => {
    const [selectedLatitude, selectedLongitude] = selectedCoordinates;

    return filteredZones.map((zone) => {
      const [latitude, longitude] = parseCoordinates(zone.coords);
      const left = 50 + (longitude - selectedLongitude) * 30;
      const top = 50 - (latitude - selectedLatitude) * 30;

      return {
        zone,
        left: Math.min(92, Math.max(8, left)),
        top: Math.min(82, Math.max(18, top)),
      };
    });
  }, [filteredZones, selectedCoordinates]);

  const sensorMarkers = useMemo(() => {
    const [selectedLatitude, selectedLongitude] = selectedCoordinates;

    return filteredSensors.map((sensor) => {
      const [latitude, longitude] = parseCoordinates(sensor.coordinates);
      return {
        sensor,
        left: Math.min(92, Math.max(8, 50 + (longitude - selectedLongitude) * 30)),
        top: Math.min(82, Math.max(18, 50 - (latitude - selectedLatitude) * 30)),
      };
    });
  }, [filteredSensors, selectedCoordinates]);

  const criticalCount = filteredZones.filter((zone) => zone.isCritical).length;

  return (
    <div className="absolute inset-0 z-30 overflow-hidden bg-[#06121f] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,#17435a_0%,#06121f_62%)]" />

      <div className="absolute inset-0 [perspective:900px]">
        <div className="absolute -inset-[28%] top-[12%] [transform:rotateX(58deg)] [transform-style:preserve-3d]">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,118,110,.34),rgba(8,47,73,.82)),repeating-linear-gradient(0deg,transparent_0,transparent_39px,rgba(103,232,249,.18)_40px),repeating-linear-gradient(90deg,transparent_0,transparent_39px,rgba(103,232,249,.18)_40px)] shadow-[0_-30px_100px_rgba(34,211,238,.2)]" />
          <div className="absolute inset-[12%] rounded-[50%] border border-emerald-300/30 shadow-[0_0_35px_rgba(16,185,129,.15),inset_0_0_35px_rgba(16,185,129,.12)]" />
          <div className="absolute inset-[27%] rounded-[50%] border border-amber-300/30" />
          <div className="absolute inset-[40%] rounded-[50%] border border-red-300/40" />
        </div>

        <div className="absolute inset-0">
          {zoneMarkers.map(({ zone, left, top }) => (
            <div
              key={zone.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              <div className={`h-4 w-4 rounded-full border-2 border-white shadow-[0_0_18px_currentColor] ${zone.id === selectedZone.id ? 'scale-150 bg-cyan-300 text-cyan-300' : zone.isCritical ? 'bg-red-500 text-red-400' : 'bg-amber-400 text-amber-300'}`} />
              <div className="mt-2 whitespace-nowrap rounded border border-white/15 bg-[#051424]/85 px-2 py-1 text-[10px] font-mono text-slate-200 backdrop-blur">
                {zone.name.split('(')[0].trim()}
              </div>
            </div>
          ))}
          {sensorMarkers.map(({ sensor, left, top }) => (
            <div
              key={sensor.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
              title={`${sensor.name} telemetry`}
            >
              <div className="h-2.5 w-2.5 rounded-full border border-white bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,.9)]" />
            </div>
          ))}
        </div>
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 border-b border-cyan-300/15 bg-[#051424]/75 p-3 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-cyan-200">
            <Layers3 className="h-4 w-4" />
            3D Terrain Analysis
          </div>
          <div className="mt-1 text-sm font-semibold text-white">
            {selectedHillRegion?.coordinatesVerified ? selectedHillRegion.name : selectedZone.name}
          </div>
          <div className="mt-0.5 text-[10px] font-mono text-slate-400">
            {selectedHillRegion?.coordinatesVerified && selectedHillRegion.latitude !== undefined && selectedHillRegion.longitude !== undefined
              ? `${selectedHillRegion.latitude.toFixed(4)}° N, ${selectedHillRegion.longitude.toFixed(4)}° E`
              : `${selectedCoordinates[0].toFixed(4)}° N, ${selectedCoordinates[1].toFixed(4)}° E`}
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-slate-300">
            <span className="rounded border border-red-300/20 bg-red-500/10 px-1.5 py-0.5">{criticalCount} HIGH</span>
            <span className="rounded border border-cyan-300/20 bg-cyan-500/10 px-1.5 py-0.5">{filteredZones.length} ZONES</span>
            <span className="flex items-center gap-1 rounded border border-cyan-300/20 bg-cyan-500/10 px-1.5 py-0.5"><Radio className="h-3 w-3" />{filteredSensors.length} TELEMETRY</span>
          </div>
          {selectedHillRegion && !selectedHillRegion.coordinatesVerified && (
            <div className="mt-2 max-w-xs text-[10px] leading-4 text-slate-400">
              Region-specific terrain filtering is unavailable; showing the existing terrain view.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-cyan-300/30 bg-[#122131]/90 p-1.5 text-cyan-200 transition-colors hover:bg-cyan-500 hover:text-slate-950"
          title="Close 3D terrain view"
          aria-label="Close 3D terrain view"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded border border-cyan-300/20 bg-[#051424]/80 px-2.5 py-2 text-[10px] font-mono text-slate-300 backdrop-blur-md">
        <Map className="h-3.5 w-3.5 text-cyan-300" />
        In-app terrain projection
        <ChevronDown className="h-3 w-3 rotate-[-90deg] text-slate-500" />
      </div>
    </div>
  );
};
