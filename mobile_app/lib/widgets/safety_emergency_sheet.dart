import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../config/app_config.dart';
import '../theme/app_theme.dart';

class SafetyEmergencySheet extends StatelessWidget {
  const SafetyEmergencySheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: TerraTheme.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const SafetyEmergencySheet(),
    );
  }

  Future<void> _launchWebUrl(BuildContext context, String path, String failureMsg) async {
    final fullUrl = '${AppConfig.webUrl}$path';
    final uri = Uri.parse(fullUrl);
    try {
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failureMsg)));
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failureMsg)));
      }
    }
  }

  Future<void> _callHotline(BuildContext context, String number) async {
    final uri = Uri.parse('tel:$number');
    try {
      await launchUrl(uri);
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hotline number: $number')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag Handle
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: TerraTheme.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Modal Title Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: TerraTheme.critical.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(color: TerraTheme.critical.withValues(alpha: 0.4)),
                ),
                child: const Icon(Icons.emergency_outlined, color: TerraTheme.critical, size: 26),
              ),
              const SizedBox(width: 14),
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'SAFETY & EMERGENCY RESPONSE',
                      style: TextStyle(
                        color: TerraTheme.critical,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.0,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Disaster Hotlines & Field Guidance',
                      style: TextStyle(
                        color: TerraTheme.textPrimary,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          Expanded(
            child: ListView(
              shrinkWrap: true,
              children: [
                // Hotlines Card
                const Text(
                  'STATE DISASTER MANAGEMENT HOTLINES',
                  style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: TerraTheme.background,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: TerraTheme.border),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _callHotline(context, '1077'),
                          borderRadius: BorderRadius.circular(12),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 4),
                            child: Column(
                              children: [
                                Text('SDMA HOTLINE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                SizedBox(height: 4),
                                Text('1077', style: TextStyle(color: TerraTheme.critical, fontSize: 22, fontWeight: FontWeight.bold)),
                                SizedBox(height: 2),
                                Text('Tap to Call', style: TextStyle(color: TerraTheme.textSecondary, fontSize: 10)),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 40, child: VerticalDivider(color: TerraTheme.border)),
                      Expanded(
                        child: InkWell(
                          onTap: () => _callHotline(context, '1078'),
                          borderRadius: BorderRadius.circular(12),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 4),
                            child: Column(
                              children: [
                                Text('NDMA HOTLINE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
                                SizedBox(height: 4),
                                Text('1078', style: TextStyle(color: TerraTheme.critical, fontSize: 22, fontWeight: FontWeight.bold)),
                                SizedBox(height: 2),
                                Text('Tap to Call', style: TextStyle(color: TerraTheme.textSecondary, fontSize: 10)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),

                // Web Handoff Actions
                const Text(
                  'FIELD PLATFORM HANDOFFS',
                  style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _HandoffTile(
                        icon: Icons.other_houses_outlined,
                        color: TerraTheme.primary,
                        title: 'Safety Shelters',
                        subtitle: 'Open Web Shelters View',
                        onTap: () => _launchWebUrl(context, '/shelters', 'Unable to launch Safety Shelters web view.'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _HandoffTile(
                        icon: Icons.map_outlined,
                        color: TerraTheme.secondary,
                        title: 'Web Risk Map',
                        subtitle: 'Open GIS Portal View',
                        onTap: () => _launchWebUrl(context, '', 'Unable to launch Web Risk Map.'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),

                // Field Safety Guidance
                const Text(
                  'FIELD SAFETY PROTOCOLS',
                  style: TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: TerraTheme.background,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: TerraTheme.border),
                  ),
                  child: const Column(
                    children: [
                      _GuidelineItem(
                        icon: Icons.warning_amber_rounded,
                        color: TerraTheme.warning,
                        text: 'Watch for warning signs: new soil cracks, tilting trees, or sudden stream water discoloration.',
                      ),
                      SizedBox(height: 10),
                      _GuidelineItem(
                        icon: Icons.directions_run_rounded,
                        color: TerraTheme.primary,
                        text: 'Move perpendicular to the landslide path toward higher stable ground immediately upon rumble noises.',
                      ),
                      SizedBox(height: 10),
                      _GuidelineItem(
                        icon: Icons.gavel_rounded,
                        color: TerraTheme.secondary,
                        text: 'Avoid river channels and low-lying drainage paths during prolonged intense rainfall.',
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),

          // Dismiss Button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: TerraTheme.surfaceElevated,
                foregroundColor: TerraTheme.textPrimary,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                  side: const BorderSide(color: TerraTheme.border),
                ),
              ),
              child: const Text('DISMISS', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}

class _HandoffTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _HandoffTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: TerraTheme.background,
      borderRadius: BorderRadius.circular(14),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: TerraTheme.border),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: const TextStyle(color: TerraTheme.textMuted, fontSize: 10)),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GuidelineItem extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String text;

  const _GuidelineItem({
    required this.icon,
    required this.color,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(color: TerraTheme.textSecondary, fontSize: 12, height: 1.3),
          ),
        ),
      ],
    );
  }
}
