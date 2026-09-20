import 'package:flutter/material.dart';
import '../operational_risk_api.dart';
import '../theme/app_theme.dart';

class RiskMapEntryCard extends StatelessWidget {
  final OperationalZone? zone;
  final RiskEvaluation? risk;
  final VoidCallback onTap;

  const RiskMapEntryCard({
    super.key,
    required this.zone,
    required this.risk,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final severityColor = TerraTheme.getSeverityColor(risk?.riskLevel);

    return Material(
      color: TerraTheme.surface,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        splashColor: TerraTheme.secondary.withValues(alpha: 0.2),
        child: Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: TerraTheme.border, width: 1),
            gradient: LinearGradient(
              colors: [
                TerraTheme.surface,
                TerraTheme.surfaceElevated.withValues(alpha: 0.8),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                // Map Illustration Icon
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: TerraTheme.secondary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: TerraTheme.secondary.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.terrain_outlined, color: TerraTheme.secondary, size: 28),
                ),
                const SizedBox(width: 14),

                // Map Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'RISK MAP GIS VIEW',
                            style: TextStyle(
                              color: TerraTheme.secondary,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: severityColor.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              risk?.riskLevel ?? 'SECTOR MAP',
                              style: TextStyle(
                                color: severityColor,
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        zone?.name ?? 'Interactive GIS Terrain Overlays',
                        style: const TextStyle(
                          color: TerraTheme.textPrimary,
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Tap to launch spatial map with sector pins',
                        style: TextStyle(
                          color: TerraTheme.textMuted,
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: TerraTheme.background,
                    shape: BoxShape.circle,
                    border: Border.all(color: TerraTheme.border),
                  ),
                  child: const Icon(Icons.arrow_forward_rounded, color: TerraTheme.textPrimary, size: 16),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
