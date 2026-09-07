# ============================================================
# LANDSLIDEGUARD - MODEL TRAINING
# ============================================================
#
# This script:
#
# 1. Loads processed training and testing datasets
# 2. Trains Logistic Regression
# 3. Trains Random Forest
# 4. Optionally trains XGBoost if installed
# 5. Evaluates all models
# 6. Compares model performance
# 7. Selects the best model based on ROC-AUC
# 8. Saves trained models and results
#
# Input:
#   ml/outputs/train_processed.csv
#   ml/outputs/test_processed.csv
#
# Output:
#   ml/outputs/logistic_regression_model.pkl
#   ml/outputs/random_forest_model.pkl
#   ml/outputs/xgboost_model.pkl       (if available)
#   ml/outputs/best_model.pkl
#   ml/outputs/model_comparison.csv
#   ml/outputs/training_results.csv
#   ml/outputs/feature_importance.csv
#
# ============================================================


from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    classification_report
)


# ============================================================
# OPTIONAL XGBOOST IMPORT
# ============================================================

XGBOOST_AVAILABLE = False

try:

    from xgboost import XGBClassifier

    XGBOOST_AVAILABLE = True

except ImportError:

    XGBOOST_AVAILABLE = False


# ============================================================
# SUPPRESS WARNINGS
# ============================================================

warnings.filterwarnings("ignore")


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = BASE_DIR / "outputs"

TRAIN_FILE = OUTPUT_DIR / "train_processed.csv"

TEST_FILE = OUTPUT_DIR / "test_processed.csv"


# ============================================================
# MODEL OUTPUT FILES
# ============================================================

LOGISTIC_MODEL_FILE = (
    OUTPUT_DIR /
    "logistic_regression_model.pkl"
)

RANDOM_FOREST_MODEL_FILE = (
    OUTPUT_DIR /
    "random_forest_model.pkl"
)

XGBOOST_MODEL_FILE = (
    OUTPUT_DIR /
    "xgboost_model.pkl"
)

BEST_MODEL_FILE = (
    OUTPUT_DIR /
    "best_model.pkl"
)

MODEL_COMPARISON_FILE = (
    OUTPUT_DIR /
    "model_comparison.csv"
)

TRAINING_RESULTS_FILE = (
    OUTPUT_DIR /
    "training_results.csv"
)

FEATURE_IMPORTANCE_FILE = (
    OUTPUT_DIR /
    "feature_importance.csv"
)


# ============================================================
# CONFIGURATION
# ============================================================

TARGET_COLUMN = "label"

RANDOM_STATE = 42


# ============================================================
# DISPLAY HEADER
# ============================================================

print("\n" + "=" * 70)
print("LANDSLIDEGUARD - MODEL TRAINING")
print("=" * 70)


# ============================================================
# CHECK INPUT FILES
# ============================================================

print("\nChecking processed datasets...")

if not TRAIN_FILE.exists():

    raise FileNotFoundError(
        f"\nTraining dataset not found:\n{TRAIN_FILE}"
    )

if not TEST_FILE.exists():

    raise FileNotFoundError(
        f"\nTesting dataset not found:\n{TEST_FILE}"
    )


print("\n✓ Training dataset found")
print(TRAIN_FILE)

print("\n✓ Testing dataset found")
print(TEST_FILE)


# ============================================================
# LOAD DATASETS
# ============================================================

print("\n" + "=" * 70)
print("LOADING PROCESSED DATASETS")
print("=" * 70)


train_df = pd.read_csv(TRAIN_FILE)

test_df = pd.read_csv(TEST_FILE)


print(
    f"\nTraining records: "
    f"{len(train_df):,}"
)

print(
    f"Testing records: "
    f"{len(test_df):,}"
)

print(
    f"\nTraining columns: "
    f"{len(train_df.columns)}"
)

print(
    f"Testing columns: "
    f"{len(test_df.columns)}"
)


# ============================================================
# VALIDATE TARGET COLUMN
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING TARGET COLUMN")
print("=" * 70)


