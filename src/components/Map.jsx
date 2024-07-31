import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import "./Map.css";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic2hhZmhhaWRlcjAwNyIsImEiOiJjbHh2ZjZvenUwa3B2MmxzZ2htYm42YzA0In0.dArFMIkjpRvynwAnMq0dfA";

const Map = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);

  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [73.0479, 33.6844],
      zoom: 9, // Starting zoom level
    });

    // Add navigation control (the +/- zoom buttons)
    mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geolocate control to the map.
    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true,
      },
      trackUserLocation: true,
      showUserHeading: true,
    });
    mapInstance.addControl(geolocateControl, "top-left");

    // Add customized route control using Mapbox Directions API with driving-traffic profile
    const directions = new MapboxDirections({
      accessToken: mapboxgl.accessToken,
      unit: "metric",
      profile: "mapbox/driving-traffic", // Use the driving-traffic profile for real-time traffic data
      alternatives: true, // Show alternative routes
      congestion: true, // Highlight areas of congestion
      controls: {
        inputs: true, // Show input controls for origin and destination
        instructions: true, // Show route instructions
        profileSwitcher: true, // Allow switching between profiles (e.g., driving, walking, cycling)
      },
      flyTo: false, // Disable automatic fly to the route
    });
    mapInstance.addControl(directions, "top-left");

    // Add traffic layer to the map
    mapInstance.on("load", () => {
      mapInstance.addSource("traffic", {
        type: "vector",
        url: "mapbox://mapbox.mapbox-traffic-v1",
      });

      mapInstance.addLayer({
        id: "traffic",
        type: "line",
        source: "traffic",
        "source-layer": "traffic",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "congestion"], "low"],
            "#33cc33",
            ["==", ["get", "congestion"], "moderate"],
            "#ffcc00",
            ["==", ["get", "congestion"], "heavy"],
            "#ff6600",
            ["==", ["get", "congestion"], "severe"],
            "#cc0000",
            "#cccccc", // Default color if no congestion data is available
          ],
          "line-width": 3,
        },
      });
    });

    setMap(mapInstance);

    // Clean up on unmount
    return () => mapInstance.remove();
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default Map;
