import 'package:flutter/material.dart';
import '../operational_risk_api.dart';
import '../theme/app_theme.dart';

class OperationalAreaCard extends StatelessWidget {
  final String selectedState;
  final OperationalZone? selectedZone;
  final List<OperationalZone> zones;
  final List<OperationalState> states;
  final bool locationsLoading;
  final ValueChanged<String> onStateChanged;
  final ValueChanged<OperationalZone?> onZoneChanged;

  const OperationalAreaCard({
    super.key,
    required this.selectedState,
    required this.selectedZone,
    required this.zones,
    required this.states,
    required this.locationsLoading,
    required this.onStateChanged,
    required this.onZoneChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: TerraTheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: TerraTheme.border, width: 1),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.location_on_outlined, color: TerraTheme.secondary, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'OPERATIONAL AREA',
                  style: TextStyle(
                    color: TerraTheme.secondary,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const Spacer(),
                if (locationsLoading)
                  const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: TerraTheme.secondary),
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // Region / State Selector Dropdown
            DropdownButtonFormField<String>(
              initialValue: selectedState,
              decoration: InputDecoration(
                labelText: 'STATE / REGION',
                labelStyle: const TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                filled: true,
                fillColor: TerraTheme.background,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.border)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.border)),
                focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.secondary)),
              ),
              dropdownColor: TerraTheme.surfaceElevated,
              style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
              items: states
                  .map((state) => DropdownMenuItem(
                        value: state.key,
                        child: Text(state.label),
                      ))
                  .toList(),
              onChanged: locationsLoading
                  ? null
                  : (state) {
                      if (state != null) onStateChanged(state);
                    },
            ),

            const SizedBox(height: 12),

            // Location Selector Dropdown
            if (zones.isEmpty && !locationsLoading)
              const Padding(
                padding: EdgeInsets.only(top: 4, left: 4),
                child: Text(
                  'No operational locations available for this sector.',
                  style: TextStyle(color: TerraTheme.textMuted, fontSize: 12),
                ),
              )
            else
              DropdownButtonFormField<OperationalZone>(
                initialValue: selectedZone,
                decoration: InputDecoration(
                  labelText: 'SPECIFIC MONITORING LOCATION',
                  labelStyle: const TextStyle(color: TerraTheme.textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                  helperText: 'Dynamic location telemetry feeds from backend',
                  helperStyle: const TextStyle(color: TerraTheme.textMuted, fontSize: 10),
                  filled: true,
                  fillColor: TerraTheme.background,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.border)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: TerraTheme.primary)),
                ),
                dropdownColor: TerraTheme.surfaceElevated,
                style: const TextStyle(color: TerraTheme.textPrimary, fontSize: 14, fontWeight: FontWeight.w600),
                items: zones
                    .map((zone) => DropdownMenuItem(
                          value: zone,
                          child: Text(zone.name, overflow: TextOverflow.ellipsis),
                        ))
                    .toList(),
                onChanged: locationsLoading ? null : onZoneChanged,
              ),

            if (selectedZone != null) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (selectedZone!.elevation != null)
                    _InfoChip(label: 'ELEVATION', value: '${selectedZone!.elevation!.toStringAsFixed(0)} m'),
                  if (selectedZone!.slope != null)
                    _InfoChip(label: 'SLOPE', value: '${selectedZone!.slope!.toStringAsFixed(1)}°'),
                  _InfoChip(label: 'SECTOR ID', value: selectedZone!.id.toUpperCase()),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final String value;

  const _InfoChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: TerraTheme.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: TerraTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('$label: ', style: const TextStyle(color: TerraTheme.textMuted, fontSize: 10, fontWeight: FontWeight.bold)),
          Text(value, style: const TextStyle(color: TerraTheme.secondary, fontSize: 11, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
