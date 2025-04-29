// AirTraffic Command Center Dashboard Controller

// Store global dashboard state
const dashboardState = {
    map: null,
    refreshInterval: 5, // seconds
    refreshTimer: null,
    selectedAircraft: null,
    stats: {
        totalAircraft: 0,
        maxAltitude: 0,
        maxSpeed: 0
    }
};

// Initialize the dashboard
function initDashboard() {
    console.log("Initializing AirTraffic Command Center Dashboard");
    
    // Get map configuration from config variable
    const mapConfig = window.mapConfig || {
        center: [14.5, 74.0],
        zoom: 7,
        maxZoom: 12,
        minZoom: 5
    };
    
    // Initialize map
    dashboardState.map = new AircraftMap('map', mapConfig);
    
    // Set the aircraft click callback
    dashboardState.map.onAircraftClick = handleAircraftClick;
    
    // Set up UI event handlers
    setupEventHandlers();
    
    // Start data refresh cycle
    startDataRefresh();
}

// Set up event handlers for UI elements
function setupEventHandlers() {
    // Altitude filter change
    const altitudeFilter = document.getElementById('altitude-filter');
    if (altitudeFilter) {
        altitudeFilter.addEventListener('input', (e) => {
            const minAltitude = parseInt(e.target.value);
            updateAltitudeFilterLabel(minAltitude);
            dashboardState.map.setFilters({ minAltitude });
        });
    }
    
    // Flight paths toggle
    const showPaths = document.getElementById('show-paths');
    if (showPaths) {
        showPaths.addEventListener('change', (e) => {
            dashboardState.map.setFilters({ showPaths: e.target.checked });
        });
    }
    
    // Reset filters button
    const resetFilters = document.getElementById('reset-filters');
    if (resetFilters) {
        resetFilters.addEventListener('click', () => {
            resetAllFilters();
        });
    }
    
    // Aircraft search
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-aircraft');
    
    if (searchButton && searchInput) {
        // Click search button
        searchButton.addEventListener('click', () => {
            performSearch(searchInput.value);
        });
        
        // Press Enter in search box
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }
}

// Reset all filters to default values
function resetAllFilters() {
    const altitudeFilter = document.getElementById('altitude-filter');
    const showPaths = document.getElementById('show-paths');
    
    if (altitudeFilter) {
        altitudeFilter.value = 0;
        updateAltitudeFilterLabel(0);
    }
    
    if (showPaths) {
        showPaths.checked = false;
    }
    
    // Reset map filters
    dashboardState.map.setFilters({
        minAltitude: 0,
        showPaths: false
    });
}

// Update the altitude filter label
function updateAltitudeFilterLabel(value) {
    const altitudeLabel = document.querySelector('.altitude-display');
    if (altitudeLabel) {
        altitudeLabel.textContent = `${value.toLocaleString()} ft`;
    }
}

// Handle aircraft click event
function handleAircraftClick(hex) {
    console.log(`Aircraft clicked: ${hex}`);
    
    // Update selected aircraft
    dashboardState.selectedAircraft = hex;
    
    // Show aircraft details in sidebar
    showAircraftDetail(hex);
    
    // Highlight in list
    highlightAircraftInList(hex);
}

// Show detailed aircraft information in sidebar
function showAircraftDetail(hex) {
    const detailPanel = document.getElementById('aircraft-detail');
    const aircraft = dashboardState.map.aircraftData[hex];
    
    if (!detailPanel || !aircraft) return;
    
    // Display the detail panel
    detailPanel.style.display = 'block';
    
    // Format callsign
    const callsign = aircraft.flight ? aircraft.flight.trim() : 'Unknown';
    const hexCode = aircraft.hex ? aircraft.hex.toUpperCase() : '';
    
    // Generate detail HTML
    detailPanel.innerHTML = `
        <h6>${callsign} (${hexCode})</h6>
        <table class="table table-sm">
            <tr>
                <th>Position:</th>
                <td>${aircraft.lat.toFixed(4)}°, ${aircraft.lon.toFixed(4)}°</td>
            </tr>
            <tr>
                <th>Altitude:</th>
                <td>${aircraft.altitude.toLocaleString()} ft</td>
            </tr>
            <tr>
                <th>Speed:</th>
                <td>${aircraft.speed} knots</td>
            </tr>
            <tr>
                <th>Heading:</th>
                <td>${aircraft.heading || aircraft.track || 0}°</td>
            </tr>
            <tr>
                <th>Squawk:</th>
                <td>${aircraft.squawk || 'N/A'}</td>
            </tr>
        </table>
        <button class="btn btn-sm btn-primary btn-center-map" data-hex="${hex}">Center Map</button>
    `;
    
    // Add event handler for center map button
    const centerButton = detailPanel.querySelector('.btn-center-map');
    if (centerButton) {
        centerButton.addEventListener('click', () => {
            dashboardState.map.zoomToAircraft(hex);
        });
    }
}

