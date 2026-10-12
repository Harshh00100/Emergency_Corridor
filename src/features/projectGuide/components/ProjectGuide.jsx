const GUIDE_PAGES = {
  'how-it-works': {
    eyebrow: 'Project guide',
    title: 'How the corridor is assembled',
    intro: 'The workspace combines map endpoints, public routing data, deterministic scoring, and an operator-controlled simulation into one reviewable workflow.',
    sections: [
      { number: '01', title: 'Define the trip', body: 'Set a pickup on the map, choose a receiving hospital within 2 km, or switch to manual selection when the operational destination is outside the radius.' },
      { number: '02', title: 'Build candidate corridors', body: 'The routing service returns alternate driving geometries. Each candidate is displayed with its baseline time, distance, congestion estimate, and affected events.' },
      { number: '03', title: 'Review the recommendation', body: 'The scoring model normalizes the available candidates and ranks them. The recommendation is a review aid, not an autonomous dispatch decision.' },
      { number: '04', title: 'Coordinate and simulate', body: 'Operators can log a nearby signal-clearance request, add simulated events, and run ambulance movement to observe how the recommendation changes.' }
    ]
  },
  'operator-guide': {
    eyebrow: 'Operator guide',
    title: 'A repeatable dispatch review',
    intro: 'Use the console in order so each decision has a visible input, status, and history entry.',
    sections: [
      { number: 'A', title: 'Prepare', body: 'Place the pickup first. Confirm the receiving hospital and inspect the source badge before reviewing corridors.' },
      { number: 'B', title: 'Coordinate', body: 'Check the nearest traffic signal found within 2 km and send a clearance alert when the signal workflow is required. The current build records this request for integration.' },
      { number: 'C', title: 'Reconsider', body: 'Add an event at a real map position or use the midpoint shortcut. Review the updated recommendation and affected incidents before switching.' },
      { number: 'D', title: 'Record', body: 'The session history records endpoint changes, route decisions, incidents, signal requests, and simulation milestones for review.' }
    ]
  },
  'data-and-safety': {
    eyebrow: 'Data and safety',
    title: 'Know what the system is using',
    intro: 'Every external and simulated input has a visible boundary so operators can distinguish a map estimate from a live operational signal.',
    sections: [
      { number: 'OSM', title: 'Map and facilities', body: 'OpenStreetMap supplies map tiles, hospital points, and mapped traffic signals when available. Records can be incomplete or stale.' },
      { number: 'OSRM', title: 'Route geometry', body: 'OSRM supplies public route alternatives. The service does not provide a live emergency corridor or guaranteed traffic-light priority.' },
      { number: 'SIM', title: 'Scenario controls', body: 'Congestion, incidents, ambulance movement, and clearance alerts are simulated in the browser session. They do not affect public infrastructure.' },
      { number: 'LOG', title: 'Decision record', body: 'The browser history is a review aid for this demonstration. Production deployment would need authenticated users, a durable audit log, and an approved signal-management integration.' }
    ]
  }
};

export const ProjectGuide = ({ page }) => {
  const content = GUIDE_PAGES[page] || GUIDE_PAGES['how-it-works'];
  return (
    <main className="project-guide" aria-labelledby="project-guide-title">
      <div className="project-guide-header">
        <div><p className="eyebrow">{content.eyebrow}</p><h2 id="project-guide-title">{content.title}</h2><p>{content.intro}</p></div>
        <span className="guide-page-count">{Object.keys(GUIDE_PAGES).indexOf(page) + 1} / {Object.keys(GUIDE_PAGES).length}</span>
      </div>
      <div className="guide-section-grid">
        {content.sections.map((section) => <article className="guide-section-card" key={section.number}><span className="guide-section-number">{section.number}</span><h3>{section.title}</h3><p>{section.body}</p></article>)}
      </div>
      <section className="guide-callout"><strong>Design principle</strong><p>Keep the operator in control. The console explains its sources and calculations, asks for confirmation before route changes, and labels simulated actions instead of presenting them as live emergency commands.</p></section>
    </main>
  );
};
