import { Modal } from '../../../components/common/Modal';

export const ProjectInformation = ({ open, onClose }) => {
  return (
    <Modal open={open} title="Design Thinking: AI Emergency Corridor" onClose={onClose} wide>
        <div className="project-content">
          <section><h3>Problem statement</h3><p>Dispatch teams need a quick way to compare viable ambulance corridors when the shortest route is affected by congestion or a reported obstruction. This prototype makes route trade-offs visible and supports a repeatable demonstration workflow.</p></section>
          <section><h3>Target users and empathy</h3><p>Primary users are dispatch coordinators and emergency operations students. Their needs are a clear endpoint workflow, understandable recommendations, visible uncertainty, and a fast response to a simulated road event.</p></section>
          <section><h3>Define, ideate, prototype</h3><p>The define stage focuses on route selection under time pressure. Ideation explored map-based route comparison, transparent penalties, and a switch suggestion. The prototype combines public map and routing services with a local reducer and timer simulation.</p></section>
          <section><h3>Testing and iteration criteria</h3><p>Planned usability criteria, not claimed participant-study results. Observe at least five participants, record completion time and errors, then revise unclear controls.</p><ul><li>Select pickup and destination within 60 seconds without assistance.</li><li>Compare two supplied alternatives and explain the recommendation within 30 seconds.</li><li>Place a simulated blockage and identify a changed or unchanged recommendation within 45 seconds.</li><li>Complete start, pause, resume, reset, and confirmed route switch without losing track of the active route.</li><li>Correctly identify external data and simulated data before ending the task.</li></ul></section>
          <section><h3>6M framework</h3><div className="six-m-grid"><div><strong>Manpower</strong><span>Dispatcher, ambulance crew, receiving facility</span></div><div><strong>Material</strong><span>Map data, route geometry, incident inputs</span></div><div><strong>Measurement</strong><span>ETA, distance, score, task completion time</span></div><div><strong>Machine</strong><span>Browser, phone or dispatch workstation</span></div><div><strong>Method</strong><span>Compare, score, simulate, reconsider</span></div><div><strong>Mother Earth</strong><span>Shorter routes may reduce unnecessary travel and fuel use</span></div></div></section>
          <section><h3>Limitations and future scope</h3><p>Public services can be rate limited, routing is not live traffic routing, hospital information is limited to returned tags, and all incidents and movement are simulated. Future work could add a verified traffic provider, authenticated backend, historical evaluation, geofenced road matching, hospital integration, and operational safety review.</p></section>
        </div>
    </Modal>
  );
};
