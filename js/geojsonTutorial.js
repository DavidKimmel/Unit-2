// Define a GeoJSON feature representing a point location (Coors Field)
var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Coors Field", // Name of the feature
        "amenity": "Baseball Stadium", // Type of location
        "popupContent": "This is where the Rockies play!" // Text for the popup
    },
    "geometry": {
        "type": "Point", // Specifies that this is a point feature
        "coordinates": [-104.99404, 39.75621] // Longitude and latitude of the point
    }
};

// Add the GeoJSON feature to the map
L.geoJSON(geojsonFeature).addTo(map);


// Define a set of LineString features (lines connecting multiple coordinates)
var myLines = [{
    "type": "LineString",
    "coordinates": [[-100, 40], [-105, 45], [-110, 55]]
}, {
    "type": "LineString",
    "coordinates": [[-105, 40], [-110, 45], [-115, 55]]
}];

// Define a style object to customize the appearance of the lines
var myStyle = {
    "color": "#ff7800", // Orange color
    "weight": 5, // Line thickness
    "opacity": 0.65 // Transparency level
};

// Add the LineString features to the map and apply the custom style
L.geoJSON(myLines, {
    style: myStyle
}).addTo(map);


// Define two polygon features representing different political party regions
var states = [{
    "type": "Feature",
    "properties": {"party": "Republican"}, // Assigns a property for styling
    "geometry": {
        "type": "Polygon", // Defines a polygon shape
        "coordinates": [[
            [-104.05, 48.99],
            [-97.22,  48.98],
            [-96.58,  45.94],
            [-104.03, 45.94],
            [-104.05, 48.99] // Defines the boundary by connecting points
        ]]
    }
}, {
    "type": "Feature",
    "properties": {"party": "Democrat"},
    "geometry": {
        "type": "Polygon",
        "coordinates": [[
            [-109.05, 41.00],
            [-102.06, 40.99],
            [-102.03, 36.99],
            [-109.04, 36.99],
            [-109.05, 41.00]
        ]]
    }
}];

// Add the polygon features to the map with conditional styling based on properties
L.geoJSON(states, {
    style: function(feature) {
        switch (feature.properties.party) {
            case 'Republican': return {color: "#ff0000"}; // Red for Republican
            case 'Democrat':   return {color: "#0000ff"}; // Blue for Democrat
        }
    }
}).addTo(map);


// Define a function to bind popups to features dynamically
function onEachFeature(feature, layer) {
    // Check if the feature has a popupContent property
    if (feature.properties && feature.properties.popupContent) {
        layer.bindPopup(feature.properties.popupContent); // Bind popup text
    }
}

// Define another GeoJSON feature with a popup
var geojsonFeature = {
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "amenity": "Baseball Stadium",
        "popupContent": "This is where the Rockies play!"
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
};

// Add the feature to the map with the custom popup binding function
L.geoJSON(geojsonFeature, {
    onEachFeature: onEachFeature
}).addTo(map);


/*
Define multiple point features with a filtering property
var someFeatures = [{
    "type": "Feature",
    "properties": {
        "name": "Coors Field",
        "show_on_map": true // Determines if the feature should be displayed
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.99404, 39.75621]
    }
}, {
    "type": "Feature",
    "properties": {
        "name": "Busch Field",
        "show_on_map": false // This feature will be filtered out
    },
    "geometry": {
        "type": "Point",
        "coordinates": [-104.98404, 39.74621]
    }
}];

// Add the features to the map, filtering out those where show_on_map is false
L.geoJSON(someFeatures, {
    filter: function(feature, layer) {
        return feature.properties.show_on_map;
    }
}).addTo(map);
*/

