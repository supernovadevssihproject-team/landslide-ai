/**
 * Verified ESA WorldCover Landcover Class Mappings
 * Standard ESA WorldCover legend definitions
 */

export interface LandcoverInfo {
  code: string;
  name: string;
  label: string;
}

export const VERIFIED_LANDCOVER_MAP: Record<string, LandcoverInfo> = {
  "10.0": { code: "10.0", name: "Tree Cover", label: "Tree Cover (Class 10.0)" },
  "30.0": { code: "30.0", name: "Grassland", label: "Grassland (Class 30.0)" },
  "40.0": { code: "40.0", name: "Cropland", label: "Cropland (Class 40.0)" },
  "50.0": { code: "50.0", name: "Built-up", label: "Built-up (Class 50.0)" },
  "60.0": { code: "60.0", name: "Bare / Sparse Vegetation", label: "Bare / Sparse Vegetation (Class 60.0)" },
  "70.0": { code: "70.0", name: "Snow and Ice", label: "Snow and Ice (Class 70.0)" },
  "80.0": { code: "80.0", name: "Permanent Water Bodies", label: "Permanent Water Bodies (Class 80.0)" },
  "90.0": { code: "90.0", name: "Herbaceous Wetland", label: "Herbaceous Wetland (Class 90.0)" },
  "100.0": { code: "100.0", name: "Moss and Lichen", label: "Moss and Lichen (Class 100.0)" },
};

export function getLandcoverName(classCode: string | number): string {
  const key = typeof classCode === 'number' ? `${classCode.toFixed(1)}` : (classCode.includes('.') ? classCode : `${parseFloat(classCode).toFixed(1)}`);
  const info = VERIFIED_LANDCOVER_MAP[key];
  if (info) return info.name;
  return `ESA WorldCover Class ${classCode}`;
}

export function getLandcoverLabel(classCode: string | number): string {
  const key = typeof classCode === 'number' ? `${classCode.toFixed(1)}` : (classCode.includes('.') ? classCode : `${parseFloat(classCode).toFixed(1)}`);
  const info = VERIFIED_LANDCOVER_MAP[key];
  if (info) return info.label;
  return `ESA WorldCover Class ${classCode}`;
}
