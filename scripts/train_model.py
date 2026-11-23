"""
scripts/train_model.py
Trains NYC Taxi Trip Duration prediction model using time-based train/validation split.
Evaluates Median Baseline vs HistGradientBoostingRegressor (MAE in minutes and RMSLE).
Saves serialized pipeline to backend/app/ml/taxi_pipeline.joblib and metrics to outputs/metrics.json.
"""
import os
import sys
import json
import argparse
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import HistGradientBoostingRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.ml.features import (
    extract_features,
    TaxiDurationPipeline,
    FEATURE_COLUMNS,
    BOUNDING_BOX,
)


def train_and_evaluate(
    data_path: str = "data/nyc_taxi_sample.csv",
    model_output_path: str = "backend/app/ml/taxi_pipeline.joblib",
    metrics_output_path: str = "outputs/metrics.json",
    mode: str = "quick",
    regressor_type: str = "hist",
) -> dict:
    """Train pipeline and calculate evaluation metrics."""
    data_file = PROJECT_ROOT / data_path
    if not data_file.exists():
        print(f"Data file {data_file} not found. Running prepare_data.py first...")
        from scripts.prepare_data import prepare_dataset
        prepare_dataset(mode=mode, output_path=data_path)

    print(f"Loading data from {data_file}...")
    df = pd.read_csv(data_file)
    print(f"Loaded {len(df):,} records.")

    # Ensure chronological ordering for time-based split
    df["pickup_datetime"] = pd.to_datetime(df["pickup_datetime"])
    df = df.sort_values("pickup_datetime").reset_index(drop=True)

    # Feature extraction
    print("Extracting engineered features (spatial, temporal, network distances)...")
    X_features = extract_features(df)
    y_seconds = df["trip_duration"].values.astype(float)

    # Time-based split: 80% train, 20% validation
    split_idx = int(len(df) * 0.8)
    X_train = X_features.iloc[:split_idx]
    X_val = X_features.iloc[split_idx:]
    y_train = y_seconds[:split_idx]
    y_val = y_seconds[split_idx:]

    train_dates = (
        str(df["pickup_datetime"].iloc[0]),
        str(df["pickup_datetime"].iloc[split_idx - 1]),
    )
    val_dates = (
        str(df["pickup_datetime"].iloc[split_idx]),
        str(df["pickup_datetime"].iloc[-1]),
    )

    print(f"Train split: {len(X_train):,} samples ({train_dates[0]} to {train_dates[1]})")
    print(f"Val split:   {len(X_val):,} samples ({val_dates[0]} to {val_dates[1]})")

    # 1. Median Baseline Evaluation
    median_train_sec = float(np.median(y_train))
    baseline_val_preds = np.full_like(y_val, median_train_sec)

    base_mae_sec = float(mean_absolute_error(y_val, baseline_val_preds))
    base_mae_min = float(base_mae_sec / 60.0)
    base_rmsle = float(root_mean_squared_error(np.log1p(y_val), np.log1p(baseline_val_preds)))

    print("\n" + "=" * 60)
    print("BASELINE: Median Trip Duration")
    print(f"  Training median: {median_train_sec:.1f}s ({median_train_sec / 60.0:.2f} mins)")
    print(f"  Val MAE:   {base_mae_sec:.1f}s ({base_mae_min:.2f} minutes)")
    print(f"  Val RMSLE: {base_rmsle:.4f}")
    print("=" * 60)

    # 2. Train Gradient Boosting Regressor on log1p(trip_duration)
    # Target log-transform aligns squared error directly with RMSLE minimization
    y_train_log = np.log1p(y_train)

    if regressor_type == "hist":
        max_iter = 150 if mode == "quick" else 300
        print(f"\nTraining HistGradientBoostingRegressor (max_iter={max_iter}, lr=0.08)...")
        regressor = HistGradientBoostingRegressor(
            max_iter=max_iter,
            learning_rate=0.08,
            max_leaf_nodes=31,
            min_samples_leaf=20,
            l2_regularization=0.1,
            random_state=42,
        )
    else:
        n_estimators = 100 if mode == "quick" else 200
        print(f"\nTraining GradientBoostingRegressor (n_estimators={n_estimators}, lr=0.1)...")
        regressor = GradientBoostingRegressor(
            n_estimators=n_estimators,
            learning_rate=0.1,
            max_depth=5,
            random_state=42,
        )

    regressor.fit(X_train, y_train_log)

    # Model evaluation on validation set
    y_val_log_pred = regressor.predict(X_val)
    y_val_pred_sec = np.clip(np.expm1(y_val_log_pred), 60.0, 7200.0)

    model_mae_sec = float(mean_absolute_error(y_val, y_val_pred_sec))
    model_mae_min = float(model_mae_sec / 60.0)
    model_rmsle = float(root_mean_squared_error(np.log1p(y_val), np.log1p(y_val_pred_sec)))

    mae_reduction_min = float(base_mae_min - model_mae_min)
    mae_improvement_pct = float((mae_reduction_min / base_mae_min) * 100.0)
    rmsle_improvement = float(base_rmsle - model_rmsle)

    print("\n" + "=" * 60)
    print(f"MODEL: {regressor.__class__.__name__}")
    print(f"  Val MAE:   {model_mae_sec:.1f}s ({model_mae_min:.2f} minutes)")
    print(f"  Val RMSLE: {model_rmsle:.4f}")
    print(f"  MAE Reduction: {mae_reduction_min:.2f} minutes (-{mae_improvement_pct:.1f}%)")
    print(f"  RMSLE Improvement: {rmsle_improvement:.4f}")
    print("=" * 60)

    # 3. Assemble and save Pipeline
    metrics_summary = {
        "timestamp": datetime.now().isoformat(),
        "mode": mode,
        "dataset": {
            "total_samples": len(df),
            "train_samples": len(X_train),
            "val_samples": len(X_val),
            "train_val_split": "time-based (80/20)",
            "train_date_range": [train_dates[0], train_dates[1]],
            "val_date_range": [val_dates[0], val_dates[1]],
        },
        "baseline_median": {
            "median_train_seconds": round(median_train_sec, 1),
            "mae_seconds": round(base_mae_sec, 2),
            "mae_minutes": round(base_mae_min, 2),
            "rmsle": round(base_rmsle, 4),
        },
        "model": {
            "name": regressor.__class__.__name__,
            "mae_seconds": round(model_mae_sec, 2),
            "mae_minutes": round(model_mae_min, 2),
            "rmsle": round(model_rmsle, 4),
        },
        "improvement": {
            "mae_reduction_seconds": round(base_mae_sec - model_mae_sec, 2),
            "mae_reduction_minutes": round(mae_reduction_min, 2),
            "mae_improvement_percent": round(mae_improvement_pct, 1),
            "rmsle_improvement": round(rmsle_improvement, 4),
        },
        "bounding_box": BOUNDING_BOX,
        "feature_columns": FEATURE_COLUMNS,
    }

    pipeline = TaxiDurationPipeline(
        regressor=regressor,
        feature_columns=FEATURE_COLUMNS,
        metadata=metrics_summary,
    )

    model_out = PROJECT_ROOT / model_output_path
    model_out.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_out)
    print(f"\nSaved trained pipeline to: {model_out}")

    metrics_out = PROJECT_ROOT / metrics_output_path
    metrics_out.parent.mkdir(parents=True, exist_ok=True)
    with open(metrics_out, "w", encoding="utf-8") as f:
        json.dump(metrics_summary, f, indent=2, ensure_ascii=False)
    print(f"Saved metrics summary to: {metrics_out}")

    return metrics_summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train NYC Taxi Trip Duration Model")
    parser.add_argument("--data-path", default="data/nyc_taxi_sample.csv", help="Input dataset CSV")
    parser.add_argument("--model-path", default="backend/app/ml/taxi_pipeline.joblib", help="Output pipeline joblib")
    parser.add_argument("--metrics-path", default="outputs/metrics.json", help="Output metrics JSON")
    parser.add_argument("--mode", choices=["quick", "full"], default="quick", help="Execution mode")
    parser.add_argument("--quick", action="store_const", const="quick", dest="mode")
    parser.add_argument("--full", action="store_const", const="full", dest="mode")
    parser.add_argument("--regressor", choices=["hist", "gbr"], default="hist", help="Regressor type")

    args = parser.parse_args()
    train_and_evaluate(
        data_path=args.data_path,
        model_output_path=args.model_path,
        metrics_output_path=args.metrics_path,
        mode=args.mode,
        regressor_type=args.regressor,
    )
