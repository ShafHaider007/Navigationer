import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDirections from "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions";
import "@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions.css";
import polyline from "@mapbox/polyline";
import "./Map.css";
import * as turf from "@turf/turf";

mapboxgl.accessToken =
  "pk.eyJ1Ijoic2hhZmhhaWRlcjAwNyIsImEiOiJjbHh2ZjZvenUwa3B2MmxzZ2htYm42YzA0In0.dArFMIkjpRvynwAnMq0dfA";

const Map = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null); // State for estimated time

  useEffect(() => {
    const mapInstance = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
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
          "line-width": 2,
        },
      });

      // Listen for route changes and update estimated time
      directions.on("route", (event) => {
        if (event.route.length) {
          const route = event.route[0];
          const duration = route.duration; // Duration in seconds
          setEstimatedTime(duration); // Update the estimated time state

          const decodedGeometry = polyline.decode(route.geometry); // Decode the polyline
          console.log("Decoded route geometry:", decodedGeometry); // Log the decoded coordinates

          // Create the routes object with an offset for the camera path
          const targetRoute = decodedGeometry.map((coord) => [
            coord[1],
            coord[0],
          ]);
          const cameraRoute = decodedGeometry.map((coord, index) => {
            if (index === 0) return [coord[1], coord[0]];
            const prevCoord = decodedGeometry[index - 1];
            const offset = turf.destination(
              turf.point([prevCoord[1], prevCoord[0]]),
              0.01, // Adjust this distance to control the offset
              turf.bearing(
                turf.point([prevCoord[1], prevCoord[0]]),
                turf.point([coord[1], coord[0]])
              )
            ).geometry.coordinates;
            return [offset[0], offset[1]];
          });

          const routes = {
            target: targetRoute,
            camera: cameraRoute,
          };

          console.log("Routes:", routes); // Log the routes object

          // Convert to GeoJSON LineString
          const geojsonLineString = {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: routes.target, // Ensure the coordinates are in [lng, lat] format
            },
            properties: {},
          };

          // Add the GeoJSON as a new source
          if (mapInstance.getSource("route")) {
            mapInstance.getSource("route").setData(geojsonLineString);
          } else {
            mapInstance.addSource("route", {
              type: "geojson",
              data: geojsonLineString,
            });

            // Add a new layer to use this source
            mapInstance.addLayer({
              id: "route",
              type: "line",
              source: "route",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#FF0000",
                "line-width": 4,
              },
            });
          }

          const animateCamera = () => {
            const animationDuration = 110000;
            const cameraAltitude = 5;
            const routeDistance = turf.length(turf.lineString(routes.target), {
              units: "kilometers",
            });
            const cameraRouteDistance = turf.length(
              turf.lineString(routes.camera),
              { units: "kilometers" }
            );

            let start;

            function frame(time) {
              if (!start) start = time;
              const phase = (time - start) / animationDuration;

              if (phase > 1) {
                setTimeout(() => {
                  start = 0.0;
                }, 1500);
              }

              const alongRoute = turf.along(
                turf.lineString(routes.target),
                routeDistance * phase,
                { units: "kilometers" }
              ).geometry.coordinates;
              const alongCamera = turf.along(
                turf.lineString(routes.camera),
                cameraRouteDistance * phase,
                { units: "kilometers" }
              ).geometry.coordinates;

              const camera = mapInstance.getFreeCameraOptions();

              camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
                {
                  lng: alongCamera[0],
                  lat: alongCamera[1],
                },
                cameraAltitude
              );

              camera.lookAtPoint({
                lng: alongRoute[0],
                lat: alongRoute[1],
              });

              const bearing = turf.bearing(
                turf.point(alongCamera),
                turf.point(alongRoute)
              );

              camera.setPitchBearing(75, bearing + 10);
              mapInstance.setFreeCameraOptions(camera);

              window.requestAnimationFrame(frame);
            }

            window.requestAnimationFrame(frame);
          };

          animateCamera();
        }
      });
    });

    setMap(mapInstance);

    // Clean up on unmount
    return () => mapInstance.remove();
  }, []);

  return (
    <div className="map-wrapper">
      <div ref={mapContainerRef} className="map-container" />
      {estimatedTime && (
        <div className="estimated-time">
          Estimated Time: {(estimatedTime / 60).toFixed(2)} minutes
        </div>
      )}
    </div>
  );
};

export default Map;
