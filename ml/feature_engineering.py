# ============================================================
# LANDSLIDEGUARD - FEATURE ENGINEERING
# ============================================================
#
# This script:
# 1. Loads train.csv and test.csv
# 2. Separates features and target
# 3. Encodes categorical features:
#       - soil_id
#       - landcover_class
# 4. Scales numeric features
# 5. Saves the fitted preprocessing pipeline
# 6. Saves processed training and testing datasets
#
# Input:
#   ml/outputs/train.csv
#   ml/outputs/test.csv
#
# Output:
#   ml/outputs/train_processed.csv
#   ml/outputs/test_processed.csv
#   ml/outputs/preprocessing_pipeline.pkl
#
# ============================================================

from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler


# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

OUTPUT_DIR = BASE_DIR / "outputs"

TRAIN_FILE = OUTPUT_DIR / "train.csv"
TEST_FILE = OUTPUT_DIR / "test.csv"

PROCESSED_TRAIN_FILE = OUTPUT_DIR / "train_processed.csv"
PROCESSED_TEST_FILE = OUTPUT_DIR / "test_processed.csv"

PIPELINE_FILE = OUTPUT_DIR / "preprocessing_pipeline.pkl"


# ============================================================
# CONFIGURATION
# ============================================================

TARGET_COLUMN = "label"

CATEGORICAL_FEATURES = [
    "soil_id",
    "landcover_class"
]

NUMERIC_FEATURES = [
    "elevation",
    "slope",
    "aspect",
    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d"
]


# ============================================================
# DISPLAY HEADER
# ============================================================

print("\n" + "=" * 70)
print("LANDSLIDEGUARD - FEATURE ENGINEERING")
print("=" * 70)


# ============================================================
# CHECK INPUT FILES
# ============================================================

print("\nChecking input files...")

if not TRAIN_FILE.exists():
    raise FileNotFoundError(
        f"\nTraining dataset not found:\n{TRAIN_FILE}"
    )

if not TEST_FILE.exists():
    raise FileNotFoundError(
        f"\nTesting dataset not found:\n{TEST_FILE}"
    )

print("[OK] Training dataset found")
print(f"  {TRAIN_FILE}")

print("\n[OK] Testing dataset found")
print(f"  {TEST_FILE}")


# ============================================================
# LOAD DATASETS
# ============================================================

print("\n" + "=" * 70)
print("LOADING TRAINING AND TESTING DATASETS")
print("=" * 70)

train_df = pd.read_csv(TRAIN_FILE)
test_df = pd.read_csv(TEST_FILE)

print(f"\nTraining records: {len(train_df):,}")
print(f"Testing records: {len(test_df):,}")

print(f"\nTraining columns: {len(train_df.columns)}")
print(f"Testing columns: {len(test_df.columns)}")


# ============================================================
# VALIDATE REQUIRED COLUMNS
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING REQUIRED FEATURES")
print("=" * 70)

required_columns = (
    NUMERIC_FEATURES
    + CATEGORICAL_FEATURES
    + [TARGET_COLUMN]
)

missing_train = [
    col for col in required_columns
    if col not in train_df.columns
]

missing_test = [
    col for col in required_columns
    if col not in test_df.columns
]

if missing_train:

    raise ValueError(
        "\nMissing required columns in training dataset:\n"
        + "\n".join(
            f"  - {col}"
            for col in missing_train
        )
    )

if missing_test:

    raise ValueError(
        "\nMissing required columns in testing dataset:\n"
        + "\n".join(
            f"  - {col}"
            for col in missing_test
        )
    )

print("\n[OK] All required columns found.")

print("\nNumeric features:")

for feature in NUMERIC_FEATURES:
    print(f"  - {feature}")

print("\nCategorical features:")

for feature in CATEGORICAL_FEATURES:
    print(f"  - {feature}")

print("\nTarget feature:")
print(f"  - {TARGET_COLUMN}")


# ============================================================
# SELECT ML FEATURES
# ============================================================

print("\n" + "=" * 70)
print("SELECTING MACHINE LEARNING FEATURES")
print("=" * 70)

FEATURE_COLUMNS = (
    NUMERIC_FEATURES
    + CATEGORICAL_FEATURES
)

X_train = train_df[FEATURE_COLUMNS].copy()
X_test = test_df[FEATURE_COLUMNS].copy()

y_train = train_df[TARGET_COLUMN].copy()
y_test = test_df[TARGET_COLUMN].copy()

print(f"\nTraining feature shape: {X_train.shape}")
print(f"Testing feature shape: {X_test.shape}")

print(f"\nTraining target shape: {y_train.shape}")
print(f"Testing target shape: {y_test.shape}")


# ============================================================
# CHECK TARGET LABELS
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING TARGET LABELS")
print("=" * 70)

train_labels = sorted(y_train.dropna().unique())
test_labels = sorted(y_test.dropna().unique())

print(f"\nTraining labels: {train_labels}")
print(f"Testing labels: {test_labels}")

