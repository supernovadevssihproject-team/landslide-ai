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
          : 'Photo and GPS saved. Upload queued; verification will continue when online.');
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
      appBar: AppBar(title: const Text('FIELD EVIDENCE CAPTURE')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: TerraTheme.surface, borderRadius: BorderRadius.circular(20), border: Border.all(color: TerraTheme.border)),
            child: const Row(children: [
              Icon(Icons.camera_alt, color: TerraTheme.primary, size: 28),
              SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Geo-Tagged Field Capture', style: TextStyle(color: TerraTheme.textPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
                SizedBox(height: 4),
                Text('Photo, GPS coordinates and time are saved locally before sync.', style: TextStyle(color: TerraTheme.textSecondary, fontSize: 11)),
              ])),
            ]),
          ),
          const SizedBox(height: 20),
          const Text('SELECT HAZARD TYPE', style: TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Wrap(spacing: 8, runSpacing: 8, children: HazardType.values.map((type) {
            final selected = _hazardType == type;
            return ChoiceChip(label: Text(type.name.toUpperCase()), selected: selected, selectedColor: TerraTheme.primary, onSelected: (value) {
              if (value) setState(() => _hazardType = type);
            });
          }).toList()),
          const SizedBox(height: 20),
          const Text('FIELD OBSERVATION NOTES', style: TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          TextField(controller: _description, maxLines: 4, style: const TextStyle(color: TerraTheme.textPrimary), decoration: const InputDecoration(hintText: 'Describe cracks, debris, road blockage or slope movement.')),
          const SizedBox(height: 24),
          SizedBox(width: double.infinity, height: 54, child: ElevatedButton.icon(
            onPressed: _saving ? null : _captureAndSave,
            icon: _saving ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.camera),
            label: Text(_saving ? 'SAVING LOCALLY...' : 'CAPTURE PHOTO & SAVE REPORT'),
          )),
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!, style: const TextStyle(color: TerraTheme.primary, fontWeight: FontWeight.w600)),
          ],
        ],
      ),
    );
  }
}
