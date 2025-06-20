import React, { useState, useEffect  } from 'react';
import {APIProvider, Map, useMap, useMapsLibrary} from '@vis.gl/react-google-maps';
import {PlaceAutocompleteClassic} from './autocomplete-classic';
import './App.css';


const serverPort = 3001;
const googleMapsApiKey = "AIzaSyDsQUV_LMMHVvJNpRV4PC6wYd4NsooyWFU";

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 49.8951,
  lng: -97.1384
};

// Define a symbol using SVG path notation, with an opacity of 1.
const lineSymbol = {
  path: "M 0,-1 0,1",
  strokeOpacity: 1,
  scale: 4,
};

const polylineOptions = {
  geodesic: true,
  strokeColor: '#FF0000', 
  strokeOpacity: 0,
  strokeWeight: 2,
  icons: [
    {
      icon: lineSymbol,
      offset: "0",
      repeat: "20px",
    },
  ],
};


const App = () => {
  // const { isLoaded } = useJsApiLoader({
  //   googleMapsApiKey: googleMapsApiKey,
  //   libraries: libraries,
  // });
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState(''); 
  const [currentPosition, setCurrentPosition] = useState(null);
  const [routePlans, setRoutePlans] = useState([]);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [scores, setScores] = useState([]);

  return (
    <div className="App">
      <APIProvider apiKey={googleMapsApiKey}>
        <h1>Commute Compass</h1>
        <a href="https://github.com/pricezhang42/Commute-Compass-Vercel">GitHub Repo</a>
        <div style={{ marginBottom: '10px' }}>
          <strong>Origin:</strong><PlaceAutocompleteClassic onPlaceSelect={setOrigin} currPos={currentPosition} /> 
          <strong>Destination:</strong><PlaceAutocompleteClassic onPlaceSelect={setDestination} currPos={currentPosition} />
          <GetRouteButton origin={origin} destination={destination} setPlans={setRoutePlans} setScores={setScores} setSelected={setSelectedPlanIndex} />
        </div>
        <div style={containerStyle}>
        <Map
          defaultZoom={12}
          defaultCenter={center}
          gestureHandling={'greedy'}
          disableDefaultUI={false}
        />
        </div>
        <GetCurrentCoord setPos={setCurrentPosition} />
        <Directions currPos={currentPosition} />
        <RouteCards routePlans={routePlans} routeScores={scores} setSelected={setSelectedPlanIndex} />
        <DisplayRoute routePlans={routePlans} selectedPlanIndex={selectedPlanIndex} />
      </APIProvider>
    </div>
  );
};

function GetCurrentCoord({setPos}) {
  React.useEffect(() => {
    const fetchCurrentPosition = async () => {
      try {
        const pos = await getCurrentCoord();
        setPos(pos);
      } catch (error) {
        console.error(error);
      }
    };

    fetchCurrentPosition();
  }, []);

  const getCurrentCoord = () => {
    return new Promise((resolve, reject) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            resolve(pos);
          },
          () => {
            console.error("Error: The Geolocation service failed.");
            reject("Error: The Geolocation service failed.");
          }
        );
      } else {
        console.error("Error: Your browser doesn't support geolocation.");
        reject("Error: Your browser doesn't support geolocation.");
      }
    });
  };
}

function Directions( {currPos} ) {
  const markerLib = useMapsLibrary("marker");
  const [marker, setMarker] = useState();

  const map = useMap();

  React.useEffect(() => {
    if (map && currPos) {
      map.setCenter(currPos);
    }
  }, [map, currPos]);

}

