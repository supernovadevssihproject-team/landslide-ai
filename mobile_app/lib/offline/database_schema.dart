// LandslideGuard mobile database migration plan.
//
// Version 5 stores operational caches and report provenance/classification
// columns. Images remain local files; SQLite stores image_path and metadata.
// The backend remains authoritative for live zones and risk.
