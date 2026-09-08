# ============================================================
# LANDSLIDEGUARD - DATASET PREPARATION
# ============================================================
#
# Input:
# NER_Landslide_Rainfall_ML_Dataset_654.csv
#
# Tasks:
# 1. Load the balanced rainfall ML dataset
# 2. Validate required columns
# 3. Validate class labels
# 4. Check missing values
# 5. Remove duplicate rows
# 6. Prepare ML feature dataset
# 7. Split into training and testing datasets
# 8. Save outputs under ml/outputs
#
# ============================================================

import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split


# ============================================================
# CONFIGURATION
# ============================================================

print("=" * 70)
print("LANDSLIDEGUARD - DATASET PREPARATION")
print("=" * 70)


# Project root:
# LandslideGuard/
# ??? data/
# ??? ml/
#     ??? prepare_dataset.py
#     ??? outputs/

PROJECT_ROOT = Path(__file__).resolve().parent.parent


# ------------------------------------------------------------
# INPUT DATASET
# ------------------------------------------------------------

INPUT_FILE = (
    PROJECT_ROOT
    / "data"
    / "landslides"
    / "NER_Landslide_Rainfall_ML_Dataset_654.csv"
)


# ------------------------------------------------------------
# OUTPUT DIRECTORY
# ------------------------------------------------------------

OUTPUT_DIR = PROJECT_ROOT / "ml" / "outputs"

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# ------------------------------------------------------------
# OUTPUT FILES
# ------------------------------------------------------------

PREPARED_DATASET_FILE = OUTPUT_DIR / "prepared_dataset.csv"

TRAIN_FILE = OUTPUT_DIR / "train.csv"

TEST_FILE = OUTPUT_DIR / "test.csv"


# ------------------------------------------------------------
# TRAIN / TEST CONFIGURATION
# ------------------------------------------------------------

TEST_SIZE = 0.20

RANDOM_STATE = 42


# ============================================================
# CHECK INPUT FILE
# ============================================================

print("\nChecking input dataset...")

if not INPUT_FILE.exists():

    raise FileNotFoundError(
        f"\nDataset not found:\n{INPUT_FILE}"
    )

print("[OK] Dataset found")

print(f"\nInput:")
print(INPUT_FILE)


# ============================================================
# LOAD DATASET
# ============================================================

print("\n" + "=" * 70)
print("LOADING DATASET")
print("=" * 70)


df = pd.read_csv(INPUT_FILE)


print(f"\n[OK] Dataset loaded successfully")

print(f"\nTotal rows: {len(df):,}")

print(f"Total columns: {len(df.columns)}")


print("\nColumns:")

for column in df.columns:

    print(f"  - {column}")


# ============================================================
# REQUIRED COLUMN VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("REQUIRED COLUMN VALIDATION")
print("=" * 70)


REQUIRED_COLUMNS = [

    # Coordinates
    "latitude",
    "longitude",

    # Static environmental features
    "elevation",
    "slope",
    "aspect",
    "soil_id",
    "landcover_class",

    # Rainfall features
    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d",

    # Target
    "label"

]


missing_columns = [

    column

    for column in REQUIRED_COLUMNS

    if column not in df.columns

]


if missing_columns:

    print("\n? Missing required columns:")

    for column in missing_columns:

        print(f"  - {column}")

    raise ValueError(
        "\nDataset does not contain all required columns."
    )


print("\n[OK] All required columns found")


for column in REQUIRED_COLUMNS:

    print(f"  [OK] {column}")


# ============================================================
# OPTIONAL COLUMN INFORMATION
# ============================================================

print("\n" + "=" * 70)
print("OPTIONAL COLUMN INFORMATION")
print("=" * 70)


OPTIONAL_COLUMNS = [

    "event_date",
    "sample_type",
    "nearest_grid_distance_km",
    "nearest_grid_latitude",
    "nearest_grid_longitude",
    "grid_distance_valid"

]


for column in OPTIONAL_COLUMNS:

    if column in df.columns:

        print(f"[OK] Found: {column}")

    else:

        print(f"[WARN] Not found: {column}")


