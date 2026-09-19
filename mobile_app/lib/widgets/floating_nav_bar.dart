import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class FloatingBottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FloatingBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      _NavItemData(icon: Icons.shield_outlined, activeIcon: Icons.shield, label: 'Home'),
      _NavItemData(icon: Icons.camera_alt_outlined, activeIcon: Icons.camera_alt, label: 'Report'),
      _NavItemData(icon: Icons.format_list_bulleted_outlined, activeIcon: Icons.format_list_bulleted, label: 'My Reports'),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Container(
        height: 64,
        decoration: BoxDecoration(
          color: TerraTheme.surface.withValues(alpha: 0.95),
          borderRadius: BorderRadius.circular(32),
          border: Border.all(color: TerraTheme.border, width: 1.2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.4),
              blurRadius: 20,
              spreadRadius: 2,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(items.length, (index) {
              final isSelected = currentIndex == index;
              final item = items[index];
              final color = isSelected ? TerraTheme.primary : TerraTheme.textMuted;

              return InkWell(
                onTap: () => onTap(index),
                borderRadius: BorderRadius.circular(24),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeOut,
                  padding: EdgeInsets.symmetric(
                    horizontal: isSelected ? 16 : 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? TerraTheme.primary.withValues(alpha: 0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(24),
                    border: isSelected
                        ? Border.all(color: TerraTheme.primary.withValues(alpha: 0.4), width: 1)
                        : Border.all(color: Colors.transparent),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isSelected ? item.activeIcon : item.icon,
                        color: color,
                        size: 20,
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 8),
                        Text(
                          item.label,
                          style: const TextStyle(
                            color: TerraTheme.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavItemData {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  _NavItemData({required this.icon, required this.activeIcon, required this.label});
}
