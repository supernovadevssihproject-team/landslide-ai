import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import 'field_report_capture_service.dart';
import 'offline_hazard_report.dart';

class OfflineHazardReportPage extends StatefulWidget {
  final FieldReportCaptureService captureService;
  final VoidCallback? onSaved;
  const OfflineHazardReportPage({super.key, required this.captureService, this.onSaved});

  @override
  State<OfflineHazardReportPage> createState() => _OfflineHazardReportPageState();
}

class _OfflineHazardReportPageState extends State<OfflineHazardReportPage> {
  HazardType _hazardType = HazardType.landslide;
  final _description = TextEditingController();
  bool _saving = false;
  String? _message;

  @override
  void dispose() {
    _description.dispose();
    super.dispose();
  }

  Future<void> _captureAndSave() async {
    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      final captured = await widget.captureService.capture(
        hazardType: _hazardType,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      );
      if (!mounted) return;
      setState(() => _message = captured == null
          ? 'Capture cancelled.'
          : 'Report saved locally on device. Will auto-sync when online.');
      if (captured != null) widget.onSaved?.call();
    } catch (error) {
      if (mounted) setState(() => _message = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: TerraTheme.background,
      appBar: AppBar(
        title: const Text('FIELD EVIDENCE CAPTURE'),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: TerraTheme.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.4)),
            ),
            child: const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.offline_pin_outlined, color: TerraTheme.primary, size: 14),
                SizedBox(width: 4),
                Text(
                  'OFFLINE SAFE',
                  style: TextStyle(color: TerraTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          // Header Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: TerraTheme.surface,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: TerraTheme.border),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: TerraTheme.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: TerraTheme.primary.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.camera_alt, color: TerraTheme.primary, size: 26),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Geo-Tagged Field Capture',
                        style: TextStyle(color: TerraTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Photo, GPS coordinates & time are saved locally on device first.',
                        style: TextStyle(color: TerraTheme.textSecondary, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Hazard Type Chips
          const Text(
            'SELECT HAZARD TYPE',
            style: TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: HazardType.values.map((type) {
              final isSelected = _hazardType == type;
              return ChoiceChip(
                label: Text(type.name.toUpperCase()),
                selected: isSelected,
                selectedColor: TerraTheme.primary,
                backgroundColor: TerraTheme.surface,
                labelStyle: TextStyle(
                  color: isSelected ? Colors.white : TerraTheme.textSecondary,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(color: isSelected ? TerraTheme.primary : TerraTheme.border),
                ),
                onSelected: (selected) {
                  if (selected) setState(() => _hazardType = type);
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Description Input
          const Text(
            'FIELD OBSERVATION NOTES',
            style: TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: _description,
            maxLines: 4,
            style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Enter rockfall details, road blockages, crack widths, soil movement observations...',
              hintStyle: const TextStyle(color: TerraTheme.textMuted, fontSize: 13),
              filled: true,
              fillColor: TerraTheme.surface,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: TerraTheme.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: TerraTheme.border)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: TerraTheme.primary)),
            ),
          ),
          const SizedBox(height: 24),

          // Primary Capture Button
          SizedBox(
            width: double.infinity,
            height: 54,
            child: ElevatedButton.icon(
              onPressed: _saving ? null : _captureAndSave,
              icon: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.camera, size: 22),
              label: Text(
                _saving ? 'SAVING LOCALLY...' : 'CAPTURE PHOTO & SAVE REPORT',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: TerraTheme.primary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),

          if (_message != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: _message!.contains('cancelled')
                    ? TerraTheme.surface
                    : TerraTheme.primary.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: _message!.contains('cancelled') ? TerraTheme.border : TerraTheme.primary,
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    _message!.contains('cancelled') ? Icons.info_outline : Icons.check_circle_outline,
                    color: _message!.contains('cancelled') ? TerraTheme.textMuted : TerraTheme.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      _message!,
                      style: TextStyle(
                        color: _message!.contains('cancelled') ? TerraTheme.textSecondary : TerraTheme.primary,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
