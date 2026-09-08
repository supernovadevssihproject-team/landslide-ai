import React from 'react';
import { OperationalModule } from '../types';
import {
  Home,
  LayoutDashboard,
  Map,
  BarChart2,
  Bell,
  AlertOctagon,
  Cpu,
  Info,
  PlayCircle,
} from 'lucide-react';

interface NavigationProps {
  activeModule: OperationalModule;
  onChangeModule: (module: OperationalModule) => void;
  reportCount?: number;
  theme?: 'dark' | 'light';
}

export const Navigation: React.FC<NavigationProps> = ({
  activeModule,
  onChangeModule,
  reportCount = 12,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  const primaryModules: {
    id: OperationalModule;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  }[] = [
    {
      id: 'home',
      title: 'Home',
      icon: Home,
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'risk-map',
      title: 'Risk Map',
      icon: Map,
      badge: 'GIS 3D',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'risk-details',
      title: 'Risk Details',
      icon: BarChart2,
      badge: 'Analytics',
      badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'alerts',
      title: 'Alerts',
      icon: Bell,
      badge: '4 High',
      badgeColor: 'text-red-400 bg-red-500/15 border-red-500/30 animate-pulse',
    },
    {
      id: 'emergency-sos',
      title: 'Emergency SOS',
      icon: AlertOctagon,
      badge: '24x7',
      badgeColor: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
    },
    {
      id: 'risk-simulator',
      title: 'ML Simulator',
      icon: PlayCircle,
      badge: 'Real ML',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      id: 'about',
      title: 'About & ML',
      icon: Cpu,
    },
  ];

  return (
    <nav
      className={`border-b sticky top-[73px] z-40 transition-colors duration-200 ${
        isDark
          ? 'bg-[#0a121e]/95 backdrop-blur-md border-slate-800'
          : 'bg-white/95 backdrop-blur-md border-slate-200 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between overflow-x-auto no-scrollbar py-2 gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            {primaryModules.map((m) => {
              const Icon = m.icon;
              // Map legacy IDs to canonical nav items
              const isActive =
                activeModule === m.id ||
                (m.id === 'risk-map' && activeModule === 'spatial-gis-command') ||
                (m.id === 'alerts' && activeModule === 'emergency-broadcast-and-dispatch') ||
                (m.id === 'about' &&
                  (activeModule === 'ml-models-pipeline' ||
                    activeModule === 'temporal-lstm-predictor' ||
                    activeModule === 'crowdsource-cv-verification'));

              return (
                <button
                  key={m.id}
                  onClick={() => onChangeModule(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all relative cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                      : isDark
                      ? 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-emerald-500'}`} />
                  <span>{m.title}</span>

                  {m.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                        isActive ? 'bg-white/20 text-white border-white/30' : m.badgeColor
                      }`}
                    >
                      {m.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Launcher for ML Sandbox */}
          <div className="hidden lg:flex items-center gap-2 border-l pl-3 border-slate-700 dark:border-slate-800">
            <button
              onClick={() => onChangeModule('ml-models-pipeline')}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-mono transition-all ${
                activeModule === 'ml-models-pipeline'
                  ? 'bg-purple-600 text-white border-purple-500'
                  : isDark
                  ? 'bg-slate-800 text-purple-300 border-slate-700 hover:border-purple-500/50'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              ML Sandbox (19 Datasets)
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
