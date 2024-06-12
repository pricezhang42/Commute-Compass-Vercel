import React, {useRef, useEffect, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';


// This is an example of the classic "Place Autocomplete" widget.
// https://developers.google.com/maps/documentation/javascript/place-autocomplete
export const PlaceAutocompleteClassic = ({ onPlaceSelect, currPos }) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState();
  const inputRef = useRef();
  const places = useMapsLibrary('places');
  const mapsLib = useMapsLibrary('maps');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['geometry', 'name', 'formatted_address']
    };

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });

    const bounds = new mapsLib.Circle({
      center: currPos,
      radius: 10000 // Adjust the radius as needed to cover a larger or smaller area
    }).getBounds();

    placeAutocomplete.setBounds(bounds);

  }, [onPlaceSelect, placeAutocomplete, currPos]);

  return (
    <div className="autocomplete-container">
      <input ref={inputRef} />
    </div>
  );
};