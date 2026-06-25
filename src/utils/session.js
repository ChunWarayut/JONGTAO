// A stable per-browser id used to claim temporary table holds. It lets the server
// tell "this is the same customer keeping their table" apart from "someone else".
const KEY = 'jongtao_session';

export function getSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID && crypto.randomUUID()) ||
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}
