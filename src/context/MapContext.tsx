import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HillsRegion } from '../data/hillsData';

export type MapMode = 'LIVE' | 'HISTORICAL';

export type Region = HillsRegion;

export interface FocusCoordinates {
  latitude: number;
  longitude: number;
  zoom?: number;
}

export interface EnabledLayers {
  susceptibility: boolean;
  demContours: boolean;
  imdRadar: boolean;
  soilSaturation: boolean;
  sensorNodes: boolean;
  mlInference: boolean;
  trainingEvents: boolean;
  mlHeatmap: boolean;
  earthquakeEvents: boolean;
  historicalEarthquakeEvents: boolean;
  liveEarthquakes: boolean;
  historicalLandslides: boolean;
  seismicActivity: boolean;
}

export interface MapContextProps {
  selectedRegion?: HillsRegion | null;
  selectedZone?: any;
  focusCoordinates?: FocusCoordinates | null;
  mapMode: MapMode;
  selectedYear: number;
  enabledLayers: EnabledLayers;
  searchQuery: string;
  setSelectedRegion: (r?: HillsRegion | null) => void;
  setSelectedZone: (z?: any) => void;
  setFocusCoordinates: (c?: FocusCoordinates | null) => void;
  setMapMode: (m: MapMode) => void;
  setSelectedYear: (y: number) => void;
  setEnabledLayers: (l: Partial<EnabledLayers>) => void;
  setSearchQuery: (q: string) => void;
}

const defaultEnabledLayers: EnabledLayers = {
  susceptibility: true,
  demContours: true,
  imdRadar: true,
  soilSaturation: true,
  sensorNodes: true,
  mlInference: true,
  trainingEvents: true,
  mlHeatmap: true,
  earthquakeEvents: true,
  historicalEarthquakeEvents: true,
  liveEarthquakes: true,
  historicalLandslides: true,
  seismicActivity: false,
};

const defaultContext: MapContextProps = {
  selectedRegion: null,
  selectedZone: null,
  focusCoordinates: null,
  mapMode: 'LIVE',
  selectedYear: 2023,
  enabledLayers: defaultEnabledLayers,
  searchQuery: '',
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
  const [selectedRegion, setSelectedRegion] = useState<HillsRegion | null>(null);
  const [selectedZone, setSelectedZone] = useState<any>(null);
  const [focusCoordinates, setFocusCoordinates] = useState<FocusCoordinates | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>('LIVE');
  const [selectedYear, setSelectedYear] = useState<number>(2023);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [enabledLayers, setEnabledLayersState] = useState<EnabledLayers>(defaultEnabledLayers);

  // Persist to sessionStorage for navigation/back-forward restoration
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('mapContext');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.selectedRegion !== undefined) setSelectedRegion(data.selectedRegion);
        if (data.selectedZone !== undefined) setSelectedZone(data.selectedZone);
        if (data.focusCoordinates !== undefined) setFocusCoordinates(data.focusCoordinates);
        if (data.mapMode) setMapMode(data.mapMode);
        if (data.selectedYear) setSelectedYear(data.selectedYear);
        if (data.searchQuery !== undefined) setSearchQuery(data.searchQuery);
        if (data.enabledLayers) {
          setEnabledLayersState((prev) => ({ ...prev, ...data.enabledLayers }));
        }
      }
    } catch {
      // Ignore storage read errors
    }
  }, []);

  useEffect(() => {
    try {
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
    } catch {
      // Ignore storage write errors
    }
  }, [selectedRegion, selectedZone, focusCoordinates, mapMode, selectedYear, searchQuery, enabledLayers]);

  const setEnabledLayers = (l: Partial<EnabledLayers>) => {
    setEnabledLayersState((prev) => ({ ...prev, ...l }));
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
export const useMapContext = useMap;