// Highlight the selected aircraft in the list
function highlightAircraftInList(hex) {
    // Remove highlighting from all items
    const allItems = document.querySelectorAll('.aircraft-item');
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // Add highlighting to selected item
    const selectedItem = document.querySelector(`.aircraft-item[data-hex="${hex}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
        selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Perform aircraft search
function performSearch(searchTerm) {
    if (!searchTerm) return;
    
    searchTerm = searchTerm.toLowerCase().trim();
    
    const aircraftList = document.getElementById('aircraft-list');
    const items = aircraftList.querySelectorAll('.aircraft-item');
    let foundMatch = false;
    
    items.forEach(item => {
        const hex = item.dataset.hex;
        const aircraft = dashboardState.map.aircraftData[hex];
        
        if (!aircraft) return;
        
        const callsign = aircraft.flight ? aircraft.flight.trim().toLowerCase() : '';
        const hexCode = aircraft.hex.toLowerCase();
        
        if (callsign.includes(searchTerm) || hexCode.includes(searchTerm)) {
            // Show this item
            item.style.display = 'block';
            
            // If this is the first match, select it
            if (!foundMatch) {
                handleAircraftClick(hex);
                foundMatch = true;
            }
        } else {
            // Hide this item
            item.style.display = 'none';
        }
    });
    
    // If no matches found, show a message
    if (!foundMatch) {
        showSearchNoResults(searchTerm);
    }
}

// Show "no results" message
function showSearchNoResults(searchTerm) {
    const detailPanel = document.getElementById('aircraft-detail');
    if (detailPanel) {
        detailPanel.style.display = 'block';
        detailPanel.innerHTML = `
            <div class="alert alert-info">
                No aircraft found matching "${searchTerm}"
            </div>
        `;
    }
}

// Start the data refresh cycle
function startDataRefresh() {
    // Clear any existing timer
    if (dashboardState.refreshTimer) {
        clearInterval(dashboardState.refreshTimer);
    }
    
    // Perform initial data refresh
    refreshData();
    
    // Set up the refresh interval
    dashboardState.refreshTimer = setInterval(() => {
        refreshData();
    }, dashboardState.refreshInterval * 1000);
}

// Refresh data from the server
function refreshData() {
    fetch('/api/aircraft')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            // Update the map with new data
            dashboardState.map.updateAircraftData(data);
            
            // Update the aircraft list
            updateAircraftList(data);
            
            // Update statistics
            updateStatistics(data);
            
            // Update last refresh time
            updateLastRefreshTime();
        })
        .catch(error => {
            console.error('Error fetching aircraft data:', error);
        });
}

// Update the aircraft list in the sidebar
function updateAircraftList(data) {
    const aircraftList = document.getElementById('aircraft-list');
    if (!aircraftList || !data || !data.aircraft) return;
    
    // Clear existing list
    aircraftList.innerHTML = '';
    
    // Sort aircraft by callsign
    const sortedAircraft = [...data.aircraft].sort((a, b) => {
        const callsignA = a.flight ? a.flight.trim() : a.hex;
        const callsignB = b.flight ? b.flight.trim() : b.hex;
        return callsignA.localeCompare(callsignB);
    });
    
    // Add each aircraft to the list
    sortedAircraft.forEach(aircraft => {
        if (!aircraft.lat || !aircraft.lon) return; // Skip aircraft without position
        
        const callsign = aircraft.flight ? aircraft.flight.trim() : 'Unknown';
        const listItem = document.createElement('div');
        listItem.className = 'aircraft-item';
        
        // Add active class if this is the selected aircraft
        if (dashboardState.selectedAircraft === aircraft.hex) {
            listItem.className += ' active';
        }
        
        listItem.dataset.hex = aircraft.hex;
        listItem.innerHTML = `
            <strong>${callsign}</strong> 
            <span class="altitude-display">(${aircraft.altitude.toLocaleString()} ft)</span>
        `;
        
        listItem.addEventListener('click', () => {
            handleAircraftClick(aircraft.hex);
        });
        
        aircraftList.appendChild(listItem);
    });
    
    // If we had a selected aircraft, update its details
    if (dashboardState.selectedAircraft && dashboardState.map.aircraftData[dashboardState.selectedAircraft]) {
        showAircraftDetail(dashboardState.selectedAircraft);
    } else if (sortedAircraft.length > 0) {
        // If no aircraft was selected but we have aircraft, select the first one
        handleAircraftClick(sortedAircraft[0].hex);
    }
}

// Update dashboard statistics
function updateStatistics(data) {
    if (!data || !data.aircraft) return;
    
    const totalAircraft = data.aircraft.length;
    
    let maxAltitude = 0;
    let maxSpeed = 0;
    
    // Find maximum values
    data.aircraft.forEach(aircraft => {
        if (aircraft.altitude > maxAltitude) maxAltitude = aircraft.altitude;
        if (aircraft.speed > maxSpeed) maxSpeed = aircraft.speed;
    });
    
    // Store in state
    dashboardState.stats = {
        totalAircraft,
        maxAltitude,
        maxSpeed
    };
    
    // Update UI
    const totalAircraftEl = document.getElementById('total-aircraft');
    const maxAltitudeEl = document.getElementById('max-altitude');
    const maxSpeedEl = document.getElementById('max-speed');
    
    if (totalAircraftEl) totalAircraftEl.textContent = totalAircraft;
    if (maxAltitudeEl) maxAltitudeEl.textContent = `${maxAltitude.toLocaleString()} ft`;
    if (maxSpeedEl) maxSpeedEl.textContent = `${maxSpeed.toLocaleString()} knots`;
}

// Update the last refresh time display
function updateLastRefreshTime() {
    const lastUpdateEl = document.getElementById('last-update-time');
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleTimeString();
    }
}

// Initialize the dashboard when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initDashboard);