# ============================================================
# CLASS LABEL VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("LABEL VALIDATION")
print("=" * 70)


print("\nLabel distribution:")

print(
    df["label"]
    .value_counts(dropna=False)
    .sort_index()
)


# Check missing labels

missing_labels = df["label"].isna().sum()


if missing_labels > 0:

    raise ValueError(
        f"\n? Dataset contains {missing_labels} missing labels."
    )


# Convert labels to numeric

df["label"] = pd.to_numeric(
    df["label"],
    errors="coerce"
)


invalid_labels = (

    ~df["label"].isin([0, 1])

).sum()


if invalid_labels > 0:

    raise ValueError(
        f"\n? Dataset contains {invalid_labels} invalid labels."
    )


print("\n[OK] Labels are valid")

print("\nAllowed labels:")

print("  0 = Background / No landslide")

print("  1 = Landslide")


# ============================================================
# CLASS BALANCE VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("CLASS BALANCE")
print("=" * 70)


class_counts = (

    df["label"]
    .value_counts()
    .sort_index()

)


negative_count = class_counts.get(0, 0)

positive_count = class_counts.get(1, 0)


print(f"\nBackground samples (0): {negative_count:,}")

print(f"Landslide samples (1):  {positive_count:,}")

print(f"Total samples:           {len(df):,}")


if negative_count == 0 or positive_count == 0:

    raise ValueError(
        "\n? Dataset does not contain both classes."
    )


balance_ratio = min(
    negative_count,
    positive_count
) / max(
    negative_count,
    positive_count
)


print(
    f"\nClass balance ratio: "
    f"{balance_ratio:.4f}"
)


if balance_ratio < 0.80:

    print(
        "\n[WARN] WARNING: Dataset is significantly imbalanced."
    )

else:

    print(
        "\n[OK] Class balance is acceptable."
    )


# ============================================================
# MISSING VALUE CHECK
# ============================================================

print("\n" + "=" * 70)
print("MISSING VALUE CHECK")
print("=" * 70)


missing_values = (

    df[REQUIRED_COLUMNS]
    .isnull()
    .sum()

)


total_missing = missing_values.sum()


for column, count in missing_values.items():

    percentage = (

        count / len(df)

    ) * 100


    print(

        f"{column:25s}: "

        f"{count:,} missing "

        f"({percentage:.2f}%)"

    )


print(

    f"\nTotal missing values "

    f"in required columns: "

    f"{total_missing:,}"

)


if total_missing > 0:

    raise ValueError(
        "\n? Missing values found in required columns."
    )


print("\n[OK] No missing values found in required columns")


# ============================================================
# NUMERIC FEATURE VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("NUMERIC FEATURE VALIDATION")
print("=" * 70)


NUMERIC_FEATURES = [

    "latitude",
    "longitude",

    "elevation",
    "slope",
    "aspect",

    "soil_id",
    "landcover_class",

    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d"

]


for column in NUMERIC_FEATURES:

    df[column] = pd.to_numeric(
        df[column],
        errors="coerce"
    )


    invalid_count = (

        df[column]
        .isna()
        .sum()

    )


    print(

        f"{column:25s}: "

        f"{invalid_count:,} invalid values"

    )


    if invalid_count > 0:

        raise ValueError(

            f"\n? Invalid numeric values found "

            f"in column: {column}"

        )


print("\n[OK] Numeric feature validation passed")


# ============================================================
# COORDINATE VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("COORDINATE VALIDATION")
print("=" * 70)


invalid_coordinates = (

    ~df["latitude"].between(-90, 90)

    |

    ~df["longitude"].between(-180, 180)

)


invalid_coordinate_count = (

    invalid_coordinates.sum()

)


print(

    f"\nInvalid coordinates: "

    f"{invalid_coordinate_count:,}"

)


print(

    f"\nLatitude range: "

    f"{df['latitude'].min():.6f} "

    f"to "

    f"{df['latitude'].max():.6f}"

)


