# TerraGuard field-image classifier artifacts

This field-image classifier is separate from TerraGuard's location-risk model.

## Model card

- Model version: v2
- Architecture: YOLO-classification-style ONNX contract for CPU inference
- Dataset names: NOT TRAINED
- Dataset URLs: NOT TRAINED
- Licenses: NOT TRAINED
- Class mapping: landslide, rockfall, roadBlockage, slopeFailure, flood, other
- Image counts: NOT TRAINED
- Train/val/test split: NOT TRAINED
- Training configuration: NOT TRAINED
- Evaluation metrics: NOT MEASURED
- Model size: NOT MEASURED
- Runtime: ONNX Runtime CPU
- Confidence threshold: 0.55
- Known limitations: no verified external field-image dataset has been attached in this repository snapshot; therefore no trained ONNX artifact is committed here yet.

## Deployment status

- ONNX model file: backend/ml/artifacts/field_report_classifier_v2.onnx
- Model config file: backend/ml/artifacts/field_report_classifier_v2.json
- Runtime: onnxruntime

If the ONNX artifact is absent or fails to load, the API must return: `classification unavailable/error`.
