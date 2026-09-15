/**
 * Verified HWSD2 Soil Mappings
 * Extracted directly from HWSD2.mdb (HWSD2_SMU dominant SHARE -> WRB4 -> D_WRB4.VALUE)
 */

export interface SoilInfo {
  soilId: number;
  smuId: number;
  share: number;
  wrb4: string;
  name: string;
  label: string;
}

export const VERIFIED_SOIL_MAP: Record<string, SoilInfo> = {
  "3636.0": { soilId: 3636, smuId: 3636, share: 50, wrb4: "ACfr", name: "Ferric Acrisols", label: "Ferric Acrisols (ID 3636.0)" },
  "3637.0": { soilId: 3637, smuId: 3637, share: 40, wrb4: "ACfr", name: "Ferric Acrisols", label: "Ferric Acrisols (ID 3637.0)" },
  "3646.0": { soilId: 3646, smuId: 3646, share: 60, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3646.0)" },
  "3647.0": { soilId: 3647, smuId: 3647, share: 60, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3647.0)" },
  "3648.0": { soilId: 3648, smuId: 3648, share: 40, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3648.0)" },
  "3649.0": { soilId: 3649, smuId: 3649, share: 60, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3649.0)" },
  "3650.0": { soilId: 3650, smuId: 3650, share: 60, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3650.0)" },
  "3651.0": { soilId: 3651, smuId: 3651, share: 40, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 3651.0)" },
  "3661.0": { soilId: 3661, smuId: 3661, share: 60, wrb4: "CMdy", name: "Dystric Cambisols", label: "Dystric Cambisols (ID 3661.0)" },
  "3662.0": { soilId: 3662, smuId: 3662, share: 60, wrb4: "CMdy", name: "Dystric Cambisols", label: "Dystric Cambisols (ID 3662.0)" },
  "3665.0": { soilId: 3665, smuId: 3665, share: 50, wrb4: "CMdy", name: "Dystric Cambisols", label: "Dystric Cambisols (ID 3665.0)" },
  "3682.0": { soilId: 3682, smuId: 3682, share: 60, wrb4: "CMeu", name: "Eutric Cambisols", label: "Eutric Cambisols (ID 3682.0)" },
  "3683.0": { soilId: 3683, smuId: 3683, share: 50, wrb4: "CMeu", name: "Eutric Cambisols", label: "Eutric Cambisols (ID 3683.0)" },
  "3689.0": { soilId: 3689, smuId: 3689, share: 40, wrb4: "CMfl", name: "Ferralic Cambisols", label: "Ferralic Cambisols (ID 3689.0)" },
  "3701.0": { soilId: 3701, smuId: 3701, share: 60, wrb4: "GLdy", name: "Dystric Gleysols", label: "Dystric Gleysols (ID 3701.0)" },
  "3703.0": { soilId: 3703, smuId: 3703, share: 70, wrb4: "GLeu", name: "Eutric Gleysols", label: "Eutric Gleysols (ID 3703.0)" },
  "3705.0": { soilId: 3705, smuId: 3705, share: 70, wrb4: "GLeu", name: "Eutric Gleysols", label: "Eutric Gleysols (ID 3705.0)" },
  "3707.0": { soilId: 3707, smuId: 3707, share: 60, wrb4: "GLeu", name: "Eutric Gleysols", label: "Eutric Gleysols (ID 3707.0)" },
  "3708.0": { soilId: 3708, smuId: 3708, share: 80, wrb4: "GLeu", name: "Eutric Gleysols", label: "Eutric Gleysols (ID 3708.0)" },
  "3709.0": { soilId: 3709, smuId: 3709, share: 50, wrb4: "GLcc", name: "Calcic Gleysols", label: "Calcic Gleysols (ID 3709.0)" },
  "3717.0": { soilId: 3717, smuId: 3717, share: 25, wrb4: "LPnt", name: "Nudilithic Leptosols", label: "Nudilithic Leptosols (ID 3717.0)" },
  "3750.0": { soilId: 3750, smuId: 3750, share: 90, wrb4: "FLeu", name: "Eutric Fluvisols", label: "Eutric Fluvisols (ID 3750.0)" },
  "3814.0": { soilId: 3814, smuId: 3814, share: 70, wrb4: "NT", name: "Nitisols", label: "Nitisols (ID 3814.0)" },
  "3821.0": { soilId: 3821, smuId: 3821, share: 60, wrb4: "NT", name: "Nitisols", label: "Nitisols (ID 3821.0)" },
  "3849.0": { soilId: 3849, smuId: 3849, share: 70, wrb4: "RGdy", name: "Dystric Regosols", label: "Dystric Regosols (ID 3849.0)" },
  "3850.0": { soilId: 3850, smuId: 3850, share: 40, wrb4: "RGdy", name: "Dystric Regosols", label: "Dystric Regosols (ID 3850.0)" },
  "4255.0": { soilId: 4255, smuId: 4255, share: 60, wrb4: "ACfr", name: "Ferric Acrisols", label: "Ferric Acrisols (ID 4255.0)" },
  "4276.0": { soilId: 4276, smuId: 4276, share: 50, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 4276.0)" },
  "4282.0": { soilId: 4282, smuId: 4282, share: 40, wrb4: "ACha", name: "Haplic Acrisols", label: "Haplic Acrisols (ID 4282.0)" },
  "4301.0": { soilId: 4301, smuId: 4301, share: 50, wrb4: "UMcm", name: "Cambic Umbrisols", label: "Cambic Umbrisols (ID 4301.0)" },
  "4331.0": { soilId: 4331, smuId: 4331, share: 60, wrb4: "GLum", name: "Umbric Gleysols", label: "Umbric Gleysols (ID 4331.0)" },
  "4351.0": { soilId: 4351, smuId: 4351, share: 34, wrb4: "LPli", name: "Lithic Leptosols", label: "Lithic Leptosols (ID 4351.0)" },
  "4362.0": { soilId: 4362, smuId: 4362, share: 34, wrb4: "LPli", name: "Lithic Leptosols", label: "Lithic Leptosols (ID 4362.0)" },
  "4412.0": { soilId: 4412, smuId: 4412, share: 70, wrb4: "NT", name: "Nitisols", label: "Nitisols (ID 4412.0)" },
  "6690.0": { soilId: 6690, smuId: 6690, share: 70, wrb4: "GLeu", name: "Eutric Gleysols", label: "Eutric Gleysols (ID 6690.0)" },
  "6997.0": { soilId: 6997, smuId: 6997, share: 100, wrb4: "WR", name: "Open Water", label: "Open Water (ID 6997.0)" },
  "7001.0": { soilId: 7001, smuId: 7001, share: 100, wrb4: "TC", name: "Technosols", label: "Technosols (ID 7001.0)" },
  "11000.0": { soilId: 11000, smuId: 11000, share: 100, wrb4: "LVha", name: "Haplic Luvisols", label: "Haplic Luvisols (ID 11000.0)" },
  "11004.0": { soilId: 11004, smuId: 11004, share: 100, wrb4: "STrt", name: "Retic Stagnosols", label: "Retic Stagnosols (ID 11004.0)" },
  "11103.0": { soilId: 11103, smuId: 11103, share: 100, wrb4: "PHgz", name: "Greyzemic Phaeozems", label: "Greyzemic Phaeozems (ID 11103.0)" },
  "11423.0": { soilId: 11423, smuId: 11423, share: 100, wrb4: "PHgl", name: "Gleyic Phaeozems", label: "Gleyic Phaeozems (ID 11423.0)" },
  "11705.0": { soilId: 11705, smuId: 11705, share: 100, wrb4: "CRlp", name: "Leptic Cryosols", label: "Leptic Cryosols (ID 11705.0)" },
  "11711.0": { soilId: 11711, smuId: 11711, share: 100, wrb4: "CRlp", name: "Leptic Cryosols", label: "Leptic Cryosols (ID 11711.0)" },
  "11719.0": { soilId: 11719, smuId: 11719, share: 100, wrb4: "CRcm", name: "Cambic Cryosols", label: "Cambic Cryosols (ID 11719.0)" },
  "11724.0": { soilId: 11724, smuId: 11724, share: 100, wrb4: "LPmo", name: "Mollic Leptosols", label: "Mollic Leptosols (ID 11724.0)" },
  "11727.0": { soilId: 11727, smuId: 11727, share: 100, wrb4: "LPeu", name: "Eutric Leptosols", label: "Eutric Leptosols (ID 11727.0)" },
  "11730.0": { soilId: 11730, smuId: 11730, share: 100, wrb4: "CRlp", name: "Leptic Cryosols", label: "Leptic Cryosols (ID 11730.0)" },
  "11750.0": { soilId: 11750, smuId: 11750, share: 100, wrb4: "CMca", name: "Calcaric Cambisols", label: "Calcaric Cambisols (ID 11750.0)" },
  "11752.0": { soilId: 11752, smuId: 11752, share: 100, wrb4: "LPeu", name: "Eutric Leptosols", label: "Eutric Leptosols (ID 11752.0)" },
  "11765.0": { soilId: 11765, smuId: 11765, share: 100, wrb4: "CRlp", name: "Leptic Cryosols", label: "Leptic Cryosols (ID 11765.0)" },
  "11775.0": { soilId: 11775, smuId: 11775, share: 100, wrb4: "FRxa", name: "Xanthic Ferrasols", label: "Xanthic Ferrasols (ID 11775.0)" },
  "11790.0": { soilId: 11790, smuId: 11790, share: 100, wrb4: "UMac", name: "Acric Umbrisols", label: "Acric Umbrisols (ID 11790.0)" },
  "11814.0": { soilId: 11814, smuId: 11814, share: 100, wrb4: "UMac", name: "Acric Umbrisols", label: "Acric Umbrisols (ID 11814.0)" },
  "11839.0": { soilId: 11839, smuId: 11839, share: 100, wrb4: "ALha", name: "Haplic Alisols", label: "Haplic Alisols (ID 11839.0)" },
  "11864.0": { soilId: 11864, smuId: 11864, share: 100, wrb4: "LVha", name: "Haplic Luvisols", label: "Haplic Luvisols (ID 11864.0)" },
  "11879.0": { soilId: 11879, smuId: 11879, share: 100, wrb4: "LVha", name: "Haplic Luvisols", label: "Haplic Luvisols (ID 11879.0)" },
  "11909.0": { soilId: 11909, smuId: 11909, share: 100, wrb4: "LVha", name: "Haplic Luvisols", label: "Haplic Luvisols (ID 11909.0)" },
};

export function getSoilName(soilId: string | number): string {
  const key = typeof soilId === 'number' ? `${soilId.toFixed(1)}` : (soilId.includes('.') ? soilId : `${parseFloat(soilId).toFixed(1)}`);
  const info = VERIFIED_SOIL_MAP[key];
  if (info) return info.name;
  return `HWSD2 Soil ID ${soilId}`;
}

export function getSoilLabel(soilId: string | number): string {
  const key = typeof soilId === 'number' ? `${soilId.toFixed(1)}` : (soilId.includes('.') ? soilId : `${parseFloat(soilId).toFixed(1)}`);
  const info = VERIFIED_SOIL_MAP[key];
  if (info) return info.label;
  return `HWSD2 Soil ID ${soilId}`;
}
