import 'package:flutter/material.dart';

class TerraTheme {
  // Surface Color Tokens
  static const Color background = Color(0xFF060B13);
  static const Color surface = Color(0xFF0D1624);
  static const Color surfaceElevated = Color(0xFF132034);
  static const Color interactiveSurface = Color(0xFF1A2B44);
  static const Color border = Color(0xFF1E2D42);
  static const Color borderLight = Color(0xFF2A3D58);

  // Palette Tokens
  static const Color primary = Color(0xFF10B981); // Emerald
  static const Color secondary = Color(0xFF06B6D4); // Cyan
  static const Color warning = Color(0xFFF59E0B); // Amber
  static const Color critical = Color(0xFFEF4444); // Red
  static const Color textMuted = Color(0xFF64748B);
  static const Color textSecondary = Color(0xFF94A3B8);
  static const Color textPrimary = Color(0xFFF8FAFC);

  static Color getSeverityColor(String? level) {
    switch (level?.toUpperCase()) {
      case 'CRITICAL':
      case 'VERY_HIGH':
        return critical;
      case 'HIGH':
        return const Color(0xFFF97316); // Orange
      case 'MODERATE':
      case 'MEDIUM':
        return warning;
      case 'LOW':
        return primary;
      default:
        return secondary;
    }
  }

  static ThemeData get darkTheme {
    return ThemeData.dark().copyWith(
      scaffoldBackgroundColor: background,
      colorScheme: const ColorScheme.dark(
        primary: primary,
        secondary: secondary,
        surface: surface,
        error: critical,
      ),
      cardTheme: const CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(20)),
          side: BorderSide(color: border, width: 1),
        ),
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: TextStyle(
          color: textPrimary,
          fontSize: 17,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: surfaceElevated,
        contentTextStyle: const TextStyle(color: textPrimary, fontSize: 13),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: border),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
