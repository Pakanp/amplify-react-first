import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, MarkerClusterer } from "@react-google-maps/api";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";


function Map() {
  const [map, setMap] = useState(null);
  const [reports, setReports] = useState([]);
  const [openMarkers, setOpenMarkers] = useState([]);

  

  const secretName = "google-maps-api-key";
  const region = "us-east-1";
  const client = new SecretsManagerClient({ region });
  
  const getApiKey = async () => {
    let response;
    try {
      response = await client.send(new GetSecretValueCommand({ SecretId: secretName, VersionStage: "AWSCURRENT" }));
    } catch (error) {
      // For a list of exceptions thrown, see
      // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
      throw error;
    }
    const secret = response.SecretString;
    return secret;
  };


  useEffect(() => {
    // Fetch data from the external API
    fetch('https://y16bh31ap4.execute-api.us-east-1.amazonaws.com/dev/reports')
      .then(response => response.json())
      .then(data => {
        setReports(JSON.parse(data.body).Items);
      });
  }, []);

  const markers = reports.map(item => {
    return {
      lat: parseFloat(item.Geo_Latitude.S),
      lng: parseFloat(item.Geo_Longitude.S),
      label: item.Tags.S,
      id: item.Report_ID.S,
      text: item.Report_Text.S
    };
  });

  const onLoad = map => {
    setMap(map);
  };

  const onMarkerClick = (marker, map) => {
    setOpenMarkers(prevMarkers => [...prevMarkers, marker]);
    console.log(marker);

    if (marker.clusterer) {
      const cluster = marker.clusterer.getMarkers();
      const bounds = new window.google.maps.LatLngBounds();
      cluster.forEach(marker => bounds.extend(marker.getPosition()));
      const center = bounds.getCenter();
      const zoom = map.getZoom() + 1;
  
      if (zoom < 12) {
        // Use the panTo method to smoothly pan to the cluster center
        map.panTo(center);
      } else {
        // Use the animateTo method to smoothly zoom into the cluster
        map.animateTo({
          center: center,
          zoom: zoom,
        });
      }
    }
  };

  const onCloseInfoWindow = marker => {
    setOpenMarkers(prevMarkers => prevMarkers.filter(m => m !== marker));
  };

  const containerStyle = {
    width: "100%",
    height: "950px",
  };

  const [initialCenter, setInitialCenter] = useState({
    lat: 37.6565, 
    lng: -122.0552673
  });

  return (
    <GoogleMap 
      mapContainerStyle={containerStyle} 
      center={initialCenter} 
      zoom={16.5} 
      onLoad={onLoad}
      apiKey="">
      <MarkerClusterer gridSize={50} maxZoom={20}>
        {(clusterer) =>
            markers.map((marker) => (
              <Marker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                onClick={() => onMarkerClick(marker, map)}
                clusterer={clusterer}
                text={marker.label}
                label={marker.label}
              />
            ))
          }
      </MarkerClusterer>
      {openMarkers.map((marker, index) => (
        <InfoWindow 
          key={marker.id}
          position={{lat: marker.lat, lng: marker.lng}} 
          onCloseClick={() => onCloseInfoWindow(marker)}
        >
          <div>{marker.text}</div>
        </InfoWindow>
      ))}
    </GoogleMap>
  );
}

export default Map;