print(

    f"Longitude range: "

    f"{df['longitude'].min():.6f} "

    f"to "

    f"{df['longitude'].max():.6f}"

)


if invalid_coordinate_count > 0:

    raise ValueError(
        "\n? Invalid coordinates detected."
    )


print("\n[OK] Coordinate validation passed")


# ============================================================
# RAINFALL FEATURE VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("RAINFALL FEATURE VALIDATION")
print("=" * 70)


RAINFALL_COLUMNS = [

    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d"

]


for column in RAINFALL_COLUMNS:

    negative_values = (

        df[column] < 0

    ).sum()


    print(

        f"{column:20s}: "

        f"{negative_values:,} negative values"

    )


    if negative_values > 0:

        raise ValueError(

            f"\n? Negative rainfall values found "

            f"in {column}"

        )


print("\n[OK] Rainfall values are valid")


# ============================================================
# CUMULATIVE RAINFALL WINDOW VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("CUMULATIVE RAINFALL WINDOW VALIDATION")
print("=" * 70)


consistency_checks = {

    "rainfall_3d >= rainfall_1d":

        df["rainfall_3d"]
        >=
        df["rainfall_1d"],


    "rainfall_7d >= rainfall_3d":

        df["rainfall_7d"]
        >=
        df["rainfall_3d"],


    "rainfall_15d >= rainfall_7d":

        df["rainfall_15d"]
        >=
        df["rainfall_7d"],


    "rainfall_30d >= rainfall_15d":

        df["rainfall_30d"]
        >=
        df["rainfall_15d"]

}


for check_name, condition in consistency_checks.items():

    failures = (

        ~condition

    ).sum()


    print(

        f"{check_name:35s}: "

        f"{failures:,} failures"

    )


    if failures > 0:

        raise ValueError(

            f"\n? Rainfall cumulative window validation "

            f"failed: {check_name}"

        )


print(
    "\n[OK] Rainfall cumulative windows are consistent"
)


# ============================================================
# DUPLICATE ROW CHECK
# ============================================================

print("\n" + "=" * 70)
print("DUPLICATE ROW CHECK")
print("=" * 70)


duplicate_rows = (

    df.duplicated()

).sum()


print(

    f"\nDuplicate complete rows: "

    f"{duplicate_rows:,}"

)


if duplicate_rows > 0:

    print(

        "\nRemoving duplicate rows..."

    )


    df = (

        df
        .drop_duplicates()
        .reset_index(drop=True)

    )


    print(

        f"[OK] Rows after duplicate removal: "

        f"{len(df):,}"

    )

else:

    print(

        "\n[OK] No duplicate complete rows found."

    )


# ============================================================
# DUPLICATE COORDINATE CHECK
# ============================================================

print("\n" + "=" * 70)
print("DUPLICATE COORDINATE CHECK")
print("=" * 70)


coordinate_columns = [

    "latitude",
    "longitude"

]


duplicate_coordinates = (

    df.duplicated(
        subset=coordinate_columns,
        keep=False
    )

).sum()


print(

    f"\nRecords sharing duplicate coordinates: "

    f"{duplicate_coordinates:,}"

)


if duplicate_coordinates > 0:

    print(

        "\n[WARN] Duplicate coordinates detected."

    )

    print(

        "This can be valid if multiple events "

        "or samples share locations."

    )

else:

    print(

        "\n[OK] No duplicate coordinates detected."

    )


# ============================================================
# FEATURE SELECTION
# ============================================================

print("\n" + "=" * 70)
print("FEATURE SELECTION")
print("=" * 70)


# Features used for the first ML model

FEATURE_COLUMNS = [

    "elevation",
    "slope",
    "aspect",

    "soil_id",
    "landcover_class",

    "rainfall_1d",
    "rainfall_3d",
    "rainfall_7d",
    "rainfall_15d",
    "rainfall_30d"

]


TARGET_COLUMN = "label"


print("\nML Features:")


for i, feature in enumerate(
    FEATURE_COLUMNS,
    start=1
):

    print(
        f"  {i}. {feature}"
    )


