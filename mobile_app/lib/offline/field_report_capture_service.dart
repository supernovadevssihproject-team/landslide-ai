import 'dart:async';

import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:uuid/uuid.dart';

import 'offline_hazard_report.dart';
import 'offline_sync_manager.dart';

class CapturedHazard {
  final OfflineHazardReport report;
  final XFile? image;
  const CapturedHazard({required this.report, this.image});
}

class FieldReportCaptureService {
  final ImagePicker _picker;
  final OfflineSyncManager syncManager;
  final Uuid _uuid;

  FieldReportCaptureService({required this.syncManager, ImagePicker? picker, Uuid? uuid})
      : _picker = picker ?? ImagePicker(), _uuid = uuid ?? const Uuid();

  Future<CapturedHazard?> capture({required HazardType hazardType, String? description, bool useCamera = true}) async {
    if (!await Permission.camera.request().isGranted) {
      throw StateError('Camera permission is required to capture hazard evidence.');
    }
    final image = await _picker.pickImage(
      source: useCamera ? ImageSource.camera : ImageSource.gallery,
      imageQuality: 85,
      maxWidth: 2048,
    );
    if (image == null) return null;
    final position = await _currentPosition();
    final report = OfflineHazardReport(
      reportId: _uuid.v4(),
      hazardType: hazardType,
      description: description,
      imagePath: image.path,
      latitude: position.latitude,
      longitude: position.longitude,
      capturedAt: DateTime.now().toUtc(),
      deviceId: _uuid.v4(),
    );
    await syncManager.store.save(report);
    unawaited(syncManager.syncPending());
    return CapturedHazard(report: report, image: image);
  }

  Future<Position> _currentPosition() async {
    if (!await Geolocator.isLocationServiceEnabled()) {
      throw StateError('Location services must be enabled to submit a hazard report.');
    }
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      throw StateError('Location permission is required to submit a hazard report.');
    }
    return Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
  }
}
