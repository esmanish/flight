# AirTraffic Command Center

A real-time flight tracking dashboard that visualizes aircraft data from ADS-B receivers.

## Overview

The AirTraffic Command Center is an educational tool that provides a web-based real-time dashboard for monitoring and analyzing aircraft movement. The application connects to a FlightAware ADS-B receiver to collect flight data and displays aircraft positions, detailed information, and flight paths on an interactive map.

This project is perfect for students interested in:
- Aviation data visualization
- RF (Radio Frequency) technologies
- Real-time data processing
- Interactive web applications

## Features

- **Real-time Aircraft Tracking**: View aircraft positions on an interactive map
- **Altitude-Based Coloring**: Aircraft icons change color based on their altitude
- **Flight Path Visualization**: Toggle flight paths to see recent aircraft movement
- **Detailed Aircraft Information**: Click on aircraft to view comprehensive details
- **Aircraft Search**: Find specific aircraft by callsign or hex code
- **Altitude Filtering**: Filter aircraft by minimum altitude
- **Distance Rings**: Concentric circles showing distance in nautical miles
- **Flight Statistics**: Real-time statistics about maximum altitude, speed, and count

## Prerequisites

- Python 3.7 or higher
- Flask
- A FlightAware ADS-B receiver (optional - sample data provided)

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/esmanish/flight.git
   cd flight
   ```

2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure the application:
   - Edit `config.json` to set your FlightAware receiver IP (default is 192.168.31.123)
   - If you don't have a receiver, the application will use sample data

4. Run the application:
   ```bash
   python server.py
   ```

5. Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

## Project Structure

```
air-traffic-command-center/
├── server.py                  # Main Flask server
├── data_processor.py          # Aircraft data processing
├── config.json                # Application configuration
├── last_raw_data.json         # Last received raw data (for debugging)
├── requirements.txt           # Python dependencies
├── README.md                  # This readme file
├── static/                    # Static assets
│   ├── css/
│   │   └── style.css          # Application styles
│   └── js/
│       ├── dashboard.js       # Dashboard control logic
│       └── map.js             # Map and aircraft visualization
└── templates/                 
    └── dashboard.html         # Main dashboard template
```

## Using the Dashboard

### Map Navigation
- **Zoom**: Use the mouse wheel or the zoom buttons in the top left
- **Pan**: Click and drag to move the map

### Aircraft Tracking
- **View Details**: Click on an aircraft icon or list item to view its details
- **Center Map**: Click the "Center Map" button in aircraft details to focus on that aircraft
- **Show Paths**: Toggle the "Show Flight Paths" checkbox to view recent flight paths

### Filtering
- **Altitude Filter**: Use the slider to show only aircraft above a certain altitude
- **Search**: Type a callsign or hex code in the search box to find specific aircraft
- **Reset Filters**: Click the "Reset Filters" button to clear all filters

## How It Works

1. The application connects to a FlightAware ADS-B receiver to get real-time flight data
2. The data processor extracts and formats the necessary information
3. The dashboard displays this information on an interactive map and in the sidebar
4. The data is automatically refreshed every 5 seconds


## Troubleshooting

### No Aircraft Appearing
- Check if your FlightAware receiver is correctly connected and operational
- Verify the IP address in `config.json` matches your receiver
- Ensure your computer is on the same network as the receiver

### Application Won't Start
- Check if all dependencies are installed (`pip install -r requirements.txt`)
- Make sure port 5000 is not already in use
- Check for error messages in the terminal

### Map Loading But No Aircraft Data
- Check the browser console for JavaScript errors
- Test the API endpoint directly by visiting `http://localhost:5000/api/aircraft`
- Check if `last_raw_data.json` contains valid flight data



## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [Leaflet.js](https://leafletjs.com/) for interactive maps
- [FlightAware](https://flightaware.com/) for ADS-B technology
- [Bootstrap](https://getbootstrap.com/) for UI components
- [OpenStreetMap](https://www.openstreetmap.org/) for map tiles
