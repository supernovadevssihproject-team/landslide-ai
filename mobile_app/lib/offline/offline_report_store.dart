import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';

import 'offline_hazard_report.dart';

/// Single local database for reports and offline operational caches.
/// Images remain in the filesystem; SQLite stores their paths and metadata.
class OfflineReportStore {
  Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await openDatabase(
      path.join(await getDatabasesPath(), 'terraguard_offline.db'),
      version: 5,
      onCreate: (db, _) async {
        await db.execute('''CREATE TABLE hazard_reports (
          report_id TEXT PRIMARY KEY,
          hazard_type TEXT NOT NULL,
          description TEXT,
          image_path TEXT,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          captured_at TEXT NOT NULL,
          device_id TEXT NOT NULL,
          state TEXT,
          zone_id TEXT,
          location_source TEXT NOT NULL DEFAULT 'GPS',
          status TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          backend_response TEXT,
          classification_result TEXT,
          predicted_class TEXT,
          classification_confidence REAL,
          classification_severity TEXT,
          classifier_model_version TEXT,
          classified_at TEXT,
          lifecycle_status TEXT,
          confidence REAL,
          alert_status TEXT,
          sms_status TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )''');
        await _createCacheTables(db);
        await _createIndexes(db);
      },
      onUpgrade: (db, oldVersion, _) async {
        if (oldVersion < 2) {
          await _addColumn(db, 'backend_response', 'TEXT');
          await _addColumn(db, 'classification_result', 'TEXT');
        }
        if (oldVersion < 3) {
          await _addColumn(db, 'lifecycle_status', 'TEXT');
          await _addColumn(db, 'confidence', 'REAL');
          await _addColumn(db, 'alert_status', 'TEXT');
          await _addColumn(db, 'sms_status', 'TEXT');
        }
        if (oldVersion < 4) {
          await _addColumn(db, 'state', 'TEXT');
          await _addColumn(db, 'zone_id', 'TEXT');
          await _addColumn(db, 'location_source', "TEXT NOT NULL DEFAULT 'GPS'");
          await _addColumn(db, 'predicted_class', 'TEXT');
          await _addColumn(db, 'classification_confidence', 'REAL');
          await _addColumn(db, 'classification_severity', 'TEXT');
          await _addColumn(db, 'classifier_model_version', 'TEXT');
          await _addColumn(db, 'classified_at', 'TEXT');
          await _addColumn(db, 'created_at', "TEXT NOT NULL DEFAULT ''");
          await _addColumn(db, 'updated_at', "TEXT NOT NULL DEFAULT ''");
          await db.execute("UPDATE hazard_reports SET created_at = captured_at WHERE created_at = ''");
          await db.execute("UPDATE hazard_reports SET updated_at = captured_at WHERE updated_at = ''");
        }
        if (oldVersion < 5) await _createCacheTables(db);
        await _createIndexes(db);
      },
    );
    return _database!;
  }

  static Future<void> _addColumn(Database db, String name, String definition) async {
    try {
      await db.execute('ALTER TABLE hazard_reports ADD COLUMN $name $definition');
    } on DatabaseException catch (error) {
      if (!error.toString().toLowerCase().contains('duplicate column')) rethrow;
    }
  }

  static Future<void> _createCacheTables(Database db) async {
    await db.execute('''CREATE TABLE IF NOT EXISTS risk_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )''');
    await db.execute('''CREATE TABLE IF NOT EXISTS shelter_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )''');
  }

  static Future<void> _createIndexes(Database db) async {
    await db.execute('CREATE INDEX IF NOT EXISTS idx_hazard_reports_status ON hazard_reports(status)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_hazard_reports_zone ON hazard_reports(zone_id)');
    await db.execute('CREATE INDEX IF NOT EXISTS idx_hazard_reports_created ON hazard_reports(created_at)');
  }

  Future<void> save(OfflineHazardReport report) async => (await database).insert(
        'hazard_reports', report.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<List<OfflineHazardReport>> pending() async {
    final rows = await (await database).query(
      'hazard_reports',
      where: 'status IN (?, ?, ?, ?, ?)',
      whereArgs: [
        ReportSyncStatus.pendingSync.name,
        ReportSyncStatus.syncFailed.name,
        ReportSyncStatus.draft.name,
        ReportSyncStatus.syncing.name,
        ReportSyncStatus.uploading.name,
      ],
      orderBy: 'captured_at ASC',
    );
    return rows.map((row) => OfflineHazardReport.fromMap(row)).toList();
  }

  Future<List<OfflineHazardReport>> all() async {
    final rows = await (await database).query('hazard_reports', orderBy: 'captured_at DESC');
    return rows.map((row) => OfflineHazardReport.fromMap(row)).toList();
  }

  Future<void> update(OfflineHazardReport report) async => (await database).update(
        'hazard_reports', report.toMap(), where: 'report_id = ?', whereArgs: [report.reportId]);

  Future<void> saveRiskCache(String key, String payload) async {
    await (await database).insert(
      'risk_cache',
      {'cache_key': key, 'payload': payload, 'updated_at': DateTime.now().toUtc().toIso8601String()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> riskCache(String key) async {
    final rows = await (await database).query('risk_cache', where: 'cache_key = ?', whereArgs: [key], limit: 1);
    return rows.firstOrNull?['payload'] as String?;
  }

  Future<void> saveShelterCache(String key, String payload) async {
    await (await database).insert(
      'shelter_cache',
      {'cache_key': key, 'payload': payload, 'updated_at': DateTime.now().toUtc().toIso8601String()},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<String?> shelterCache(String key) async {
    final rows = await (await database).query('shelter_cache', where: 'cache_key = ?', whereArgs: [key], limit: 1);
    return rows.firstOrNull?['payload'] as String?;
  }

  Future<int> pendingCount() async => (await pending()).length;
}
