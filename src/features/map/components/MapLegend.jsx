export const MapLegend = ({ showHospitalRadius }) => (
  <div className="map-legend" aria-label="Map legend">
    <span><i className="legend-swatch legend-pickup" /> Pickup</span>
    <span><i className="legend-swatch legend-destination" /> Destination</span>
    <span><i className="legend-swatch legend-recommended" /> Recommended</span>
    <span><i className="legend-swatch" /> Alternative</span>
    <span><i className="legend-swatch legend-selected" /> Selected alternative</span>
    <span><i className="legend-swatch legend-reroute" /> Blockage alternate</span>
    <span><i className="legend-hospital">H</i> Hospital</span>
    <span><i className="legend-signal" /> Traffic signal</span>
    {showHospitalRadius && <span><i className="legend-swatch legend-radius" /> 2 km pickup radius</span>}
    <span><i className="legend-ambulance" /> Ambulance simulation</span>
    <span><i className="legend-swatch legend-incident" /> Simulation event</span>
  </div>
);
