import requests
import json
import os
import time
from datetime import datetime

class DataProcessor:
    def __init__(self):
        """Initialize the data processor with a cache mechanism"""
        self.cache = None
        self.last_update = 0
        self.cache_duration = 5  # seconds to cache data
    
    def get_aircraft_data(self, flight_feeder_ip):
        """
        Get aircraft data from the flight feeder or from cache
        Returns processed data suitable for the dashboard
        """
        current_time = time.time()
        
        # Check if we need to update the cache
        if self.cache is None or (current_time - self.last_update) > self.cache_duration:
            raw_data = self._fetch_from_feeder(flight_feeder_ip)
            
            if raw_data:
                # Process the data for the dashboard
                processed_data = self._process_data(raw_data)
                self.cache = processed_data
                self.last_update = current_time
                
                # Also save the raw data to a file for debugging/analysis
                self._save_raw_data(raw_data)
        
        return self.cache
    
    def _fetch_from_feeder(self, flight_feeder_ip):
        """Connect to the flight feeder and retrieve aircraft data."""
        try:
            # Try common endpoints used by flight feeders
            endpoints = [
                "http://{}:8080/data/aircraft.json",
                "http://{}:8754/data/aircraft.json",
                "http://{}:80/data/aircraft.json",
                "http://{}:8080/api/aircraft"
            ]
            
            for endpoint in endpoints:
                url = endpoint.format(flight_feeder_ip)
                print(f"Trying to connect to {url}")
                
                try:
                    response = requests.get(url, timeout=5)
                    if response.status_code == 200:
                        print(f"Successfully connected to {url}")
                        return response.json()
                except:
                    continue
            
            print("Could not connect to flight feeder using common endpoints")
            
            # If we can't connect to the live feeder, use the sample data for testing
            return self._load_sample_data()
            
        except Exception as e:
            print(f"Error fetching aircraft data: {e}")
            return self._load_sample_data()
    
    def _load_sample_data(self):
        """Load sample data for testing when no live data is available"""
        try:
            with open('flight_data.json', 'r') as f:
                return json.load(f)
        except:
            # Return an empty dataset if no sample data is available
            return {"now": time.time(), "messages": 0, "aircraft": []}
    
    def _process_data(self, raw_data):
        """
        Process the raw flight data for the dashboard
        Adds derived data and filters out unnecessary fields
        """
        processed_data = {"timestamp": datetime.now().isoformat()}
        
        if not raw_data or "aircraft" not in raw_data:
            processed_data["aircraft"] = []
            return processed_data
        
        aircraft_list = []
        for aircraft in raw_data["aircraft"]:
            # Only process aircraft with position data
            if "lat" in aircraft and "lon" in aircraft:
                processed = {
                    "hex": aircraft.get("hex", ""),
                    "flight": aircraft.get("flight", "").strip(),
                    "lat": aircraft.get("lat"),
                    "lon": aircraft.get("lon"),
                    "altitude": aircraft.get("alt_baro", 0),
                    "speed": aircraft.get("gs", 0),
                    "track": aircraft.get("track", 0),
                    "category": aircraft.get("category", ""),
                    "squawk": aircraft.get("squawk", ""),
                    "heading": aircraft.get("mag_heading", aircraft.get("track", 0)),
                }
                
                # Add some derived data (simplified for this example)
                if "alt_baro" in aircraft and "alt_geom" in aircraft:
                    processed["altitude_difference"] = aircraft["alt_geom"] - aircraft["alt_baro"]
                
                aircraft_list.append(processed)
        
        processed_data["aircraft"] = aircraft_list
        processed_data["count"] = len(aircraft_list)
        
        return processed_data
    
    def _save_raw_data(self, raw_data):
        """Save raw data to a file for debugging/analysis"""
        try:
            with open('last_raw_data.json', 'w') as f:
                json.dump(raw_data, f, indent=2)
        except Exception as e:
            print(f"Error saving raw data: {e}")
    
    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calculate the distance between two points in kilometers using the Haversine formula"""
        from math import radians, sin, cos, sqrt, atan2
        
        # Approximate radius of earth in km
        R = 6371.0
        
        lat1 = radians(lat1)
        lon1 = radians(lon1)
        lat2 = radians(lat2)
        lon2 = radians(lon2)
        
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        
        a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        distance = R * c
        return distance