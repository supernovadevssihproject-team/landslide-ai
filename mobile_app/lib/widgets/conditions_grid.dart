import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'shimmer_loading.dart';

class ConditionsGrid extends StatelessWidget {
  final Map<String, dynamic> rainfall;
  final Map<String, dynamic> seismic;
  final bool loading;

  const ConditionsGrid({
    super.key,
    required this.rainfall,
    required this.seismic,
    required this.loading,
  });

  String _formatRainfall(Object? val) {
    if (val == null) return 'Unavailable';
    if (val is num) return '${val.toStringAsFixed(1)} mm / 1d';
    return '$val mm / 1d';
  }

  String _formatSeismic(Object? val) {
    if (val == null) return 'Unavailable';
    if (val is num) return '$val events';
    return '$val events';
  }

  @override
  Widget build(BuildContext context) {
    final rainStr = loading ? 'Loading...' : _formatRainfall(rainfall['rainfall_1d_mm']);
    final seismicStr = loading ? 'Loading...' : _formatSeismic(seismic['events_in_range_500km']);

    return Row(
      children: [
        Expanded(
          child: _ConditionTile(
            icon: Icons.water_drop_outlined,
            iconColor: TerraTheme.secondary,
            title: 'RAINFALL',
            value: rainStr,
            subtitle: 'Recent 24h accumulation',
            loading: loading,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _ConditionTile(
            icon: Icons.public_outlined,
            iconColor: TerraTheme.warning,
            title: 'SEISMIC ACTIVITY',
            value: seismicStr,
            subtitle: 'Within 500 km radius',
            loading: loading,
          ),
        ),
      ],
    );
  }
}

class _ConditionTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String value;
  final String subtitle;
  final bool loading;

  const _ConditionTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.value,
    required this.subtitle,
    required this.loading,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: TerraTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: TerraTheme.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 18),
              ),
              const Spacer(),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: iconColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              color: TerraTheme.textMuted,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 4),
          if (loading)
            const ShimmerSkeleton(width: 100, height: 20)
          else
            Text(
              value,
              style: const TextStyle(
                color: TerraTheme.textPrimary,
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          const SizedBox(height: 4),
          Text(
            subtitle,
            style: const TextStyle(
              color: TerraTheme.textSecondary,
              fontSize: 10,
            ),
          ),
        ],
      ),
    );
  }
}
