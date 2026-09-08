/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { OperationalModule, NerState, HazardZone } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { TerraHome } from './components/TerraHome';
import { TerraDashboard } from './components/TerraDashboard';
import { TerraRiskDetails } from './components/TerraRiskDetails';
import { TerraAlerts } from './components/TerraAlerts';
import { TerraEmergencySos } from './components/TerraEmergencySos';
import { TerraAbout } from './components/TerraAbout';
import { SpatialGisCommand } from './components/SpatialGisCommand';
import { TemporalLstmPredictor } from './components/TemporalLstmPredictor';
import { CrowdsourceCvVerification } from './components/CrowdsourceCvVerification';
import { BroadcastAndDispatch } from './components/BroadcastAndDispatch';
import { FieldReportModal } from './components/FieldReportModal';
import { MlPipelineCommand } from './components/MlPipelineCommand';
import { LandslideRiskSimulator } from './components/LandslideRiskSimulator';
import { sirenPlayer } from './utils/audioSiren';
import { HAZARD_ZONES, ASSET_URLS } from './data/mockData';
import { LandslideApi } from './services/api';
import { PlusCircle, VolumeX, Zap } from 'lucide-react';

export default function App() {
  const [activeModule, setActiveModule] = useState<OperationalModule>('home');
  const [selectedState, setSelectedState] = useState<NerState>('all');
  const [zones, setZones] = useState<HazardZone[]>(HAZARD_ZONES);
  const [selectedZone, setSelectedZone] = useState<HazardZone>(HAZARD_ZONES[0]);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [globalToast, setGlobalToast] = useState<string | null>(null);
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('terra-theme');
      return saved === 'light' || saved === 'dark' ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Fetch zones from API while maintaining default fallback
  useEffect(() => {
    let active = true;
    LandslideApi.getHazardZones(selectedState).then((data) => {
      if (active && data && data.length > 0) {
        setZones(data);
      }
    });
    return () => {
      active = false;
    };
  }, [selectedState]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('terra-theme', next);
      } catch {}
      return next;
    });
  };

  const triggerGlobalToast = (msg: string) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 4000);
  };

  useEffect(() => {
    return sirenPlayer.subscribe(setIsSirenActive);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSirenActive) {
        sirenPlayer.stop();
        triggerGlobalToast('Acoustic Siren Silenced (ESC pressed)');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSirenActive]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark
          ? 'bg-[#090e17] text-slate-100 selection:bg-emerald-900 selection:text-emerald-100'
          : 'bg-[#f4f7fa] text-slate-900 selection:bg-emerald-200 selection:text-emerald-900'
      }`}
    >
      {/* Top Header with TerraGuard Brand, State Filter, Live Clock, Theme & Siren */}
      <Header
        selectedState={selectedState}
        onSelectState={setSelectedState}
        onOpenQuickEvac={() => setActiveModule('emergency-broadcast-and-dispatch')}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Navigation Tabs */}
      <Navigation
        activeModule={activeModule}
        onChangeModule={setActiveModule}
        reportCount={12}
        theme={theme}
      />

      {/* Main Operational Screen Views */}
      <main className="flex-1 w-full">
        {/* Screen 1: Home Landing Page */}
        {activeModule === 'home' && (
          <TerraHome
            zones={zones}
            onSelectZone={setSelectedZone}
            onNavigate={setActiveModule}
            theme={theme}
          />
        )}

        {/* Screen 2: Dashboard Overview with Drone Carousel & Quick Actions */}
        {activeModule === 'dashboard' && (
          <TerraDashboard
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            zones={zones}
            onNavigate={setActiveModule}
            theme={theme}
          />
        )}

        {/* Screen 3: Risk Map (Spatial GIS Command) */}
        {(activeModule === 'risk-map' || activeModule === 'spatial-gis-command') && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4">
            <SpatialGisCommand
              selectedState={selectedState}
              selectedZone={selectedZone}
              onSelectZone={setSelectedZone}
              onNavigateToLstm={() => setActiveModule('temporal-lstm-predictor')}
              onNavigateToDispatch={() =>
                setActiveModule('emergency-broadcast-and-dispatch')
              }
              onNavigateToMlPipeline={() => setActiveModule('ml-models-pipeline')}
              onNavigateToDetails={(z) => {
                setSelectedZone(z);
                setActiveModule('risk-details');
              }}
              theme={theme}
            />
          </div>
        )}

        {/* Screen 4: Risk Details with Radial Meter & Comparative Charts */}
        {activeModule === 'risk-details' && (
          <TerraRiskDetails
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            zones={zones}
            onNavigate={setActiveModule}
            theme={theme}
          />
        )}

        {/* Screen 5: Active Alerts */}
        {activeModule === 'alerts' && (
          <TerraAlerts
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            onNavigate={setActiveModule}
            theme={theme}
            sirenActive={isSirenActive}
            onToggleSiren={() => sirenPlayer.toggle()}
          />
        )}

        {/* Screen 6: Emergency SOS & Helplines */}
        {activeModule === 'emergency-sos' && (
          <TerraEmergencySos
            selectedZone={selectedZone}
            onNavigate={setActiveModule}
            theme={theme}
            sirenActive={isSirenActive}
            onToggleSiren={() => sirenPlayer.toggle()}
          />
        )}

        {/* About & Advanced ML Architecture View */}
        {activeModule === 'about' && (
          <TerraAbout onNavigate={setActiveModule} theme={theme} />
        )}

        {/* Sub-Module: Temporal LSTM Predictor */}
        {activeModule === 'temporal-lstm-predictor' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-12">
            <TemporalLstmPredictor
              onArmEvacuation={() => setActiveModule('emergency-broadcast-and-dispatch')}
            />
          </div>
        )}

        {/* Sub-Module: Crowdsource CV Verification */}
        {activeModule === 'crowdsource-cv-verification' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-12">
            <CrowdsourceCvVerification
              onForwardToCap={(reportCode) => {
                setActiveModule('emergency-broadcast-and-dispatch');
                triggerGlobalToast(`CAP Alert pre-filled with incident parameters from ${reportCode}`);
              }}
            />
          </div>
        )}

        {/* Sub-Module: Emergency Broadcast & Dispatch */}
        {activeModule === 'emergency-broadcast-and-dispatch' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-12">
            <BroadcastAndDispatch
              onSirenTriggered={() =>
                triggerGlobalToast('Stage 3 High-Decibel Acoustic Warning Siren Active across 6 towers')
              }
            />
          </div>
        )}

        {/* Sub-Module: ML Models & Pipeline */}
        {activeModule === 'ml-models-pipeline' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-12">
            <MlPipelineCommand />
          </div>
        )}

        {/* Feature: Real Landslide Risk Prediction Simulator */}
        {activeModule === 'risk-simulator' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-12">
            <LandslideRiskSimulator
              theme={theme}
              onNavigateToMap={() => setActiveModule('risk-map')}
              onResultGenerated={(res) => {
                triggerGlobalToast(
                  `Real ML Simulation: ${res.prediction_label} (${(res.landslide_probability * 100).toFixed(1)}% probability, Risk: ${res.risk_level})`
                );
              }}
            />
          </div>
        )}
      </main>

      {/* Floating Action Button: Citizen Field Report Upload */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsFieldModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-full shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer border border-white/20 text-xs sm:text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Report Hazard</span>
        </button>
      </div>

      {/* Active Siren Emergency Silence Bar */}
      {isSirenActive && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white border-2 border-red-300 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-pulse">
          <VolumeX className="w-5 h-5 text-amber-300 animate-bounce" />
          <span className="font-mono text-xs sm:text-sm font-bold tracking-wide">
            ACOUSTIC SIREN ACTIVE (130 dB)
          </span>
          <button
            onClick={() => {
              sirenPlayer.stop();
              triggerGlobalToast('Acoustic Siren Silenced');
            }}
            className="bg-white hover:bg-slate-100 text-red-700 font-mono font-black text-xs px-3 py-1 rounded-full shadow cursor-pointer transition-all uppercase tracking-tight"
          >
            Silence / Turn Off (Esc)
          </button>
        </div>
      )}

      {/* Global Toast Alert */}
      {globalToast && (
        <div
          className={`fixed top-24 right-6 z-50 border px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm animate-fade-in ${
            isDark
              ? 'bg-slate-800 text-slate-100 border-slate-700'
              : 'bg-white text-slate-800 border-slate-300'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{globalToast}</span>
        </div>
      )}

      {/* Citizen Field Report Submission Modal */}
      <FieldReportModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        onSubmitSuccess={triggerGlobalToast}
      />

      {/* National Institutional Footer */}
      <footer
        className={`border-t py-6 px-3 sm:px-6 text-xs transition-colors duration-200 mt-auto ${
          isDark
            ? 'bg-[#060a12] border-slate-800 text-slate-400'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={ASSET_URLS.emblem}
              alt="Government of India"
              className="w-8 h-8 object-contain brightness-110"
            />
            <div>
              <div className="font-bold uppercase text-[11px]">
                TerraGuard • National Landslide Early Warning System
              </div>
              <div className="text-[10px] text-slate-400">
                Ministry of Mines • Geological Survey of India (GSI) • National Disaster Management Authority (NDMA)
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span>GSAT-7A Telemetry Mesh</span>
            <span className="text-slate-500">|</span>
            <span>Sentinel-1 InSAR Kinematics</span>
            <span className="text-slate-500">|</span>
            <span>Disaster Mgmt Act 2005</span>
            <span className="text-slate-500">|</span>
            <span className="text-amber-500 font-bold">Helpline: 1078 / 1077</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
