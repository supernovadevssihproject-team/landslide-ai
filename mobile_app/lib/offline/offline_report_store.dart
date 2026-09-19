import 'package:path/path.dart' as path;
import 'package:sqflite/sqflite.dart';

import 'offline_hazard_report.dart';

class OfflineReportStore {
  Database? _database;

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await openDatabase(
      path.join(await getDatabasesPath(), 'terraguard_offline.db'),
      version: 1,
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
          status TEXT NOT NULL,
          retry_count INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        )''');
        await db.execute('CREATE INDEX idx_hazard_reports_status ON hazard_reports(status)');
      },
    );
    return _database!;
  }

  Future<void> save(OfflineHazardReport report) async => (await database).insert(
        'hazard_reports', report.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);

  Future<List<OfflineHazardReport>> pending() async {
    final rows = await (await database).query(
      'hazard_reports',
      where: 'status IN (?, ?, ?)',
      whereArgs: [ReportSyncStatus.pendingSync.name, ReportSyncStatus.syncFailed.name, ReportSyncStatus.draft.name],
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

  Future<int> pendingCount() async => (await pending()).length;
}
