// Aircraft Map module for the AirTraffic Command Center

// Define aircraft icons based on altitude ranges
const aircraftIcons = {
    createIcon: function(altitude, heading, category) {
        // Determine color based on altitude
        let color = '#3388ff'; // Default blue
        
        if (altitude < 10000) {
            color = '#ff4444'; // Red for low altitude
        } else if (altitude < 20000) {
            color = '#ff8800'; // Orange for medium-low altitude
        } else if (altitude < 30000) {
            color = '#ffcc00'; // Yellow for medium-high altitude
        } else {
            color = '#44ff44'; // Green for high altitude
        }
        
        // Create SVG for aircraft icon with rotation - more realistic aircraft shape
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M12,2L18,20L12,18L6,20L12,2" fill="${color}" stroke="#000" stroke-width="0.5"/>
                <path d="M8,10L12,9L16,10L16,12L12,14L8,12Z" fill="${color}" stroke="#000" stroke-width="0.5"/>
            </svg>
        `;
        
        // Convert SVG to data URL
        const svgBase64 = btoa(svg);
        const dataUrl = 'data:image/svg+xml;base64,' + svgBase64;
        
        // Create the icon
        return L.icon({
            iconUrl: dataUrl,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            popupAnchor: [0, -12],
            className: 'aircraft-marker' // Add class for CSS transitions
        });
    }
};

class AircraftMap {
    constructor(mapElementId, config = {}) {
        this.mapElementId = mapElementId;
        this.config = Object.assign({
            center: [14.5, 74.0],
            zoom: 7,
            maxZoom: 12,
            minZoom: 5,
            updateInterval: 5 // seconds
        }, config);
        
        this.aircraftMarkers = {};
        this.aircraftData = {};
        this.flightPaths = {};
        this.filters = {
            minAltitude: 0,
            maxAltitude: 50000,
            showPaths: false
        };
        
        // Store positions for smoother transitions
        this.markerPositions = {};
        
        // Track zoom state
        this.isZooming = false;
        this.zoomTimeout = null;
        
        this.init();
    }
    
    init() {
        console.log("Initializing AircraftMap with config:", this.config);
        
        // Initialize the Leaflet map with improved panning and zooming
        this.map = L.map(this.mapElementId, {
            zoomAnimation: true,
            markerZoomAnimation: true,
            fadeAnimation: true,
            zoomSnap: 0.5,
            zoomDelta: 0.5,
            wheelPxPerZoomLevel: 120, // Smoother mouse wheel zooming
            preferCanvas: true // Use Canvas renderer for better performance
        }).setView(this.config.center, this.config.zoom);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: this.config.maxZoom,
            minZoom: this.config.minZoom,
            updateWhenIdle: true, // Update tiles when zooming ends
            updateWhenZooming: false // Don't update during zoom for better performance
        }).addTo(this.map);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Add range rings (50, 100, 150, 200 NM) around the center
        this.addRangeRings();
        
        console.log("AircraftMap initialized successfully");
    }
    
    addRangeRings() {
        // Add range rings around the center point (in nautical miles)
        const center = this.config.center;
        const radiusNM = [50, 100, 150, 200]; // Nautical miles
        const NM_TO_KM = 1.852; // 1 nautical mile = 1.852 kilometers
        
        radiusNM.forEach(nm => {
            // Convert NM to meters (Leaflet uses meters)
            const radiusM = nm * NM_TO_KM * 1000;
            
            // Add circle
            const circle = L.circle(center, {
                radius: radiusM,
                fill: false,
                color: '#666',
                weight: 1,
                opacity: 0.5,
                dashArray: '5,5'
            }).addTo(this.map);
            
            // Add label
            const point = this.map.latLngToLayerPoint(center);
            const rad = this.map.distance(center, [center[0], center[1] + 0.1]) * radiusM / 11120; // Approximate radius in pixels
            const label = L.marker([center[0], center[1] + rad/111.2], {
                icon: L.divIcon({
                    className: 'range-label',
                    html: `<div>${nm} NM</div>`,
                    iconSize: [40, 20],
                    iconAnchor: [20, 10]
                })
            }).addTo(this.map);
        });
    }
    
    setupEventListeners() {
        // Add map zoom event handlers
        this.map.on('zoomstart', () => {
            this.isZooming = true;
            // Pause updates during zooming
            if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
        });
        
        this.map.on('zoomend', () => {
            // Set timeout to prevent rapid consecutive zoom operations
            if (this.zoomTimeout) clearTimeout(this.zoomTimeout);
            this.zoomTimeout = setTimeout(() => {
                this.isZooming = false;
                this.updateIconSize();
                this.updateMap(true); // Force update after zoom
            }, 300);
        });
        
        // Handle move start and end
        this.map.on('movestart', () => {
            // Optimize rendering during movement
            document.getElementById(this.mapElementId).style.willChange = 'transform';
        });
        
        this.map.on('moveend', () => {
            document.getElementById(this.mapElementId).style.willChange = 'auto';
        });
    }
    
    updateIconSize() {
        // Scale aircraft icons based on zoom level
        const zoomLevel = this.map.getZoom();
        const baseSize = 24;
        const scale = 1 + (zoomLevel - this.config.minZoom) * 0.1;
        const newSize = Math.max(baseSize * scale, baseSize);
        
        // Apply size change to all markers
        Object.values(this.aircraftMarkers).forEach(marker => {
            const icon = marker.getIcon();
            const newIcon = L.icon({
                iconUrl: icon.options.iconUrl,
                iconSize: [newSize, newSize],
                iconAnchor: [newSize / 2, newSize / 2],
                popupAnchor: [0, -newSize / 2],
                className: 'aircraft-marker'
            });
            marker.setIcon(newIcon);
        });
    }
    
    updateAircraftData(data) {
        // Skip update if we're zooming
        if (this.isZooming) return;
        
        // Store previous positions for flight path
        const previousPositions = {};
        Object.keys(this.aircraftData).forEach(hex => {
            if (this.aircraftData[hex] && this.aircraftData[hex].lat && this.aircraftData[hex].lon) {
                previousPositions[hex] = {
                    lat: this.aircraftData[hex].lat,
                    lon: this.aircraftData[hex].lon
                };
            }
        });
        
        // Update aircraft data
        this.aircraftData = {};
        if (data && data.aircraft) {
            data.aircraft.forEach(aircraft => {
                // Assign path property if it doesn't exist
                if (!aircraft.path && aircraft.lat && aircraft.lon) {
                    aircraft.path = [[aircraft.lat, aircraft.lon]];
                }
                
                this.aircraftData[aircraft.hex] = aircraft;
                
                // Update flight paths if necessary
                if (this.filters.showPaths && previousPositions[aircraft.hex] && 
                    aircraft.lat && aircraft.lon) {
                    this.updateFlightPath(aircraft.hex, previousPositions[aircraft.hex], {
                        lat: aircraft.lat,
                        lon: aircraft.lon
                    });
                }
            });
        }
        
        // Update the map visuals
        this.updateMap();
    }
    
    updateMap(forceUpdate = false) {
        // Skip update if we're zooming (unless forced)
        if (this.isZooming && !forceUpdate) return;
        
        // Apply filters
        const filteredAircraft = Object.values(this.aircraftData).filter(aircraft => {
            return aircraft.altitude >= this.filters.minAltitude && 
                   aircraft.altitude <= this.filters.maxAltitude;
        });
        
        // Add/update markers for each aircraft
        filteredAircraft.forEach(aircraft => {
            if (!aircraft.lat || !aircraft.lon) return;
            
            const position = [aircraft.lat, aircraft.lon];
            const rotationAngle = aircraft.track || aircraft.heading || 0;
            
            if (this.aircraftMarkers[aircraft.hex]) {
                // Smooth position update with tween
                this.updateMarkerPosition(aircraft.hex, position);
                
                // Only update icon if the aircraft data has significantly changed
                const needsIconUpdate = this.needsIconUpdate(aircraft.hex, aircraft);
                if (needsIconUpdate || forceUpdate) {
                    const newIcon = aircraftIcons.createIcon(
                        aircraft.altitude,
                        rotationAngle,
                        aircraft.category
                    );
                    this.aircraftMarkers[aircraft.hex].setIcon(newIcon);
                }
            } else {
                // Create new marker
                const icon = aircraftIcons.createIcon(
                    aircraft.altitude,
                    rotationAngle,
                    aircraft.category
                );
                
                const marker = L.marker(position, { 
                    icon: icon,
                    riseOnHover: true
                }).addTo(this.map);
                
                // Add popup with basic info
                const callsign = aircraft.flight ? aircraft.flight.trim() : 'N/A';
                marker.bindPopup(`
                    <strong>Flight:</strong> ${callsign}<br>
                    <strong>Hex:</strong> ${aircraft.hex}<br>
                    <strong>Altitude:</strong> ${aircraft.altitude} ft<br>
                    <strong>Speed:</strong> ${aircraft.speed} knots<br>
                    <strong>Heading:</strong> ${rotationAngle}°
                `);
                
                // Add click event
                marker.on('click', () => {
                    this.onAircraftClick(aircraft.hex);
                });
                
                // Store marker
                this.aircraftMarkers[aircraft.hex] = marker;
                this.markerPositions[aircraft.hex] = position;
            }
            
            // Update marker CSS based on direction
            if (this.aircraftMarkers[aircraft.hex]) {
                const element = this.aircraftMarkers[aircraft.hex].getElement();
                if (element) {
                    element.style.transform += ` rotate(${rotationAngle}deg)`;
                }
            }
        });
        
        // Remove markers for aircraft that are no longer visible
        Object.keys(this.aircraftMarkers).forEach(hex => {
            if (!filteredAircraft.some(a => a.hex === hex)) {
                this.map.removeLayer(this.aircraftMarkers[hex]);
                delete this.aircraftMarkers[hex];
                delete this.markerPositions[hex];
                
                // Remove flight path if it exists
                if (this.flightPaths[hex]) {
                    this.map.removeLayer(this.flightPaths[hex]);
                    delete this.flightPaths[hex];
                }
            }
        });
    }
    
    // Check if an aircraft's icon needs updating based on altitude changes
    needsIconUpdate(hex, currentData) {
        // Previous data not available
        if (!this.markerPositions[hex]) return true;
        
        // Altitude changed significantly
        const prevAltitude = this.aircraftData[hex] ? this.aircraftData[hex].altitude : 0;
        if (Math.abs(currentData.altitude - prevAltitude) > 1000) return true;
        
        // Direction changed significantly
        const prevDirection = this.aircraftData[hex] ? 
            (this.aircraftData[hex].track || this.aircraftData[hex].heading || 0) : 0;
        const currentDirection = currentData.track || currentData.heading || 0;
        
        if (Math.abs(currentDirection - prevDirection) > 10) return true;
        
        return false;
    }
    
    // Smooth transition for marker position updates
    updateMarkerPosition(hex, newPosition) {
        if (!this.markerPositions[hex]) {
            this.markerPositions[hex] = newPosition;
            this.aircraftMarkers[hex].setLatLng(newPosition);
            return;
        }
        
        // If position hasn't changed much, don't update
        const lastPos = this.markerPositions[hex];
        const distChange = this.calculateDistance(
            lastPos[0], lastPos[1], 
            newPosition[0], newPosition[1]
        );
        
        // Only update position if it has changed significantly
        if (distChange > 0.001) { // Approximately 100 meters
            this.aircraftMarkers[hex].setLatLng(newPosition);
            this.markerPositions[hex] = newPosition;
        }
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        // Simple approximation for small distances
        const R = 6371; // Radius of Earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    updateFlightPath(hex, prevPos, newPos) {
        if (!this.flightPaths[hex]) {
            // Create new path
            this.flightPaths[hex] = L.polyline([[prevPos.lat, prevPos.lon]], {
                color: this.getAltitudeColor(this.aircraftData[hex].altitude),
                weight: 2,
                opacity: 0.6,
                smoothFactor: 1
            }).addTo(this.map);
        }
        
        // Add point to existing path
        const currentPath = this.flightPaths[hex].getLatLngs();
        currentPath.push([newPos.lat, newPos.lon]);
        
        // Limit path length to prevent performance issues
        if (currentPath.length > 100) {
            currentPath.shift();
        }
        
        this.flightPaths[hex].setLatLngs(currentPath);
    }
    
    getAltitudeColor(altitude) {
        if (altitude < 10000) {
            return '#ff4444'; // Red
        } else if (altitude < 20000) {
            return '#ff8800'; // Orange
        } else if (altitude < 30000) {
            return '#ffcc00'; // Yellow
        } else {
            return '#44ff44'; // Green
        }
    }
    
    setFilters(filters) {
        this.filters = {...this.filters, ...filters};
        
        // Update flight paths visibility
        if (this.filters.showPaths) {
            Object.keys(this.flightPaths).forEach(hex => {
                if (!this.map.hasLayer(this.flightPaths[hex])) {
                    this.map.addLayer(this.flightPaths[hex]);
                }
            });
        } else {
            Object.keys(this.flightPaths).forEach(hex => {
                if (this.map.hasLayer(this.flightPaths[hex])) {
                    this.map.removeLayer(this.flightPaths[hex]);
                }
            });
        }
        
        // Trigger map update with new filters
        this.updateMap(true);
    }
    
    // Callback for when an aircraft is clicked
    onAircraftClick(hex) {
        // Default implementation - override this in the application
        console.log(`Aircraft clicked: ${hex}`);
    }
    
    zoomToAircraft(hex) {
        const aircraft = this.aircraftData[hex];
        if (aircraft && aircraft.lat && aircraft.lon) {
            this.map.setView([aircraft.lat, aircraft.lon], Math.min(this.map.getZoom() + 2, this.config.maxZoom), {
                animate: true,
                duration: 0.5 // 0.5 second animation - faster for smoother feel
            });
            
            if (this.aircraftMarkers[hex]) {
                this.aircraftMarkers[hex].openPopup();
            }
        }
    }
    
    zoomToAllAircraft() {
        // Create bounds that include all visible aircraft
        const positions = Object.values(this.aircraftData)
            .filter(a => a.lat && a.lon)
            .map(a => [a.lat, a.lon]);
        
        if (positions.length > 0) {
            const bounds = L.latLngBounds(positions);
            this.map.fitBounds(bounds, {
                padding: [50, 50],
                animate: true,
                duration: 0.5
            });
        } else {
            // If no aircraft, zoom to default view
            this.map.setView(this.config.center, this.config.zoom, {
                animate: true
            });
        }
    }
}

// Export the AircraftMap class as a global variable
window.AircraftMap = AircraftMap;