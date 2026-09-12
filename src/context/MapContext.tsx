import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MapMode = 'LIVE' | 'HISTORICAL';

export interface Region {
  id: string;
  name: string;
  state: string;
  latitude?: number;
  longitude?: number;
  verificationStatus?: 'verified' | 'unverified' | 'unavailable';
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  verificationNotes?: string;
  boundary?: GeoJSON.Polygon;
}

export interface MapContextProps {
  selectedRegion?: Region;
  selectedZone?: string;
  focusCoordinates?: [number, number];
  mapMode: MapMode;
  selectedYear?: number;
  enabledLayers: {
    mlHeatmap: boolean;
    liveEarthquakes: boolean;
    historicalEarthquakes: boolean;
    historicalLandslides: boolean;
    seismicActivity: boolean;
  };
  searchQuery?: string;
  setSelectedRegion: (r?: Region) => void;
  setSelectedZone: (z?: string) => void;
  setFocusCoordinates: (c?: [number, number]) => void;
  setMapMode: (m: MapMode) => void;
  setSelectedYear: (y?: number) => void;
  setEnabledLayers: (l: Partial<MapContextProps['enabledLayers']>) => void;
  setSearchQuery: (q?: string) => void;
}

const defaultContext: MapContextProps = {
  mapMode: 'LIVE',
  enabledLayers: {
    mlHeatmap: true,
    liveEarthquakes: true,
    historicalEarthquakes: false,
    historicalLandslides: false,
    seismicActivity: false,
  },
  setSelectedRegion: () => {},
  setSelectedZone: () => {},
  setFocusCoordinates: () => {},
  setMapMode: () => {},
  setSelectedYear: () => {},
  setEnabledLayers: () => {},
  setSearchQuery: () => {},
};

const MapContext = createContext<MapContextProps>(defaultContext);

export const MapProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedRegion, setSelectedRegion] = useState<Region | undefined>(undefined);
  const [selectedZone, setSelectedZone] = useState<string | undefined>(undefined);
  const [focusCoordinates, setFocusCoordinates] = useState<[number, number] | undefined>(undefined);
  const [mapMode, setMapMode] = useState<MapMode>('LIVE');
  const [selectedYear, setSelectedYear] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined);
  const [enabledLayers, setEnabledLayersState] = useState(defaultContext.enabledLayers);

  // Persist to sessionStorage for navigation/back‑forward restoration
  useEffect(() => {
    const saved = sessionStorage.getItem('mapContext');
    if (saved) {
      const data = JSON.parse(saved);
      setSelectedRegion(data.selectedRegion);
      setSelectedZone(data.selectedZone);
      setFocusCoordinates(data.focusCoordinates);
      setMapMode(data.mapMode);
      setSelectedYear(data.selectedYear);
      setSearchQuery(data.searchQuery);
      setEnabledLayersState(data.enabledLayers);
    }
  }, []);

  useEffect(() => {
    const payload = {
      selectedRegion,
      selectedZone,
      focusCoordinates,
      mapMode,
      selectedYear,
      searchQuery,
      enabledLayers,
    };
    sessionStorage.setItem('mapContext', JSON.stringify(payload));
  }, [selectedRegion, selectedZone, focusCoordinates, mapMode, selectedYear, searchQuery, enabledLayers]);

  const setEnabledLayers = (l: Partial<MapContextProps['enabledLayers']>) => {
    setEnabledLayersState(prev => ({ ...prev, ...l }));
  };

  return (
    <MapContext.Provider
      value={{
        selectedRegion,
        selectedZone,
        focusCoordinates,
        mapMode,
        selectedYear,
        searchQuery,
        enabledLayers,
        setSelectedRegion,
        setSelectedZone,
        setFocusCoordinates,
        setMapMode,
        setSelectedYear,
        setEnabledLayers,
        setSearchQuery,
      }}
    >
      {children}
    </MapContext.Provider>
  );
};

export const useMap = () => useContext(MapContext);
