from pathlib import Path
import json

import pandas as pd
import joblib
import matplotlib.pyplot as plt

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report,
    ConfusionMatrixDisplay,
    RocCurveDisplay
)


# ============================================================
# LANDSLIDEGUARD
# MODEL EVALUATION
# ============================================================

print("=" * 70)
print("LANDSLIDEGUARD - MODEL EVALUATION")
print("=" * 70)


# ============================================================
# PROJECT PATHS
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[1]

OUTPUT_DIR = (
    PROJECT_ROOT
    / "ml"
    / "outputs"
)

MODEL_FILE = (
    OUTPUT_DIR
    / "best_model.pkl"
)

TEST_FILE = (
    OUTPUT_DIR
    / "test_processed.csv"
)

REPORT_DIR = (
    OUTPUT_DIR
    / "reports"
)

FIGURE_DIR = (
    OUTPUT_DIR
    / "figures"
)


# ============================================================
# OUTPUT FILES
# ============================================================

METRICS_FILE = (
    REPORT_DIR
    / "evaluation_metrics.json"
)

CLASSIFICATION_REPORT_FILE = (
    REPORT_DIR
    / "classification_report.csv"
)

PREDICTIONS_FILE = (
    REPORT_DIR
    / "test_predictions.csv"
)

CONFUSION_MATRIX_FILE = (
    FIGURE_DIR
    / "confusion_matrix.png"
)

ROC_CURVE_FILE = (
    FIGURE_DIR
    / "roc_curve.png"
)


# ============================================================
# CREATE OUTPUT DIRECTORIES
# ============================================================

REPORT_DIR.mkdir(
    parents=True,
    exist_ok=True
)

FIGURE_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ============================================================
# CHECK REQUIRED FILES
# ============================================================

print("\nChecking evaluation files...")

if not MODEL_FILE.exists():

    raise FileNotFoundError(
        f"\nModel file not found:\n"
        f"{MODEL_FILE}\n\n"
        f"Run train_model.py first."
    )


if not TEST_FILE.exists():

    raise FileNotFoundError(
        f"\nProcessed test file not found:\n"
        f"{TEST_FILE}\n\n"
        f"Run feature_engineering.py first."
    )


print("[OK] Best model file found")

print("[OK] Processed test dataset found")


# ============================================================
# LOAD MODEL
# ============================================================

print("\n" + "=" * 70)
print("LOADING TRAINED MODEL")
print("=" * 70)

model = joblib.load(
    MODEL_FILE
)

print("[OK] Model loaded successfully")

print(f"\nModel type:")
print(type(model).__name__)


# ============================================================
# LOAD TEST DATA
# ============================================================

print("\n" + "=" * 70)
print("LOADING PROCESSED TEST DATA")
print("=" * 70)

test_df = pd.read_csv(
    TEST_FILE
)

print(
    f"\n[OK] Test dataset loaded: "
    f"{len(test_df):,} records"
)

print(
    f"Total columns: "
    f"{len(test_df.columns)}"
)


# ============================================================
# DISPLAY COLUMNS
# ============================================================

print("\nTest dataset columns:")

for column in test_df.columns:

    print(f"  - {column}")


# ============================================================
# TARGET VALIDATION
# ============================================================

TARGET = "label"

if TARGET not in test_df.columns:

    raise ValueError(
        f"\nTarget column '{TARGET}' "
        f"not found in test dataset."
    )


# ============================================================
# REMOVE NON-FEATURE COLUMNS
# ============================================================

NON_FEATURE_COLUMNS = [

    "label",

    "event_date",

    "sample_type",

    "event_record_id",

    "latitude",

    "longitude",

    "rainfall_temporal_coverage",

    "all_rainfall_features_available",

    "grid_distance_valid",

    "nearest_grid_latitude",

    "nearest_grid_longitude",

    "nearest_grid_distance_km",

    "matched_event_id",

    "matched_event_date",

    "matched_event_distance_km",

    "distance_to_nearest_landslide_m",

    "all_features_available"

]


# ============================================================
# DETERMINE FEATURES
# ============================================================

FEATURES = [

    column

    for column in test_df.columns

    if column not in NON_FEATURE_COLUMNS

]


print("\n" + "=" * 70)
print("EVALUATION FEATURES")
print("=" * 70)

print(
    f"\nTotal detected features: "
    f"{len(FEATURES)}"
)

for feature in FEATURES:

    print(f"  - {feature}")


# ============================================================
# PREPARE TEST DATA
# ============================================================

X_test = test_df[
    FEATURES
].copy()


y_test = test_df[
    TARGET
].copy()


# ============================================================
# CHECK FOR MISSING VALUES
# ============================================================