valid_labels = {0, 1}

if not set(train_labels).issubset(valid_labels):

    raise ValueError(
        "\nInvalid labels found in training dataset.\n"
        f"Expected only: {valid_labels}\n"
        f"Found: {train_labels}"
    )

if not set(test_labels).issubset(valid_labels):

    raise ValueError(
        "\nInvalid labels found in testing dataset.\n"
        f"Expected only: {valid_labels}\n"
        f"Found: {test_labels}"
    )

print("\n[OK] Label validation passed.")


# ============================================================
# MISSING VALUE CHECK
# ============================================================

print("\n" + "=" * 70)
print("CHECKING MISSING VALUES")
print("=" * 70)

print("\nTraining dataset:")

train_missing = X_train.isnull().sum()

for column, count in train_missing.items():

    print(
        f"{column:25}: "
        f"{count} missing"
    )


print("\nTesting dataset:")

test_missing = X_test.isnull().sum()

for column, count in test_missing.items():

    print(
        f"{column:25}: "
        f"{count} missing"
    )


total_train_missing = train_missing.sum()
total_test_missing = test_missing.sum()

if total_train_missing > 0:

    raise ValueError(
        f"\nTraining dataset contains "
        f"{total_train_missing} missing feature values."
    )

if total_test_missing > 0:

    raise ValueError(
        f"\nTesting dataset contains "
        f"{total_test_missing} missing feature values."
    )

print("\n[OK] No missing values found.")


# ============================================================
# ENSURE NUMERIC COLUMNS ARE NUMERIC
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING NUMERIC FEATURES")
print("=" * 70)

for column in NUMERIC_FEATURES:

    X_train[column] = pd.to_numeric(
        X_train[column],
        errors="coerce"
    )

    X_test[column] = pd.to_numeric(
        X_test[column],
        errors="coerce"
    )

    train_invalid = X_train[column].isna().sum()
    test_invalid = X_test[column].isna().sum()

    print(
        f"{column:25}: "
        f"train invalid = {train_invalid}, "
        f"test invalid = {test_invalid}"
    )

    if train_invalid > 0 or test_invalid > 0:

        raise ValueError(
            f"\nInvalid numeric values found "
            f"in feature: {column}"
        )

print("\n[OK] Numeric feature validation passed.")


# ============================================================
# PREPARE CATEGORICAL FEATURES
# ============================================================

print("\n" + "=" * 70)
print("PREPARING CATEGORICAL FEATURES")
print("=" * 70)

for column in CATEGORICAL_FEATURES:

    X_train[column] = X_train[column].astype(str)

    X_test[column] = X_test[column].astype(str)

    print(
        f"\n{column}:"
    )

    print(
        f"  Training unique values: "
        f"{X_train[column].nunique()}"
    )

    print(
        f"  Testing unique values: "
        f"{X_test[column].nunique()}"
    )


# ============================================================
# CREATE PREPROCESSING PIPELINE
# ============================================================

print("\n" + "=" * 70)
print("CREATING PREPROCESSING PIPELINE")
print("=" * 70)

numeric_transformer = StandardScaler()

categorical_transformer = OneHotEncoder(
    handle_unknown="ignore",
    sparse_output=False
)

preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_transformer,
            NUMERIC_FEATURES
        ),
        (
            "categorical",
            categorical_transformer,
            CATEGORICAL_FEATURES
        )
    ],
    remainder="drop"
)

print("\n[OK] Numeric features will be standardized.")
print("[OK] Categorical features will be one-hot encoded.")


# ============================================================
# FIT PIPELINE ON TRAINING DATA
# ============================================================

print("\n" + "=" * 70)
print("FITTING PREPROCESSING PIPELINE")
print("=" * 70)

print("\nFitting pipeline using training data...")

X_train_processed = preprocessor.fit_transform(
    X_train
)

print("[OK] Training preprocessing complete.")

print("\nTransforming testing data...")

X_test_processed = preprocessor.transform(
    X_test
)

print("[OK] Testing preprocessing complete.")


# ============================================================
# GET PROCESSED FEATURE NAMES
# ============================================================

print("\n" + "=" * 70)
print("GENERATING PROCESSED FEATURE NAMES")
print("=" * 70)

processed_feature_names = (
    preprocessor.get_feature_names_out()
)

print(
    f"\nTotal processed features: "
    f"{len(processed_feature_names)}"
)

print("\nProcessed feature names:")

for feature in processed_feature_names:

    print(f"  - {feature}")


# ============================================================
# CREATE PROCESSED DATAFRAMES
# ============================================================

print("\n" + "=" * 70)
print("CREATING PROCESSED DATASETS")
print("=" * 70)

train_processed_df = pd.DataFrame(
    X_train_processed,
    columns=processed_feature_names
)

test_processed_df = pd.DataFrame(
    X_test_processed,
    columns=processed_feature_names
)


