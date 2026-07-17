import numpy as np
import pandas as pd

from fastapi import APIRouter
from sklearn.cluster import KMeans

from database import collection

router = APIRouter(
    prefix="/api",
    tags=["Territories"]
)


@router.get("/optimize-territories")
def optimize_territories(
    num_reps: int = 5,
    strategy: str = "distance"
):
    cursor = collection.find({}, {"_id": 0})
    df = pd.DataFrame(list(cursor))

    if df.empty:
        return {"error": "No data found."}

    coords = df[["latitude", "longitude"]]

    if strategy == "distance":
        kmeans = KMeans(
            n_clusters=num_reps,
            random_state=42,
            n_init=10
        )
        df["territory_id"] = kmeans.fit_predict(coords)

    elif strategy == "balanced":
        kmeans = KMeans(
            n_clusters=num_reps,
            random_state=42,
            n_init=10
        )

        kmeans.fit(coords)
        centroids = kmeans.cluster_centers_

        territory_workloads = np.zeros(num_reps)
        df["territory_id"] = -1

        df_sorted = df.sort_values(
            by="historical_rx_volume",
            ascending=False
        )

        for idx, row in df_sorted.iterrows():
            doc_coord = np.array([
                row["latitude"],
                row["longitude"]
            ])

            doc_vol = row["historical_rx_volume"]

            best_territory = -1
            best_score = float("inf")

            for t_id in range(num_reps):

                dist = np.linalg.norm(
                    doc_coord - centroids[t_id]
                )

                cost = dist + (
                    0.005 * territory_workloads[t_id]
                )

                if cost < best_score:
                    best_score = cost
                    best_territory = t_id

            df.at[idx, "territory_id"] = best_territory
            territory_workloads[best_territory] += doc_vol

    territory_workloads = df.groupby(
        "territory_id"
    )["historical_rx_volume"].sum()

    workload_variance = territory_workloads.std()

    if "district" in df.columns:
        district_volumes = (
            df.groupby("district")["historical_rx_volume"]
            .sum()
            .reset_index()
        )

        top = district_volumes.loc[
            district_volumes["historical_rx_volume"].idxmax()
        ]

        top_district = top["district"]
        top_volume = int(top["historical_rx_volume"])

    else:
        top_district = "N/A"
        top_volume = 0

    return {
        "metrics": {
            "total_hcps": len(df),
            "num_territories": num_reps,
            "workload_std_dev": round(workload_variance, 2),
            "strategy_used": strategy,
            "top_district": top_district,
            "top_district_volume": top_volume,
        },
        "data": df.to_dict(orient="records"),
    }