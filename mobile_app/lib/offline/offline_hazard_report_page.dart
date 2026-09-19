import 'package:flutter/material.dart';

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
    setState(() { _saving = true; _message = null; });
    try {
      final captured = await widget.captureService.capture(
        hazardType: _hazardType,
        description: _description.text.trim().isEmpty ? null : _description.text.trim(),
      );
      if (!mounted) return;
      setState(() => _message = captured == null ? 'Capture cancelled.' : 'Saved locally. It will sync automatically.');
      if (captured != null) widget.onSaved?.call();
    } catch (error) {
      if (mounted) setState(() => _message = error.toString().replaceFirst('Bad state: ', ''));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Report Hazard')),
        body: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const Text('Capture field evidence', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text('Photo, GPS coordinates, timestamp, and report are saved on this device first.'),
            const SizedBox(height: 24),
            DropdownButtonFormField<HazardType>(
              initialValue: _hazardType,
              decoration: const InputDecoration(labelText: 'Hazard type', border: OutlineInputBorder()),
              items: HazardType.values.map((type) => DropdownMenuItem(value: type, child: Text(type.name))).toList(),
              onChanged: (value) => setState(() => _hazardType = value ?? HazardType.other),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _description,
              maxLines: 4,
              decoration: const InputDecoration(labelText: 'Description', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: _saving ? null : _captureAndSave,
              icon: _saving ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.camera_alt),
              label: Text(_saving ? 'Saving report…' : 'Take photo and save report'),
            ),
            if (_message != null) ...[const SizedBox(height: 16), Text(_message!)],
          ],
        ),
      );
}
