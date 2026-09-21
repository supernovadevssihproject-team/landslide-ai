import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LiveRiskLayerProps {
  map: L.Map | null;
  visible: boolean;
  data: any;
}

const riskStyle = (feature: any) => {
  const score = Number(feature?.properties?.risk_score ?? 0);
  let color = '#22c55e';
  if (score >= 75) color = '#ef4444';
  else if (score >= 50) color = '#f59e0b';
  else if (score >= 25) color = '#60a5fa';

  return {
    color,
    weight: 1.4,
    opacity: 0.9,
    fillColor: color,
    fillOpacity: 0.22,
    dashArray: '4 8',
  };
};

export const LiveRiskLayer: React.FC<LiveRiskLayerProps> = ({ map, visible, data }) => {
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = L.geoJSON([], {
        style: riskStyle,
        pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 8, color: '#f59e0b', fillColor: '#fcd34d', fillOpacity: 0.8 }),
      }).addTo(map);
    }

    const layer = layerRef.current;
    layer.clearLayers();

    if (!visible || !data || !data.features || data.features.length === 0) {
      return;
    }

    layer.addData(data);
    layer.eachLayer((item: any) => {
      const props = item.feature?.properties || {};
      const score = Number(props.risk_score ?? 0);
      const formatted = score.toFixed(1);
      const level = props.risk_level || 'LOW';
      item.bindTooltip(`
        <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-slate-100 rounded border border-cyan-500/80">
          <b class="text-cyan-300 block">${props.name || 'Risk Zone'}</b>
          <div>Risk: ${level}</div>
          <div>Score: ${formatted}</div>
          <div>${props.state || ''}</div>
        </div>
      `, { direction: 'top', sticky: true });

      item.bindPopup(`
        <div class="p-2 font-sans text-xs bg-slate-900 text-slate-100 rounded-lg max-w-xs">
          <div class="font-bold text-cyan-300 text-sm">${props.name || 'Risk Zone'}</div>
          <div class="mt-1 text-slate-300">${props.corridor || props.district || props.state || ''}</div>
          <div class="mt-2 grid grid-cols-2 gap-1 text-[10px] font-mono">
            <div><span class="text-slate-400">Risk:</span> <b class="text-white">${level}</b></div>
            <div><span class="text-slate-400">Score:</span> <b class="text-amber-300">${formatted}</b></div>
            <div><span class="text-slate-400">State:</span> <b class="text-cyan-300">${props.state || 'NER'}</b></div>
            <div><span class="text-slate-400">Updated:</span> <b class="text-emerald-300">${props.updated_at || 'now'}</b></div>
          </div>
        </div>
      `);
    });
  }, [map, visible, data]);

  return null;
};