function GetRouteButton({ origin, destination, setPlans, setScores, setSelected }) {
  const [warning, setWarning] = useState('');

  const getCoordinates = (formatedAddress) => {
    const latitude = formatedAddress.geometry.location.lat();
    const longitude = formatedAddress.geometry.location.lng();
    return [latitude, longitude];
  };

  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => {
        setWarning('');
      }, 4000); // Hide after 4 seconds
      return () => clearTimeout(timer);
    }
  }, [warning]);

  const callMyFunction = async () => {
    try {
      const coordOrigin = getCoordinates(origin);
      const coordDest = getCoordinates(destination);

      const response = await fetch(`https://commute-compass-backend.vercel.app/myFunction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ origin: coordOrigin, destination: coordDest }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();

      if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[0]) || data[0].length === 0) {
        setWarning('⚠️ Please enter valid places within Winnipeg.');
        return;
      }

      const [plans, routeScores] = data;
      setPlans(plans);
      setScores(routeScores);
      setSelected(routeScores[0].planId - 1);
    } catch (error) {
      console.error('There has been a problem with your fetch operation:', error);
      setWarning('⚠️ Failed to retrieve routes. Please try again later.');
    }
  };

  return (
    <div>
      <button onClick={callMyFunction}>Get Route</button>
      {warning && <div className="floating-warning">{warning}</div>}
    </div>
  );
}

function DisplayRoute({routePlans, selectedPlanIndex}) {
  const [directionsDisplays, setDirectionsDisplays] = useState([]);
  const routes = useMapsLibrary('routes');
  const map = useMap();

  React.useEffect(() => {
    if (map && routePlans) {
      displayRoute(routePlans[selectedPlanIndex]);
    }
  }, [routePlans, selectedPlanIndex]);

  const displayRoute = (routeInfo) => {

    const directionsService = new routes.DirectionsService();
  
    // Clear existing directions renderers
    directionsDisplays.forEach(display => display.setMap(null));
    setDirectionsDisplays([]);
  
    const getGeographic = (location) => {
      if (location.hasOwnProperty('stop')) {
        return location.stop.centre.geographic;
      } else if (location.hasOwnProperty('origin')) {
        if (location.origin.hasOwnProperty('monument')) {
          return location.origin.monument.address.centre.geographic;
        } else if (location.origin.hasOwnProperty('point')) {
          return location.origin.point.centre.geographic;
        } else {
          return location.origin.address.centre.geographic;
        }
      } else if (location.hasOwnProperty('destination')) {
        if (location.destination.hasOwnProperty('monument')) {
          return location.destination.monument.address.centre.geographic;
        } else if (location.destination.hasOwnProperty('point')) {
          return location.destination.point.centre.geographic;
        } else {
          return location.destination.address.centre.geographic;
        }
      }
      return null;
    };
  
    const newDirectionsDisplays = [];
    let skipSeg = false;
  
    routeInfo.segments.forEach((segment, index) => {
      console.log(segment);
      if (!skipSeg) {
        if (segment.type === 'walk' || segment.type === 'transfer') {
          const fromGeographic = getGeographic(segment.from);
          const toGeographic = getGeographic(segment.to);
          const request = {
            origin: { lat: parseFloat(fromGeographic.latitude), lng: parseFloat(fromGeographic.longitude) },
            destination: { lat: parseFloat(toGeographic.latitude), lng: parseFloat(toGeographic.longitude) },
            travelMode: 'WALKING'
          };
    
          const polylineOptionsThis = (segment.type === 'walk' || segment.type === 'transfer') ? polylineOptions : {};
    
          const directionsDisplay = new routes.DirectionsRenderer({
            map: map,
            polylineOptions: polylineOptionsThis
          });
          newDirectionsDisplays.push(directionsDisplay);
    
          directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              directionsDisplay.setDirections(result);
            }
          });
        } else if (segment.type === 'ride') {
          let nextSeg = routeInfo.segments[index + 1];
          if (nextSeg.type === 'ride') {
            nextSeg = routeInfo.segments[index + 2];
            skipSeg = true;
          }
          const toGeographic = getGeographic(nextSeg.from);
          const prevSeg = routeInfo.segments[index - 1];
          const fromGeographic = getGeographic(prevSeg.to);
    
          const request = {
            origin: { lat: parseFloat(fromGeographic.latitude), lng: parseFloat(fromGeographic.longitude) },
            destination: { lat: parseFloat(toGeographic.latitude), lng: parseFloat(toGeographic.longitude) },
            travelMode: 'TRANSIT',
            transitOptions: {
              routingPreference: 'LESS_WALKING'
            }
          };
    
          const directionsDisplay = new routes.DirectionsRenderer({ map: map });
          newDirectionsDisplays.push(directionsDisplay);
    
          directionsService.route(request, (result, status) => {
            if (status === 'OK') {
              directionsDisplay.setDirections(result);
            }
          });
        }
      } else {
        skipSeg = false;
      }

    });
  
    setDirectionsDisplays(newDirectionsDisplays);
  };
}

const getShelterClass = (shelterType) => {
  switch (shelterType) {
    case 'Heated Shelter':
      return 'shelter-heated';
    case 'Unheated Shelter':
      return 'shelter-unheated';
    case 'Unsheltered':
      return 'shelter-unsheltered';
    default:
      return '';
  }
};

function RouteCards({ routePlans, routeScores, setSelected }) {
  const cards = [];

  for (let i = 0; i < routeScores.length; i++) {
    const thisRoutePlan = routePlans[routeScores[i].planId - 1];
    let routeText = thisRoutePlan.segments.map((segment, index) => {
      let segmentText = '';
      const startTime = segment.times?.start?.substring(11, 16)
      if (segment.type === 'ride') {
        segmentText = (
          <div key={index} className="segment">
            ● <strong>Ride:</strong> (<i>{startTime}</i>) {segment.times.durations.riding} min, Bus: {segment.route.key}
          </div>
        );
      } else if (segment.type === 'walk') {
        segmentText = (
          <div key={index} className="segment">
            ● <strong>Walk:</strong> (<i>{startTime}</i>) {segment.times.durations.walking} min
            {segment.to?.stop?.shelter && (
              <span className={getShelterClass(segment.to.stop.shelter)}>
                {' '}
                ({segment.to.stop.shelter})
              </span>
            )}
          </div>
        );
      } else if (segment.type === 'transfer') {
        segmentText = (
          <div key={index} className="segment">
            ● <strong>Transfer:</strong> (<i>{startTime}</i>) Walking: {segment.times.durations.walking} min, Waiting: {segment.times.durations.waiting} min
            {segment.to?.stop?.shelter && (
              <span className={getShelterClass(segment.to.stop.shelter)}>
                {' '}
                ({segment.to.stop.shelter})
              </span>
            )}
          </div>
        );
      }
      return segmentText;
    });

    cards.push({
      id: i + 1,
      title: 'Route ' + (i + 1),
      description: (
        <div>
          <div><strong>Score:</strong> {routeScores[i].score.toFixed(2)}</div>
          <div><strong>Time Outside:</strong> {routeScores[i].totalTimeOutside} min ({routeScores[i].totalTimeSheltered} min sheltered)</div>
          <div className="segments">{routeText}</div>
        </div>
      ),
    });
  }

  const handleClick = (index) => {
    setSelected(routeScores[index - 1].planId - 1);
  };

  return (
    <div className="cards-container">
      {cards.map((card) => (
        <div key={card.id} className="card" onClick={() => handleClick(card.id)}>
          <h2>{card.title}</h2>
          <div>{card.description}</div>
        </div>
      ))}
    </div>
  );
}

export default App;
