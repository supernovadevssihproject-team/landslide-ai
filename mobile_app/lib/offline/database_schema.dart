"""
LandslideGuard mobile database migration plan.

Version 4 adds operational caches and report provenance/classification columns.
Images are stored as local files; SQLite stores image_path, so the database is
small and offline-safe. The backend remains authoritative for zones and risk.
"""
