import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../operational_risk_api.dart';
import '../theme/app_theme.dart';
import 'shimmer_loading.dart';

class RiskArcGauge extends StatelessWidget {
  final OperationalZone? zone;
  final RiskEvaluation? risk;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  const RiskArcGauge({
    super.key,
    required this.zone,
    required this.risk,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final severityColor = TerraTheme.getSeverityColor(risk?.riskLevel);
    final isCached = risk?.dataSource == RiskDataSource.cached;
    final isUnavailable = risk?.dataSource == RiskDataSource.unavailable;
    final score = risk?.riskScore ?? 0;
    final levelStr = risk?.riskLevel?.replaceAll('_', ' ').toUpperCase() ?? 'PENDING';

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: TerraTheme.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: severityColor.withValues(alpha: 0.35), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: severityColor.withValues(alpha: 0.12),
            blurRadius: 24,
            spreadRadius: 2,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Top Location Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: severityColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: severityColor.withValues(alpha: 0.3)),
                  ),
                  child: Icon(Icons.shield, color: severityColor, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        zone?.name ?? 'Select Operational Location',
                        style: const TextStyle(
                          color: TerraTheme.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        zone != null ? '${zone!.state.toUpperCase()} SECTOR' : 'SECTOR MONITORING',
                        style: const TextStyle(
                          color: TerraTheme.textSecondary,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                if (risk?.riskLevel != null && !loading)
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: severityColor.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: severityColor, width: 1.2),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: BoxDecoration(
                                color: severityColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              levelStr,
                              style: TextStyle(
                                color: severityColor,
                                fontWeight: FontWeight.bold,
                                fontSize: 11,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                            color: isCached
                              ? TerraTheme.warning.withValues(alpha: 0.18)
                              : isUnavailable
                                ? TerraTheme.textMuted.withValues(alpha: 0.18)
                                : TerraTheme.primary.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isCached
                                ? TerraTheme.warning.withValues(alpha: 0.5)
                              : isUnavailable
                                ? TerraTheme.textMuted.withValues(alpha: 0.5)
                                : TerraTheme.primary.withValues(alpha: 0.5),
                          ),
                        ),
                        child: Text(
                          risk!.dataSourceLabel,
                          style: TextStyle(
                            color: isCached
                              ? TerraTheme.warning
                              : isUnavailable
                                ? TerraTheme.textMuted
                                : TerraTheme.primary,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                          ),
                        ),
                      ),
                    ],
                  ),
              ],
            ),
            const SizedBox(height: 20),

            // Main Arc Gauge or Skeleton/Error state
            if (loading)
              const Column(
                children: [
                  SizedBox(height: 10),
                  ShimmerSkeleton(width: 160, height: 160, borderRadius: 80),
                  SizedBox(height: 16),
                  ShimmerSkeleton(width: 200, height: 16),
                  SizedBox(height: 8),
                  ShimmerSkeleton(width: 140, height: 14),
                  SizedBox(height: 10),
                ],
              )
            else if (error != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: TerraTheme.critical.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: TerraTheme.critical.withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    const Icon(Icons.error_outline, color: TerraTheme.critical, size: 36),
                    const SizedBox(height: 8),
                    Text(
                      error!,
                      style: const TextStyle(color: TerraTheme.textSecondary, fontSize: 13),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: onRetry,
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('RETRY EVALUATION'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: TerraTheme.critical,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              )
            else if (risk == null)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24),
                child: Text(
                  'Select an operational location above to initialize AI hazard calculation.',
                  style: TextStyle(color: TerraTheme.textMuted, fontSize: 13),
                  textAlign: TextAlign.center,
                ),
              )
            else ...[
              // Custom Arc Visualizer
              SizedBox(
                height: 160,
                width: 220,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    CustomPaint(
                      size: const Size(220, 160),
                      painter: _ArcPainter(
                        score: score,
                        color: severityColor,
                      ),
                    ),
                    Positioned(
                      top: 45,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '$score',
                            style: TextStyle(
                              color: severityColor,
                              fontSize: 44,
                              fontWeight: FontWeight.w900,
                              height: 1.0,
                              letterSpacing: -1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'RISK SCORE / 100',
                            style: TextStyle(
                              color: TerraTheme.textMuted,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12),

              // Metrics Row
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: TerraTheme.background.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: TerraTheme.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'PROBABILITY',
                            style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            risk!.probabilityPercentage == null
                                ? '-'
                                : '${risk!.probabilityPercentage!.toStringAsFixed(1)}%',
                            style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          if (risk!.baseProbability != null)
                            Text(
                              'Base ML ${risk!.baseProbability!.toStringAsFixed(2)}',
                              style: const TextStyle(color: TerraTheme.textSecondary, fontSize: 10),
                            ),
                        ],
                      ),
                    ),
                    Container(width: 1, height: 32, color: TerraTheme.border),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'COORDINATES',
                            style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${risk!.latitude.toStringAsFixed(4)}°, ${risk!.longitude.toStringAsFixed(4)}°',
                            style: const TextStyle(
                              color: TerraTheme.secondary,
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'monospace',
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  final int score;
  final Color color;

  _ArcPainter({required this.score, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    const startAngle = 140 * math.pi / 180;
    const totalSweepAngle = 260 * math.pi / 180;
    const gaugeStrokeWidth = 14.0;
    final center = Offset(size.width / 2, size.height / 2 + 15);
    final radius = math.min(size.width, size.height * 2) / 2 - gaugeStrokeWidth;

    // Track Background
    final trackPaint = Paint()
      ..color = TerraTheme.border.withValues(alpha: 0.6)
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke
      ..strokeWidth = gaugeStrokeWidth;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      startAngle,
      totalSweepAngle,
      false,
      trackPaint,
    );

    // Active Value Arc
    final currentSweep = (score / 100.0) * totalSweepAngle;
    if (currentSweep > 0) {
      final activePaint = Paint()
        ..color = color
        ..strokeCap = StrokeCap.round
        ..style = PaintingStyle.stroke
        ..strokeWidth = gaugeStrokeWidth;

      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        startAngle,
        currentSweep,
        false,
        activePaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ArcPainter oldDelegate) {
    return oldDelegate.score != score || oldDelegate.color != color;
  }
}