if TARGET_COLUMN not in train_df.columns:

    raise ValueError(
        f"\nTarget column not found "
        f"in training dataset:\n"
        f"{TARGET_COLUMN}"
    )


if TARGET_COLUMN not in test_df.columns:

    raise ValueError(
        f"\nTarget column not found "
        f"in testing dataset:\n"
        f"{TARGET_COLUMN}"
    )


print(
    f"\n✓ Target column found: "
    f"{TARGET_COLUMN}"
)


# ============================================================
# SEPARATE FEATURES AND TARGET
# ============================================================

print("\n" + "=" * 70)
print("PREPARING FEATURES AND TARGET")
print("=" * 70)


X_train = train_df.drop(
    columns=[TARGET_COLUMN]
)

y_train = train_df[
    TARGET_COLUMN
]


X_test = test_df.drop(
    columns=[TARGET_COLUMN]
)

y_test = test_df[
    TARGET_COLUMN
]


print(
    f"\nTraining feature shape: "
    f"{X_train.shape}"
)

print(
    f"Testing feature shape: "
    f"{X_test.shape}"
)


print(
    f"\nNumber of ML features: "
    f"{X_train.shape[1]}"
)


# ============================================================
# VALIDATE FEATURE CONSISTENCY
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING FEATURE CONSISTENCY")
print("=" * 70)


if list(X_train.columns) != list(X_test.columns):

    raise ValueError(
        "\nTraining and testing feature "
        "columns do not match."
    )


print(
    "\n✓ Training and testing features match."
)


# ============================================================
# VALIDATE MISSING VALUES
# ============================================================

print("\n" + "=" * 70)
print("CHECKING MISSING VALUES")
print("=" * 70)


train_missing = (
    X_train.isnull()
    .sum()
    .sum()
)

test_missing = (
    X_test.isnull()
    .sum()
    .sum()
)


print(
    f"\nTraining missing values: "
    f"{train_missing}"
)

print(
    f"Testing missing values: "
    f"{test_missing}"
)


if train_missing > 0:

    raise ValueError(
        "\nTraining dataset contains "
        "missing values."
    )


if test_missing > 0:

    raise ValueError(
        "\nTesting dataset contains "
        "missing values."
    )


print(
    "\n✓ No missing feature values found."
)


# ============================================================
# CLASS DISTRIBUTION
# ============================================================

print("\n" + "=" * 70)
print("CLASS DISTRIBUTION")
print("=" * 70)


print("\nTraining dataset:")

print(
    y_train
    .value_counts()
    .sort_index()
)


print("\nTesting dataset:")

print(
    y_test
    .value_counts()
    .sort_index()
)


# ============================================================
# MODEL EVALUATION FUNCTION
# ============================================================

