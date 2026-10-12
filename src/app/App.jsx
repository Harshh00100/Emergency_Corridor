import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AppHeader } from '../components/layout/AppHeader';
import { NotificationStack } from '../components/feedback/NotificationStack';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { env, environmentWarnings } from '../config/env';
import { MapView } from '../features/map/components/MapView';
import { LocationSelector } from '../features/dashboard/components/LocationSelector';
import { HospitalSelector } from '../features/hospitals/components/HospitalSelector';
import { RouteComparisonPanel } from '../features/routing/components/RouteComparisonPanel';
import { RecommendedRoutePanel } from '../features/routing/components/RecommendedRoutePanel';
import { IncidentControls } from '../features/incidents/components/IncidentControls';
import { EventHistoryPanel } from '../features/incidents/components/EventHistoryPanel';
import { SimulationControls } from '../features/simulation/components/SimulationControls';
import { TransparencyPanel } from '../features/dashboard/components/TransparencyPanel';
import { ProjectInformation } from '../features/dashboard/components/ProjectInformation';
import { TrafficSignalControls } from '../features/trafficSignals/components/TrafficSignalControls';
import { ProjectGuide } from '../features/projectGuide/components/ProjectGuide';
import { ScenarioControls } from '../features/scenarios/components/ScenarioControls';
import { useDashboard } from '../features/dashboard/hooks/useDashboard';

const PROJECT_PAGES = ['dashboard', 'how-it-works', 'operator-guide', 'data-and-safety'];
const pageFromLocation = () => PROJECT_PAGES.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : 'dashboard';

