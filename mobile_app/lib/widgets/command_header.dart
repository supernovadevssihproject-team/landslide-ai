import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CommandHeader extends StatelessWidget {
  final int pendingCount;
  final VoidCallback? onSosPressed;

  const CommandHeader({
    super.key,
    required this.pendingCount,
    this.onSosPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: TerraTheme.surface,
        border: Border(bottom: BorderSide(color: TerraTheme.border, width: 1)),
      ),
      child: SafeArea(
        bottom: false,
        child: Row(
          children: [
            // Shield Emblem
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: TerraTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.shield_outlined, color: TerraTheme.primary, size: 20),
            ),
            const SizedBox(width: 12),

            // Title & Status
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'TERRAGUARD',
                    style: TextStyle(
                      color: TerraTheme.textPrimary,
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: TerraTheme.primary,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'FIELD COMMAND ONLINE',
                        style: TextStyle(
                          color: TerraTheme.primary,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Sync Status Pill
            if (pendingCount > 0)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: TerraTheme.warning.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TerraTheme.warning.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_upload_outlined, color: TerraTheme.warning, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      '$pendingCount PENDING',
                      style: const TextStyle(
                        color: TerraTheme.warning,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              )
            else
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: TerraTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.3)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.check_circle_outline, color: TerraTheme.primary, size: 12),
                    SizedBox(width: 4),
                    Text(
                      'SYNCED',
                      style: TextStyle(
                        color: TerraTheme.primary,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),

            // Safety & Emergency Trigger Button
            Material(
              color: TerraTheme.critical.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                onTap: onSosPressed,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: TerraTheme.critical.withValues(alpha: 0.4)),
                  ),
                  child: const Icon(Icons.emergency_outlined, color: TerraTheme.critical, size: 20),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