print("\n" + "=" * 70)
print("MISSING VALUE CHECK")
print("=" * 70)

missing_values = X_test.isnull().sum()

total_missing = int(
    missing_values.sum()
)

print(
    f"\nTotal missing feature values: "
    f"{total_missing}"
)


if total_missing > 0:

    print("\nColumns containing missing values:")

    for column, count in missing_values.items():

        if count > 0:

            print(
                f"  - {column}: "
                f"{count}"
            )

    raise ValueError(
        "\nProcessed test dataset contains "
        "missing feature values."
    )


print("[OK] No missing feature values found")


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

print("\n" + "=" * 70)
print("TEST CLASS DISTRIBUTION")
print("=" * 70)

print(
    "\n"
)

print(
    y_test
    .value_counts()
    .sort_index()
)


# ============================================================
# MODEL FEATURE VALIDATION
# ============================================================

if hasattr(
    model,
    "feature_names_in_"
):

    model_features = list(
        model.feature_names_in_
    )

    print("\n" + "=" * 70)
    print("MODEL FEATURE VALIDATION")
    print("=" * 70)

    print(
        f"\nModel expects: "
        f"{len(model_features)} features"
    )

    print(
        f"Test dataset provides: "
        f"{len(FEATURES)} features"
    )


    missing_from_test = [

        feature

        for feature in model_features

        if feature not in X_test.columns

    ]


    extra_in_test = [

        feature

        for feature in X_test.columns

        if feature not in model_features

    ]


    if missing_from_test:

        print(
            "\nMissing features required "
            "by model:"
        )

        for feature in missing_from_test:

            print(
                f"  - {feature}"
            )


    if extra_in_test:

        print(
            "\nExtra features not used "
            "by model:"
        )

        for feature in extra_in_test:

            print(
                f"  - {feature}"
            )


    if missing_from_test:

        raise ValueError(
            "\nTest dataset does not contain "
            "all features required by the model."
        )


    # Reorder features exactly as expected by model

    X_test = X_test[
        model_features
    ].copy()


    print(
        "\n[OK] Feature validation passed"
    )


# ============================================================
# GENERATE PREDICTIONS
# ============================================================

print("\n" + "=" * 70)
print("GENERATING PREDICTIONS")
print("=" * 70)


y_pred = model.predict(
    X_test
)


print(
    "\n[OK] Predictions generated successfully"
)


# ============================================================
# GENERATE PREDICTION PROBABILITIES
# ============================================================

y_prob = None


if hasattr(
    model,
    "predict_proba"
):

    print(
        "\nGenerating prediction probabilities..."
    )


    y_prob = model.predict_proba(
        X_test
    )[:, 1]


    print(
        "[OK] Prediction probabilities generated"
    )


else:

    print(
        "\n[WARN] Model does not support "
        "predict_proba()."
    )


# ============================================================
# CALCULATE METRICS
# ============================================================

print("\n" + "=" * 70)
print("MODEL PERFORMANCE METRICS")
print("=" * 70)


accuracy = accuracy_score(
    y_test,
    y_pred
)


precision = precision_score(
    y_test,
    y_pred,
    zero_division=0
)


recall = recall_score(
    y_test,
    y_pred,
    zero_division=0
)


f1 = f1_score(
    y_test,
    y_pred,
    zero_division=0
)


# ============================================================
# ROC-AUC
# ============================================================

roc_auc = None


if y_prob is not None:

    if len(
        y_test.unique()
    ) == 2:

        roc_auc = roc_auc_score(
            y_test,
            y_prob
        )


# ============================================================
# PRINT METRICS
# ============================================================

print(
    f"\nAccuracy:  "
    f"{accuracy:.4f}"
)

print(
    f"Precision: "
    f"{precision:.4f}"
)

print(
    f"Recall:    "
    f"{recall:.4f}"
)

print(
    f"F1 Score:  "
    f"{f1:.4f}"
)


if roc_auc is not None:

    print(
        f"ROC-AUC:   "
        f"{roc_auc:.4f}"
    )


else:

    print(
        "ROC-AUC:   Not available"
    )


# ============================================================
# CONFUSION MATRIX
# ============================================================

print("\n" + "=" * 70)
print("CONFUSION MATRIX")
print("=" * 70)


cm = confusion_matrix(
    y_test,
    y_pred
)


print(
    "\n"
)

print(cm)


# ============================================================
# EXTRACT CONFUSION MATRIX VALUES
# ============================================================

true_negatives = int(
    cm[0][0]
)

false_positives = int(
    cm[0][1]
)

false_negatives = int(
    cm[1][0]
)

true_positives = int(
    cm[1][1]
)


print(
    f"\nTrue Negatives:  "
    f"{true_negatives}"
)