def evaluate_model(
    model_name,
    model,
    X_train,
    y_train,
    X_test,
    y_test
):

    """
    Train and evaluate a classification model.
    """

    print("\n" + "=" * 70)
    print(f"TRAINING: {model_name.upper()}")
    print("=" * 70)


    # --------------------------------------------------------
    # TRAIN MODEL
    # --------------------------------------------------------

    print("\nTraining model...")


    model.fit(
        X_train,
        y_train
    )


    print(
        "✓ Training completed."
    )


    # --------------------------------------------------------
    # PREDICTIONS
    # --------------------------------------------------------

    print(
        "\nGenerating predictions..."
    )


    train_predictions = (
        model.predict(
            X_train
        )
    )


    test_predictions = (
        model.predict(
            X_test
        )
    )


    # --------------------------------------------------------
    # PROBABILITIES
    # --------------------------------------------------------

    train_probabilities = None

    test_probabilities = None


    if hasattr(
        model,
        "predict_proba"
    ):

        train_probabilities = (
            model.predict_proba(
                X_train
            )[:, 1]
        )


        test_probabilities = (
            model.predict_proba(
                X_test
            )[:, 1]
        )


    # --------------------------------------------------------
    # TRAIN METRICS
    # --------------------------------------------------------

    train_accuracy = (
        accuracy_score(
            y_train,
            train_predictions
        )
    )


    train_precision = (
        precision_score(
            y_train,
            train_predictions,
            zero_division=0
        )
    )


    train_recall = (
        recall_score(
            y_train,
            train_predictions,
            zero_division=0
        )
    )


    train_f1 = (
        f1_score(
            y_train,
            train_predictions,
            zero_division=0
        )
    )


    train_auc = np.nan


    if train_probabilities is not None:

        train_auc = (
            roc_auc_score(
                y_train,
                train_probabilities
            )
        )


    # --------------------------------------------------------
    # TEST METRICS
    # --------------------------------------------------------

    test_accuracy = (
        accuracy_score(
            y_test,
            test_predictions
        )
    )


    test_precision = (
        precision_score(
            y_test,
            test_predictions,
            zero_division=0
        )
    )


    test_recall = (
        recall_score(
            y_test,
            test_predictions,
            zero_division=0
        )
    )


    test_f1 = (
        f1_score(
            y_test,
            test_predictions,
            zero_division=0
        )
    )


    test_auc = np.nan


    if test_probabilities is not None:

        test_auc = (
            roc_auc_score(
                y_test,
                test_probabilities
            )
        )


    # --------------------------------------------------------
    # CONFUSION MATRIX
    # --------------------------------------------------------

    cm = (
        confusion_matrix(
            y_test,
            test_predictions
        )
    )


    # --------------------------------------------------------
    # PRINT RESULTS
    # --------------------------------------------------------

    print(
        "\nTEST PERFORMANCE"
    )

    print("-" * 40)

    print(
        f"Accuracy : "
        f"{test_accuracy:.4f}"
    )

    print(
        f"Precision: "
        f"{test_precision:.4f}"
    )

    print(
        f"Recall   : "
        f"{test_recall:.4f}"
    )

    print(
        f"F1 Score : "
        f"{test_f1:.4f}"
    )

    print(
        f"ROC-AUC  : "
        f"{test_auc:.4f}"
    )


    # --------------------------------------------------------
    # PRINT CONFUSION MATRIX
    # --------------------------------------------------------

    print(
        "\nCONFUSION MATRIX"
    )

    print(
        f"\nTN: {cm[0, 0]}"
    )

    print(
        f"FP: {cm[0, 1]}"
    )

    print(
        f"FN: {cm[1, 0]}"
    )

    print(
        f"TP: {cm[1, 1]}"
    )


    # --------------------------------------------------------
    # CLASSIFICATION REPORT
    # --------------------------------------------------------

    print(
        "\nCLASSIFICATION REPORT"
    )

    print(
        classification_report(
            y_test,
            test_predictions,
            digits=4,
            zero_division=0
        )
    )


    # --------------------------------------------------------
    # RETURN RESULTS
    # --------------------------------------------------------

    results = {

        "model": model_name,

        "train_accuracy": train_accuracy,
        "train_precision": train_precision,
        "train_recall": train_recall,
        "train_f1": train_f1,
        "train_roc_auc": train_auc,

        "test_accuracy": test_accuracy,
        "test_precision": test_precision,
        "test_recall": test_recall,
        "test_f1": test_f1,
        "test_roc_auc": test_auc,

        "true_negatives": cm[0, 0],
        "false_positives": cm[0, 1],
        "false_negatives": cm[1, 0],
        "true_positives": cm[1, 1]

    }


    return (
        model,
        results
    )


# ============================================================
# STORE MODELS AND RESULTS
# ============================================================

trained_models = {}

model_results = []


# ============================================================
# LOGISTIC REGRESSION
# ============================================================

logistic_model = (
    LogisticRegression(
        max_iter=2000,
        random_state=RANDOM_STATE
    )
)


trained_model, results = evaluate_model(

    model_name="Logistic Regression",

    model=logistic_model,

    X_train=X_train,

    y_train=y_train,

    X_test=X_test,

    y_test=y_test

)


trained_models[
    "Logistic Regression"
] = trained_model


model_results.append(
    results
)


