import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HillsRegion } from '../data/hillsData';
import { NerState } from '../types';

export type MapMode = 'LIVE' | 'HISTORICAL';

export type Region = HillsRegion;

export type FocusCoordinateType = 'exact' | 'approximate';

export interface FocusCoordinates {
  latitude: number;
  longitude: number;
  zoom?: number;
  coordinateType?: FocusCoordinateType;
  shelterId?: string;
  label?: string;
  description?: string;
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
  liveRiskZones: boolean;
  administrativeBoundaries: boolean;
  rainfall: boolean;
  citizenReports: boolean;
}

export interface MapContextProps {
  selectedState: NerState;
  selectedRegion?: HillsRegion | null;
  selectedZone?: any;
  focusCoordinates?: FocusCoordinates | null;
  mapMode: MapMode;
  selectedYear: number;
  enabledLayers: EnabledLayers;
  searchQuery: string;
  setSelectedState: (state: NerState) => void;
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
  liveRiskZones: true,
  administrativeBoundaries: true,
  rainfall: false,
  citizenReports: true,
};

const defaultContext: MapContextProps = {
  selectedState: 'all',
  selectedRegion: null,
  selectedZone: null,
  focusCoordinates: null,
  mapMode: 'LIVE',
  selectedYear: 2023,
  enabledLayers: defaultEnabledLayers,
  searchQuery: '',
  setSelectedState: () => {},
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
  const [selectedState, setSelectedState] = useState<NerState>('all');
  const [selectedRegion, setSelectedRegionState] = useState<HillsRegion | null>(null);
  const [selectedZone, setSelectedZoneState] = useState<any>(null);
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
        if (data.selectedState) setSelectedState(data.selectedState);
        if (data.selectedRegion !== undefined) setSelectedRegionState(data.selectedRegion);
        if (data.selectedZone !== undefined) setSelectedZoneState(data.selectedZone);
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
        selectedState,
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
  }, [selectedState, selectedRegion, selectedZone, focusCoordinates, mapMode, selectedYear, searchQuery, enabledLayers]);

  const handleSetSelectedRegion = (r?: HillsRegion | null) => {
    setSelectedRegionState(r || null);
    if (r) {
      setSelectedZoneState(null);
    }
  };

  const handleSetSelectedZone = (z?: any) => {
    setSelectedZoneState(z || null);
    if (z) {
      setSelectedRegionState(null);
    }
  };

  const setEnabledLayers = (l: Partial<EnabledLayers>) => {
    setEnabledLayersState((prev) => ({ ...prev, ...l }));
  };

  return (
    <MapContext.Provider
      value={{
        selectedState,
        selectedRegion,
        selectedZone,
        focusCoordinates,
        mapMode,
        selectedYear,
        searchQuery,
        enabledLayers,
        setSelectedState,
        setSelectedRegion: handleSetSelectedRegion,
        setSelectedZone: handleSetSelectedZone,
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
