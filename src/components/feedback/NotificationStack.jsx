import { useAppState } from '../../state/AppStateContext';
import { ACTION_TYPES as TYPES } from '../../state/actionTypes';

export const NotificationStack = () => {
  const { state, dispatch } = useAppState();
  return (
    <div className="notification-stack" aria-live="polite" aria-atomic="true">
      {state.notifications.slice(0, 1).map((notification) => (
        <div className={`notification notification-${notification.tone || 'neutral'}`} key={notification.id}>
          <div>
            <span className="eyebrow">Latest notice</span>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
          </div>
          <button type="button" className="notification-dismiss" aria-label="Dismiss notification" onClick={() => dispatch({ type: TYPES.DISMISS_NOTIFICATION, payload: notification.id })}>Close</button>
        </div>
      ))}
    </div>
  );
};
