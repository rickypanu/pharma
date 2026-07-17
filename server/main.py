import os
import numpy as np 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import pandas as pd
from sklearn.cluster import KMeans
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="ZS Territory Engine")

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

mongo_url = os.getenv("MONGO_URI")
if not mongo_url:
    raise ValueError("MONGO_URI is missing. Please check your .env file.")

client = MongoClient(mongo_url)
db = client["zs_pharma_db"]
collection = db["hcp_data"]

@app.get("/api/optimize-territories")
def optimize_territories(num_reps: int = 5, strategy: str = "distance"):
    cursor = collection.find({}, {"_id": 0})
    df = pd.DataFrame(list(cursor))
    
    if df.empty:
        return {"error": "No data found. Please run the data pipeline."}

    # 1. Clustering Logic
    coords = df[['latitude', 'longitude']]

    if strategy == "distance":
        kmeans = KMeans(n_clusters=num_reps, random_state=42, n_init=10)
        df['territory_id'] = kmeans.fit_predict(coords)
    
    elif strategy == "balanced":
        kmeans = KMeans(n_clusters=num_reps, random_state=42, n_init=10)
        kmeans.fit(coords)
        centroids = kmeans.cluster_centers_

        territory_workloads = np.zeros(num_reps)
        df['territory_id'] = -1 

        df_sorted = df.sort_values(by='historical_rx_volume', ascending=False)

        for idx, row in df_sorted.iterrows():
            doc_coord = np.array([row['latitude'], row['longitude']])
            doc_vol = row['historical_rx_volume']

            best_territory = -1
            best_score = float('inf')

            for t_id in range(num_reps):
                # Calculate physical distance to territory center
                dist = np.linalg.norm(doc_coord - centroids[t_id])
                
                # Penalty: If a territory already has a lot of volume, make it "cost" more to add to it
                # Alpha (0.005) is the weight tuning distance vs. workload
                cost = dist + (0.005 * territory_workloads[t_id])

                if cost < best_score:
                    best_score = cost
                    best_territory = t_id

            # Update the dataframe and the running workload total
            df.at[idx, 'territory_id'] = best_territory
            territory_workloads[best_territory] += doc_vol

    # 2. Calculate Territory Metrics
    territory_workloads = df.groupby('territory_id')['historical_rx_volume'].sum()
    workload_variance = territory_workloads.std()

    # 3. UP District Rollup (New Intelligence Layer!)
    # Find which district has the absolute highest volume of prescriptions
    if 'district' in df.columns:
        district_volumes = df.groupby('district')['historical_rx_volume'].sum().reset_index()
        top_district = district_volumes.loc[district_volumes['historical_rx_volume'].idxmax()]
        top_district_name = top_district['district']
        top_district_vol = int(top_district['historical_rx_volume'])
    else:
        top_district_name = "N/A"
        top_district_vol = 0

    # 4. Return the optimized payload
    return {
        "metrics": {
            "total_hcps": len(df),
            "num_territories": num_reps,
            "workload_std_dev": round(workload_variance, 2),
            "strategy_used": strategy,
            "top_district": top_district_name,
            "top_district_volume": top_district_vol
        },
        "data": df.to_dict(orient="records")
    }