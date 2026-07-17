import os
import numpy as np
import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
mongo_url = os.getenv("MONGO_URI")
client = MongoClient(mongo_url)
db = client["zs_pharma_db"]
collection = db["hcp_data"]

def generate_up_healthcare_data(num_doctors=1000):
    np.random.seed(42)
    
    # 1. Real UP Medical Hubs (Latitude & Longitude) spread across the state
    # Weights represent the concentration of doctors in these areas (Total must equal 1.0)
    up_hubs = [
        # Central UP (Awadh)
        {"district": "Lucknow", "lat": 26.8467, "lon": 80.9462, "weight": 0.15},
        {"district": "Kanpur", "lat": 26.4499, "lon": 80.3319, "weight": 0.12},
        {"district": "Ayodhya", "lat": 26.7922, "lon": 82.1983, "weight": 0.03},
        
        # Eastern UP (Purvanchal)
        {"district": "Varanasi", "lat": 25.3176, "lon": 82.9739, "weight": 0.10},
        {"district": "Prayagraj", "lat": 25.4358, "lon": 81.8463, "weight": 0.10},
        {"district": "Gorakhpur", "lat": 26.7606, "lon": 83.3732, "weight": 0.08},
        
        # Western UP (Paschim)
        {"district": "Noida/Ghaziabad", "lat": 28.6692, "lon": 77.4538, "weight": 0.10},
        {"district": "Meerut", "lat": 28.9845, "lon": 77.7064, "weight": 0.08},
        {"district": "Agra", "lat": 27.1767, "lon": 78.0081, "weight": 0.08},
        {"district": "Bareilly", "lat": 28.3670, "lon": 79.4304, "weight": 0.07},
        {"district": "Aligarh", "lat": 27.8974, "lon": 78.0880, "weight": 0.05},
        
        # Southern UP (Bundelkhand)
        {"district": "Jhansi", "lat": 25.4484, "lon": 78.5685, "weight": 0.04}
    ]
    
    hub_names = [hub["district"] for hub in up_hubs]
    hub_weights = [hub["weight"] for hub in up_hubs]

    lats = []
    lons = []
    districts = []

    # 2. Scatter doctors around these real UP districts
    for _ in range(num_doctors):
        chosen_hub = np.random.choice(up_hubs, p=hub_weights)
        districts.append(chosen_hub["district"])
        
        # Add random noise so they spread across the city/district
        doc_lat = np.random.normal(chosen_hub["lat"], 0.15)
        doc_lon = np.random.normal(chosen_hub["lon"], 0.15)
        lats.append(doc_lat)
        lons.append(doc_lon)

    # 3. Generate Pareto-distributed Rx volumes (The 80/20 Rule)
    mean_rx = 50 
    pareto_samples = (np.random.pareto(1.16, num_doctors) + 1) * mean_rx
    rx_volumes = np.round(pareto_samples).astype(int)

    # 4. Create the final DataFrame
    df = pd.DataFrame({
        "hcp_id": [f"UP_HCP_{str(i).zfill(4)}" for i in range(1, num_doctors + 1)],
        "district": districts, 
        "specialty": np.random.choice(["Cardiologist", "General Practitioner", "Endocrinologist"], size=num_doctors, p=[0.2, 0.5, 0.3]),
        "latitude": lats,
        "longitude": lons,
        "historical_rx_volume": rx_volumes
    })

    # 5. Clear old data and insert the new comprehensive UP data
    collection.delete_many({})
    records = df.to_dict(orient='records')
    collection.insert_many(records)
    print(f"Successfully inserted {len(records)} Uttar Pradesh HCP records (covering West, East, Central, and South UP) into MongoDB.")

if __name__ == "__main__":
    generate_up_healthcare_data()