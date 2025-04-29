from flask import Flask, render_template, jsonify
import json
import os
from data_processor import DataProcessor

app = Flask(__name__)

# Initialize data processor
data_processor = DataProcessor()

# Load configuration
with open('config.json', 'r') as f:
    config = json.load(f)

FLIGHT_FEEDER_IP = config.get('flight_feeder_ip', '192.168.31.123')

@app.route('/')
def index():
    return render_template('dashboard.html')

@app.route('/api/aircraft')
def get_aircraft_data():
    """API endpoint to get aircraft data for the client"""
    try:
        # Get data from FlightAware or cached data
        aircraft_data = data_processor.get_aircraft_data(FLIGHT_FEEDER_IP)
        return jsonify(aircraft_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Start the Flask application
    app.run(host='0.0.0.0', port=5000, debug=True)