# ============================================================
# SAVE LOGISTIC REGRESSION MODEL
# ============================================================

joblib.dump(

    trained_model,

    LOGISTIC_MODEL_FILE

)


print(
    "\n✓ Logistic Regression model saved:"
)

print(
    LOGISTIC_MODEL_FILE
)


# ============================================================
# RANDOM FOREST
# ============================================================

random_forest_model = (
    RandomForestClassifier(

        n_estimators=300,

        max_depth=None,

        min_samples_split=2,

        min_samples_leaf=1,

        random_state=RANDOM_STATE,

        n_jobs=-1

    )
)


trained_model, results = evaluate_model(

    model_name="Random Forest",

    model=random_forest_model,

    X_train=X_train,

    y_train=y_train,

    X_test=X_test,

    y_test=y_test

)


trained_models[
    "Random Forest"
] = trained_model


model_results.append(
    results
)


# ============================================================
# SAVE RANDOM FOREST MODEL
# ============================================================

joblib.dump(

    trained_model,

    RANDOM_FOREST_MODEL_FILE

)


print(
    "\n✓ Random Forest model saved:"
)

print(
    RANDOM_FOREST_MODEL_FILE
)


# ============================================================
# OPTIONAL XGBOOST
# ============================================================

print("\n" + "=" * 70)
print("XGBOOST CHECK")
print("=" * 70)


if XGBOOST_AVAILABLE:


    print(
        "\n✓ XGBoost is installed."
    )


    xgboost_model = (

        XGBClassifier(

            n_estimators=300,

            learning_rate=0.05,

            max_depth=5,

            subsample=0.8,

            colsample_bytree=0.8,

            random_state=RANDOM_STATE,

            eval_metric="logloss"

        )

    )


    trained_model, results = evaluate_model(

        model_name="XGBoost",

        model=xgboost_model,

        X_train=X_train,

        y_train=y_train,

        X_test=X_test,

        y_test=y_test

    )


    trained_models[
        "XGBoost"
    ] = trained_model


    model_results.append(
        results
    )


    # --------------------------------------------------------
    # SAVE XGBOOST MODEL
    # --------------------------------------------------------

    joblib.dump(

        trained_model,

        XGBOOST_MODEL_FILE

    )


    print(
        "\n✓ XGBoost model saved:"
    )

    print(
        XGBOOST_MODEL_FILE
    )


else:


    print(
        "\n⚠ XGBoost is not installed."
    )

    print(
        "Skipping XGBoost training."
    )

    print(
        "\nTo install XGBoost:"
    )

    print(
        "pip install xgboost"
    )


# ============================================================
# MODEL COMPARISON
# ============================================================

print("\n" + "=" * 70)
print("MODEL COMPARISON")
print("=" * 70)


comparison_df = (
    pd.DataFrame(
        model_results
    )
)


comparison_df = (
    comparison_df
    .sort_values(
        by="test_roc_auc",
        ascending=False
    )
    .reset_index(
        drop=True
    )
)


comparison_df.index = (
    comparison_df.index + 1
)


print(
    "\nMODEL PERFORMANCE RESULTS"
)


print(
    comparison_df[
        [

            "model",

            "test_accuracy",

            "test_precision",

            "test_recall",

            "test_f1",

            "test_roc_auc"

        ]
    ]
    .to_string()
)


# ============================================================
# SAVE MODEL COMPARISON
# ============================================================

comparison_df.to_csv(

    MODEL_COMPARISON_FILE,

    index=False

)


print(
    "\n✓ Model comparison saved:"
)

print(
    MODEL_COMPARISON_FILE
)


# ============================================================
# SAVE TRAINING RESULTS
# ============================================================

comparison_df.to_csv(

    TRAINING_RESULTS_FILE,

    index=False

)


print(
    "\n✓ Training results saved:"
)

print(
    TRAINING_RESULTS_FILE
)


# ============================================================
# SELECT BEST MODEL
# ============================================================

print("\n" + "=" * 70)
print("SELECTING BEST MODEL")
print("=" * 70)