# ============================================================
# ADD TARGET COLUMN
# ============================================================

train_processed_df[TARGET_COLUMN] = (
    y_train.reset_index(drop=True)
)

test_processed_df[TARGET_COLUMN] = (
    y_test.reset_index(drop=True)
)

print("\n[OK] Target labels added.")


# ============================================================
# VALIDATE PROCESSED DATASETS
# ============================================================

print("\n" + "=" * 70)
print("VALIDATING PROCESSED DATASETS")
print("=" * 70)

print(
    f"\nProcessed training shape: "
    f"{train_processed_df.shape}"
)

print(
    f"Processed testing shape: "
    f"{test_processed_df.shape}"
)


# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

train_processed_missing = (
    train_processed_df.isnull().sum().sum()
)

test_processed_missing = (
    test_processed_df.isnull().sum().sum()
)

print(
    f"\nTraining missing values: "
    f"{train_processed_missing}"
)

print(
    f"Testing missing values: "
    f"{test_processed_missing}"
)

if train_processed_missing > 0:

    raise ValueError(
        "\nProcessed training dataset "
        "contains missing values."
    )

if test_processed_missing > 0:

    raise ValueError(
        "\nProcessed testing dataset "
        "contains missing values."
    )


# ------------------------------------------------------------
# Infinite values
# ------------------------------------------------------------

train_infinite = np.isinf(
    train_processed_df.drop(
        columns=[TARGET_COLUMN]
    ).to_numpy()
).sum()

test_infinite = np.isinf(
    test_processed_df.drop(
        columns=[TARGET_COLUMN]
    ).to_numpy()
).sum()

print(
    f"\nTraining infinite values: "
    f"{train_infinite}"
)

print(
    f"Testing infinite values: "
    f"{test_infinite}"
)

if train_infinite > 0:

    raise ValueError(
        "\nProcessed training dataset "
        "contains infinite values."
    )

if test_infinite > 0:

    raise ValueError(
        "\nProcessed testing dataset "
        "contains infinite values."
    )


# ------------------------------------------------------------
# Feature consistency
# ------------------------------------------------------------

train_features = list(
    train_processed_df.drop(
        columns=[TARGET_COLUMN]
    ).columns
)

test_features = list(
    test_processed_df.drop(
        columns=[TARGET_COLUMN]
    ).columns
)

if train_features != test_features:

    raise ValueError(
        "\nTraining and testing feature columns "
        "do not match."
    )

print("\n[OK] Processed feature columns match.")


# ============================================================
# SAVE PREPROCESSING PIPELINE
# ============================================================

print("\n" + "=" * 70)
print("SAVING PREPROCESSING PIPELINE")
print("=" * 70)

joblib.dump(
    preprocessor,
    PIPELINE_FILE
)

print(
    "\n[OK] Preprocessing pipeline saved:"
)

print(
    f"{PIPELINE_FILE}"
)


# ============================================================
# SAVE PROCESSED DATASETS
# ============================================================

print("\n" + "=" * 70)
print("SAVING PROCESSED DATASETS")
print("=" * 70)

train_processed_df.to_csv(
    PROCESSED_TRAIN_FILE,
    index=False
)

test_processed_df.to_csv(
    PROCESSED_TEST_FILE,
    index=False
)

print("\n[OK] Processed training dataset saved:")
print(PROCESSED_TRAIN_FILE)

print("\n[OK] Processed testing dataset saved:")
print(PROCESSED_TEST_FILE)


# ============================================================
# FINAL CLASS DISTRIBUTION
# ============================================================

print("\n" + "=" * 70)
print("CLASS DISTRIBUTION")
print("=" * 70)

print("\nTraining dataset:")

print(
    train_processed_df[
        TARGET_COLUMN
    ].value_counts().sort_index()
)

print("\nTesting dataset:")

print(
    test_processed_df[
        TARGET_COLUMN
    ].value_counts().sort_index()
)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("FEATURE ENGINEERING SUMMARY")
print("=" * 70)

print(
    f"\nTraining records: "
    f"{len(train_processed_df):,}"
)

print(
    f"Testing records: "
    f"{len(test_processed_df):,}"
)

print(
    f"Original ML features: "
    f"{len(FEATURE_COLUMNS)}"
)

print(
    f"Numeric features: "
    f"{len(NUMERIC_FEATURES)}"
)

print(
    f"Categorical features: "
    f"{len(CATEGORICAL_FEATURES)}"
)

print(
    f"Processed ML features: "
    f"{len(processed_feature_names)}"
)

print(
    f"\nProcessed training output:"
)

print(
    PROCESSED_TRAIN_FILE
)

print(
    f"\nProcessed testing output:"
)

print(
    PROCESSED_TEST_FILE
)

print(
    f"\nPreprocessing pipeline:"
)

print(
    PIPELINE_FILE
)

print("\n" + "=" * 70)
print("[OK] FEATURE ENGINEERING COMPLETED SUCCESSFULLY")
print("=" * 70)