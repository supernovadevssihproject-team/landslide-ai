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
            // Emblem Badge
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: TerraTheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
                border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.4)),
              ),
              child: const Icon(Icons.shield, color: TerraTheme.primary, size: 20),
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
                        width: 7,
                        height: 7,
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

            // Pending sync pill
            if (pendingCount > 0)
              Container(
                margin: const EdgeInsets.only(right: 8),
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: TerraTheme.warning.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TerraTheme.warning.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.cloud_upload_outlined, color: TerraTheme.warning, size: 13),
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
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: TerraTheme.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.3)),
                ),
                child: const Text(
                  'SYNCED',
                  style: TextStyle(
                    color: TerraTheme.primary,
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),

            // Emergency trigger button
            IconButton(
              onPressed: onSosPressed,
              tooltip: 'Emergency SOS',
              icon: const Icon(Icons.emergency_outlined, color: TerraTheme.critical, size: 22),
            ),
          ],
        ),
      ),
    );
  }
}
