import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class QuickActionsSection extends StatelessWidget {
  final VoidCallback onOpenMap;
  final VoidCallback onOpenReport;
  final VoidCallback onOpenMyReports;
  final VoidCallback onOpenSos;

  const QuickActionsSection({
    super.key,
    required this.onOpenMap,
    required this.onOpenReport,
    required this.onOpenMyReports,
    required this.onOpenSos,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'FIELD QUICK ACTIONS',
          style: TextStyle(
            color: TerraTheme.textMuted,
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.0,
          ),
        ),
        const SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.6,
          children: [
            _ActionCard(
              icon: Icons.map_outlined,
              color: TerraTheme.secondary,
              title: 'Risk Map',
              subtitle: 'GIS Terrain View',
              onTap: onOpenMap,
            ),
            _ActionCard(
              icon: Icons.camera_alt_outlined,
              color: TerraTheme.primary,
              title: 'Report Hazard',
              subtitle: 'Offline Evidence Capture',
              onTap: onOpenReport,
            ),
            _ActionCard(
              icon: Icons.format_list_bulleted_outlined,
              color: Colors.purpleAccent,
              title: 'My Reports',
              subtitle: 'Queue & History',
              onTap: onOpenMyReports,
            ),
            _ActionCard(
              icon: Icons.emergency_outlined,
              color: TerraTheme.critical,
              title: 'Emergency / SOS',
              subtitle: 'Hotline Dispatch Info',
              onTap: onOpenSos,
            ),
          ],
        ),
      ],
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TerraTheme.surface,
      borderRadius: BorderRadius.circular(20),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        splashColor: color.withValues(alpha: 0.2),
        highlightColor: color.withValues(alpha: 0.1),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: TerraTheme.border, width: 1),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const Spacer(),
                  Icon(Icons.arrow_forward_ios_rounded, color: TerraTheme.textMuted.withValues(alpha: 0.5), size: 12),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: TerraTheme.textPrimary,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: const TextStyle(
                      color: TerraTheme.textMuted,
                      fontSize: 10,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
