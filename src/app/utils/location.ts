export function saveLocationFromUser(user: any) {
  const address = user?.location || user?.address;
  if (typeof address === 'string' && address.trim() && address !== '미정') localStorage.setItem('userLocation', address.trim());
  else localStorage.removeItem('userLocation');
  if (Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude)) {
    localStorage.setItem('userLocationCoords', JSON.stringify({lat:user.latitude,lng:user.longitude}));
  } else localStorage.removeItem('userLocationCoords');
  window.dispatchEvent(new Event('location-updated'));
}
export function currentLocation() { return localStorage.getItem('userLocation') || '위치 미정'; }
export function hasLocationCoordinates() {
  try { const v=JSON.parse(localStorage.getItem('userLocationCoords') || 'null'); return Number.isFinite(v?.lat) && Number.isFinite(v?.lng); } catch { return false; }
}