print(
    f"False Positives: "
    f"{false_positives}"
)

print(
    f"False Negatives: "
    f"{false_negatives}"
)

print(
    f"True Positives:  "
    f"{true_positives}"
)


# ============================================================
# SAVE CONFUSION MATRIX FIGURE
# ============================================================

print("\nSaving confusion matrix...")


display = ConfusionMatrixDisplay(
    confusion_matrix=cm,
    display_labels=[
        "Background",
        "Landslide"
    ]
)


fig, ax = plt.subplots(
    figsize=(7, 6)
)


display.plot(
    ax=ax
)


plt.title(
    "LandslideGuard Confusion Matrix"
)


plt.tight_layout()


plt.savefig(
    CONFUSION_MATRIX_FILE,
    dpi=300
)


plt.close()


print(
    "[OK] Confusion matrix saved"
)

print(
    CONFUSION_MATRIX_FILE
)


# ============================================================
# ROC CURVE
# ============================================================

if y_prob is not None:

    print("\nSaving ROC curve...")


    fig, ax = plt.subplots(
        figsize=(7, 6)
    )


    RocCurveDisplay.from_predictions(
        y_test,
        y_prob,
        ax=ax
    )


    plt.title(
        "LandslideGuard ROC Curve"
    )


    plt.tight_layout()


    plt.savefig(
        ROC_CURVE_FILE,
        dpi=300
    )


    plt.close()


    print(
        "[OK] ROC curve saved"
    )

    print(
        ROC_CURVE_FILE
    )


# ============================================================
# CLASSIFICATION REPORT
# ============================================================

print("\n" + "=" * 70)
print("CLASSIFICATION REPORT")
print("=" * 70)


report_dict = classification_report(
    y_test,
    y_pred,
    target_names=[
        "Background",
        "Landslide"
    ],
    output_dict=True,
    zero_division=0
)


report_df = pd.DataFrame(
    report_dict
).transpose()


print(
    "\n"
)

print(
    report_df
)


# ============================================================
# SAVE CLASSIFICATION REPORT
# ============================================================

report_df.to_csv(
    CLASSIFICATION_REPORT_FILE
)


print(
    "\n[OK] Classification report saved"
)

print(
    CLASSIFICATION_REPORT_FILE
)


# ============================================================
# SAVE METRICS
# ============================================================

print("\nSaving evaluation metrics...")


metrics = {

    "test_records":
        int(len(y_test)),

    "accuracy":
        float(accuracy),

    "precision":
        float(precision),

    "recall":
        float(recall),

    "f1_score":
        float(f1),

    "roc_auc":

        float(roc_auc)

        if roc_auc is not None

        else None,

    "true_negatives":
        true_negatives,

    "false_positives":
        false_positives,

    "false_negatives":
        false_negatives,

    "true_positives":
        true_positives

}


with open(
    METRICS_FILE,
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        metrics,
        file,
        indent=4
    )


print(
    "[OK] Metrics saved"
)

print(
    METRICS_FILE
)


# ============================================================
# SAVE TEST PREDICTIONS
# ============================================================

print("\nSaving predictions...")


prediction_df = test_df.copy()


prediction_df[
    "predicted_label"
] = y_pred


if y_prob is not None:

    prediction_df[
        "landslide_probability"
    ] = y_prob


prediction_df.to_csv(
    PREDICTIONS_FILE,
    index=False
)


print(
    "[OK] Test predictions saved"
)

print(
    PREDICTIONS_FILE
)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("[OK] MODEL EVALUATION COMPLETED SUCCESSFULLY")
print("=" * 70)


print(
    f"\nTest records: "
    f"{len(y_test):,}"
)


print(
    f"\nAccuracy:  "
    f"{accuracy:.4f}"
)

print(
    f"Precision: "
    f"{precision:.4f}"
)

print(
    f"Recall:    "
    f"{recall:.4f}"
)

print(
    f"F1 Score:  "
    f"{f1:.4f}"
)


if roc_auc is not None:

    print(
        f"ROC-AUC:   "
        f"{roc_auc:.4f}"
    )


print(
    "\nOutput files:"
)


print(
    f"\nMetrics:\n"
    f"{METRICS_FILE}"
)


print(
    f"\nClassification report:\n"
    f"{CLASSIFICATION_REPORT_FILE}"
)


print(
    f"\nPredictions:\n"
    f"{PREDICTIONS_FILE}"
)


print(
    f"\nConfusion matrix:\n"
    f"{CONFUSION_MATRIX_FILE}"
)


if y_prob is not None:

    print(
        f"\nROC curve:\n"
        f"{ROC_CURVE_FILE}"
    )


print("\n" + "=" * 70)