print(

    f"\nTarget column: "

    f"{TARGET_COLUMN}"

)


# ============================================================
# PREPARE DATASET
# ============================================================

print("\n" + "=" * 70)
print("PREPARING ML DATASET")
print("=" * 70)


# Keep feature columns and label

prepared_df = (

    df[
        FEATURE_COLUMNS
        +
        [TARGET_COLUMN]
    ]

    .copy()

)


print(

    f"\nPrepared dataset rows: "

    f"{len(prepared_df):,}"

)


print(

    f"Feature columns: "

    f"{len(FEATURE_COLUMNS)}"

)


# ============================================================
# SAVE PREPARED DATASET
# ============================================================

print("\n" + "=" * 70)
print("SAVING PREPARED DATASET")
print("=" * 70)


prepared_df.to_csv(
    PREPARED_DATASET_FILE,
    index=False
)


print(

    "\n[OK] Prepared dataset saved"

)


print(
    PREPARED_DATASET_FILE
)


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

print("\n" + "=" * 70)
print("CREATING TRAIN / TEST SPLIT")
print("=" * 70)


X = (

    prepared_df[
        FEATURE_COLUMNS
    ]

)


y = (

    prepared_df[
        TARGET_COLUMN
    ]

)


X_train, X_test, y_train, y_test = (

    train_test_split(

        X,

        y,

        test_size=TEST_SIZE,

        random_state=RANDOM_STATE,

        stratify=y

    )

)


# Combine features and labels

train_df = (

    X_train
    .copy()

)


train_df[TARGET_COLUMN] = (

    y_train

)


test_df = (

    X_test
    .copy()

)


test_df[TARGET_COLUMN] = (

    y_test

)


# ============================================================
# SAVE TRAIN DATASET
# ============================================================

train_df.to_csv(
    TRAIN_FILE,
    index=False
)


print(

    f"\n[OK] Training dataset saved"

)


print(
    TRAIN_FILE
)


# ============================================================
# SAVE TEST DATASET
# ============================================================

test_df.to_csv(
    TEST_FILE,
    index=False
)


print(

    f"\n[OK] Testing dataset saved"

)


print(
    TEST_FILE
)


# ============================================================
# TRAIN / TEST SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("TRAIN / TEST SUMMARY")
print("=" * 70)


print(

    f"\nTotal dataset: "

    f"{len(prepared_df):,}"

)


print(

    f"Training samples: "

    f"{len(train_df):,}"

)


print(

    f"Testing samples: "

    f"{len(test_df):,}"

)


print(

    f"\nTraining class distribution:"

)


print(

    train_df[TARGET_COLUMN]

    .value_counts()

    .sort_index()

)


print(

    f"\nTesting class distribution:"

)


print(

    test_df[TARGET_COLUMN]

    .value_counts()

    .sort_index()

)


# ============================================================
# FEATURE STATISTICS
# ============================================================

print("\n" + "=" * 70)
print("FEATURE STATISTICS")
print("=" * 70)


print(

    prepared_df[
        FEATURE_COLUMNS
    ]

    .describe()

)


# ============================================================
# FINAL SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("DATASET PREPARATION COMPLETE")
print("=" * 70)


print(

    f"\nInput dataset:"

)


print(
    INPUT_FILE
)


print(

    f"\nPrepared dataset:"

)


print(
    PREPARED_DATASET_FILE
)


print(

    f"\nTraining dataset:"

)


print(
    TRAIN_FILE
)


print(

    f"\nTesting dataset:"

)


print(
    TEST_FILE
)


print(

    f"\nFinal prepared records: "

    f"{len(prepared_df):,}"

)


print(

    f"Training records: "

    f"{len(train_df):,}"

)


print(

    f"Testing records: "

    f"{len(test_df):,}"

)


print(

    f"\nML features: "

    f"{len(FEATURE_COLUMNS)}"

)


print(

    f"Target: "

    f"{TARGET_COLUMN}"

)


print("\n[OK] ALL DATASET PREPARATION STEPS COMPLETED SUCCESSFULLY")

print("=" * 70)