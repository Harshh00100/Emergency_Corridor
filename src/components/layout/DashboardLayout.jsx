export const DashboardLayout = ({ header, children }) => (
  <div className="application-shell">
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    {header}
    <main id="workspace" tabIndex="-1" className="dashboard-main">{children}</main>
    <section className="legal-placeholders" aria-label="Deployment legal information">
      <details id="terms"><summary>Terms of Service, deployment placeholder</summary><p>This engineering demonstration has no operational service agreement. Terms covering permitted use, service limitations, and operator responsibilities must be supplied and reviewed by the deployment owner before public deployment.</p></details>
      <details id="privacy"><summary>Privacy Policy, deployment placeholder</summary><p>Scenarios, routes, incidents, progress, and history are automatically saved in this browser. A named snapshot is stored separately. Use browser site-data controls to erase both copies. Exported files and share links contain the scenario. Endpoint coordinates are sent to OSRM, the configured map area is sent to Overpass, and tile requests go to OpenStreetMap servers. These services receive network metadata such as your IP address. Offline demo mode uses bundled samples. A deployment-specific privacy policy must be supplied by the owner.</p></details>
    </section>
    <footer className="app-footer">
      <span>Demonstration prototype, not for real emergency dispatch decisions.</span>
      <span><a href="#terms">Terms of Service</a> · <a href="#privacy">Privacy Policy</a></span>
    </footer>
  </div>
);