best_model_name = (

    comparison_df
    .iloc[0]
    ["model"]

)


best_model_score = (

    comparison_df
    .iloc[0]
    ["test_roc_auc"]

)


best_model = (

    trained_models[
        best_model_name
    ]

)


print(
    f"\nBest model: "
    f"{best_model_name}"
)


print(
    f"Best ROC-AUC: "
    f"{best_model_score:.4f}"
)


# ============================================================
# SAVE BEST MODEL
# ============================================================

joblib.dump(

    best_model,

    BEST_MODEL_FILE

)


print(
    "\n✓ Best model saved:"
)

print(
    BEST_MODEL_FILE
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

print("\n" + "=" * 70)
print("FEATURE IMPORTANCE")
print("=" * 70)


feature_importance_saved = False


# ------------------------------------------------------------
# RANDOM FOREST IMPORTANCE
# ------------------------------------------------------------

if hasattr(
    best_model,
    "feature_importances_"
):


    print(
        "\nExtracting feature importance..."
    )


    feature_importance_df = (

        pd.DataFrame({

            "feature":
            X_train.columns,

            "importance":
            best_model.feature_importances_

        })

        .sort_values(

            by="importance",

            ascending=False

        )

        .reset_index(

            drop=True

        )

    )


    print(
        "\nTOP FEATURE IMPORTANCE"
    )


    print(

        feature_importance_df
        .head(20)
        .to_string(
            index=False
        )

    )


    feature_importance_df.to_csv(

        FEATURE_IMPORTANCE_FILE,

        index=False

    )


    feature_importance_saved = True


    print(
        "\n✓ Feature importance saved:"
    )

    print(
        FEATURE_IMPORTANCE_FILE
    )


# ------------------------------------------------------------
# LOGISTIC REGRESSION COEFFICIENTS
# ------------------------------------------------------------

elif hasattr(
    best_model,
    "coef_"
):


    print(
        "\nExtracting Logistic Regression coefficients..."
    )


    feature_importance_df = (

        pd.DataFrame({

            "feature":
            X_train.columns,

            "coefficient":
            best_model.coef_[0],

            "absolute_coefficient":
            np.abs(
                best_model.coef_[0]
            )

        })

        .sort_values(

            by="absolute_coefficient",

            ascending=False

        )

        .reset_index(

            drop=True

        )

    )


    print(
        "\nTOP FEATURE COEFFICIENTS"
    )


    print(

        feature_importance_df
        .head(20)
        .to_string(
            index=False
        )

    )


    feature_importance_df.to_csv(

        FEATURE_IMPORTANCE_FILE,

        index=False

    )


    feature_importance_saved = True


    print(
        "\n✓ Feature coefficients saved:"
    )

    print(
        FEATURE_IMPORTANCE_FILE
    )


if not feature_importance_saved:

    print(
        "\n⚠ Feature importance "
        "not available for this model."
    )


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("FINAL TRAINING SUMMARY")
print("=" * 70)


print(
    f"\nTraining records: "
    f"{len(X_train):,}"
)


print(
    f"Testing records: "
    f"{len(X_test):,}"
)


print(
    f"ML features: "
    f"{X_train.shape[1]}"
)


print(
    f"\nModels trained: "
    f"{len(trained_models)}"
)


for model_name in trained_models:

    print(
        f"  - {model_name}"
    )


print(
    f"\nBest model: "
    f"{best_model_name}"
)


print(
    f"Best test ROC-AUC: "
    f"{best_model_score:.4f}"
)


print(
    "\nModel comparison:"
)

print(
    MODEL_COMPARISON_FILE
)


print(
    "\nBest model file:"
)

print(
    BEST_MODEL_FILE
)


print(
    "\nFeature importance:"
)

if feature_importance_saved:

    print(
        FEATURE_IMPORTANCE_FILE
    )

else:

    print(
        "Not generated"
    )


print("\n" + "=" * 70)
print("✓ MODEL TRAINING COMPLETED SUCCESSFULLY")
print("=" * 70)