export const App = () => {
  const dashboard = useDashboard();
  const { state, hospitals, trafficSignals, nearestSignal, scoredRoutes, recommendedRoute, selectedRoute, simulation } = dashboard;
  const [projectInfoOpen, setProjectInfoOpen] = useState(false);
  const [page, setPage] = useState(pageFromLocation);
  useEffect(() => {
    const handleNavigation = () => setPage(pageFromLocation());
    window.addEventListener('hashchange', handleNavigation);
    window.addEventListener('popstate', handleNavigation);
    return () => {
      window.removeEventListener('hashchange', handleNavigation);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);
  const navigate = (nextPage) => {
    setPage(nextPage);
    if (window.location.hash !== `#${nextPage}`) window.history.pushState({}, '', `#${nextPage}`);
  };
  return (
    <DashboardLayout header={<AppHeader activePage={page} onNavigate={navigate} onOpenProjectInfo={() => setProjectInfoOpen(true)} />}>
      {page === 'dashboard' ? <>
        <div className="workspace-banner" role="note">
          <div className="workspace-banner-copy">
            <span className="workspace-banner-mark" aria-hidden="true">i</span>
            <div>
              <p className="eyebrow">Workspace status</p>
              <strong>Demonstration environment</strong>
              <p>Route estimates use public data when available. Traffic, road events, and ambulance movement are simulated. Not for emergency dispatch.</p>
            </div>
          </div>
          <div className="workspace-banner-facts"><span><b>Data</b> Public + simulated</span><span><b>Use</b> Training only</span></div>
        </div>
        {environmentWarnings.length > 0 && <p role="status" className="fallback-note">Configuration defaults applied: {environmentWarnings.join(' ')}</p>}
        <div className="dashboard-grid">
          <div className="map-column">
            <MapView center={[env.defaultMap.lat, env.defaultMap.lng]} zoom={env.defaultMap.zoom}
              offlineMode={state.offlineMode}
              pickup={state.locations.pickup} destination={state.locations.destination}
              hospitals={dashboard.mapHospitals} showHospitalRadius={dashboard.hospitalMode === 'nearby'} trafficSignals={trafficSignals.items} nearestSignalId={nearestSignal?.id} clearance={state.signalClearance}
              routes={scoredRoutes} viewportRoutes={state.routing.routes} recommendedRouteId={recommendedRoute?.id}
              selectedRouteId={selectedRoute?.id} incidents={state.incidents}
              ambulancePosition={simulation.position} simulationStatus={state.simulation.status}
              placementMode={dashboard.selectionMode} onMapClick={dashboard.onMapClick}
              onRouteSelect={dashboard.selectRoute} onHospitalSelect={dashboard.selectHospital} onRequestSignalClearance={dashboard.requestSignalClearance}
              onCancelPlacement={() => dashboard.setSelectionMode('pickup')}
              isLoading={state.routing.status === 'loading'} routeSource={state.routing.source}
            />
            <div className="map-underbar"><span><strong>Corridor status:</strong> {recommendedRoute ? 'Candidates ready for review' : 'Waiting for endpoints or route response'}</span><span>{state.incidents.length} simulated events active</span></div>
            <TransparencyPanel routeSource={state.routing.source} hospitalSource={hospitals.source} trafficSignalSource={trafficSignals.source} incidentsCount={state.incidents.length} />
            <EventHistoryPanel history={state.history} />
          </div>
          <aside className="control-column" aria-label="Dispatch controls">
            <ScenarioControls />
            <LocationSelector pickup={state.locations.pickup} destination={state.locations.destination}
              selectionMode={dashboard.selectionMode} onModeChange={dashboard.setSelectionMode}
              onSetEndpoint={dashboard.setEndpoint} onClearPickup={() => dashboard.setEndpoint('pickup', null)}
              onClearDestination={() => dashboard.setEndpoint('destination', null)} />
            <HospitalSelector hospitals={hospitals} pickup={state.locations.pickup} selectionMode={dashboard.hospitalMode} onModeChange={dashboard.setHospitalMode} selectedHospitalId={state.locations.destination?.hospitalId} selectedDestination={state.locations.destination} onSelect={dashboard.selectHospital} onRetry={dashboard.reloadHospitals} />
            <TrafficSignalControls pickup={state.locations.pickup} signals={trafficSignals} nearestSignal={nearestSignal} clearance={state.signalClearance} onRequestClearance={dashboard.requestSignalClearance} onRetry={dashboard.reloadTrafficSignals} />
            <RouteComparisonPanel routing={state.routing} routes={scoredRoutes} recommendedRouteId={recommendedRoute?.id} selectedRouteId={selectedRoute?.id} onSelect={dashboard.selectRoute} onRetry={dashboard.retryRoutes} />
            <RecommendedRoutePanel route={recommendedRoute} explanation={dashboard.explanation} source={state.routing.source} onSelect={dashboard.selectRoute} />
            <IncidentControls incidents={state.incidents} onRequestPlacement={dashboard.requestPlacement} onPlaceAtCoordinates={dashboard.addIncident} onRemoveIncident={dashboard.removeIncident} onBlockRecommended={dashboard.blockRecommended} canBlock={Boolean(recommendedRoute)} />
            <SimulationControls simulation={state.simulation} progress={simulation.progress}
              remainingDistanceMeters={simulation.remainingDistanceMeters} remainingTimeSeconds={simulation.remainingTimeSeconds}
              selectedRoute={selectedRoute} recommendedRoute={recommendedRoute} switchSuggested={dashboard.switchSuggested}
              onStart={dashboard.start} onPause={dashboard.pause} onResume={dashboard.resume} onReset={dashboard.reset}
              onSwitchRoute={() => dashboard.selectRoute(recommendedRoute.id)} onSpeedChange={dashboard.setSpeed} />
          </aside>
        </div>
      </> : <ProjectGuide page={page} />}
      <ProjectInformation open={projectInfoOpen} onClose={() => setProjectInfoOpen(false)} />
      <ConfirmDialog open={Boolean(dashboard.pendingRouteId)} title="Switch simulation corridor?"
        message="This prototype restarts movement at the pickup on the new route and pauses. It does not calculate a connecting road route from the current position. Select Resume after switching."
        confirmLabel="Switch and restart at pickup" onConfirm={dashboard.confirmSwitch} onCancel={dashboard.cancelSwitch} />
      <NotificationStack />
    </DashboardLayout>
  );
};
