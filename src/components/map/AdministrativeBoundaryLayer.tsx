import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface AdministrativeBoundaryLayerProps {
  map: L.Map | null;
  visible: boolean;
  data: any;
}

export const AdministrativeBoundaryLayer: React.FC<AdministrativeBoundaryLayerProps> = ({ map, visible, data }) => {
  const layerRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!layerRef.current) {
      layerRef.current = L.geoJSON([], {
        style: () => ({
          color: '#67e8f9',
          weight: 1,
          opacity: 0.9,
          fillColor: '#0ea5e9',
          fillOpacity: 0.04,
        }),
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
      item.bindTooltip(`
        <div class="p-1.5 font-mono text-[10px] bg-slate-950 text-cyan-100 rounded border border-cyan-500/70">
          <b class="text-cyan-300 block">${props.state || 'Administrative boundary'}</b>
          <div>${props.district || 'State context'}</div>
        </div>
      `, { direction: 'top', sticky: true });
    });
  }, [map, visible, data]);

  return null;
};
