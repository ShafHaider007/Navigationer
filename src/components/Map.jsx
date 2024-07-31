import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "./Map.css";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic2hhZmhhaWRlcjAwNyIsImEiOiJjbHh2ZjZvenUwa3B2MmxzZ2htYm42YzA0In0.dArFMIkjpRvynwAnMq0dfA";

const Map = () => {
  const mapContainerRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-74.5, 40], // Starting position [lng, lat]
      zoom: 9, // Starting zoom level
    });

    // Add navigation control (the +/- zoom buttons)
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add a marker with some info
    const marker = new mapboxgl.Marker()
      .setLngLat([-74.5, 40])
      .setPopup(
        new mapboxgl.Popup().setHTML(
          "<h3>Marker Info</h3><p>This is a marker.</p>"
        )
      )
      .addTo(map);

    // Clean up on unmount
    return () => map.remove();
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container" />
    </div>
  );
};

export default Map;
