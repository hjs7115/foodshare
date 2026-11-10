import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Coffee, Crosshair, MapPin, ParkingCircle, Search, Store, UtensilsCrossed, X } from 'lucide-react';
import { loadKakaoMaps } from '../KakaoMapModal';

type Position = { lat: number; lng: number };
type Place = Position & { id: string; label: string; address: string };
type Category = 'CE7' | 'FD6' | 'CS2' | 'PK6';
const chips = [
  { id: 'CE7' as Category, name: '카페', icon: Coffee },
  { id: 'FD6' as Category, name: '음식점', icon: UtensilsCrossed },
  { id: 'CS2' as Category, name: '편의점', icon: Store },
  { id: 'PK6' as Category, name: '주차장', icon: ParkingCircle },
];
function valid(value: any): value is Position {
  return Number.isFinite(value?.lat) && Number.isFinite(value?.lng)
    && value.lat >= 33 && value.lat <= 39.1 && value.lng >= 124 && value.lng <= 132;
}
function savedLocation(): Position | null {
  try {
    const parsed = JSON.parse(localStorage.getItem('userLocationCoords') || 'null');
    return valid(parsed) ? parsed : null;
  } catch { return null; }
}
function fromApi(item: any): Place | null {
  const coords = { lat: Number(item?.y), lng: Number(item?.x) };
  if (!valid(coords)) return null;
  const label = String(item?.place_name || '').trim();
  const address = String(item?.road_address_name || item?.address_name || '').trim();
  if (!label && !address) return null;
  return { ...coords, id: String(item?.id || (coords.lat + ',' + coords.lng)),
    label: label || address, address: address || label };
}
export default function ChatMapPicker({
  onClose, onSelectAddress,
}: {
  onClose: () => void;
  onSelectAddress: (address: string, lat: number, lng: number) => Promise<boolean>;
}) {
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<any>(null);
  const selectedPin = useRef<any>(null);
  const resultPins = useRef<any[]>([]);
  const mounted = useRef(true);
  const requestId = useRef(0);
  const geocodeId = useRef(0);
  const [load, setLoad] = useState<'loading' | 'ready' | 'error'>('loading');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');

  const clearPins = () => {
    for (const pin of resultPins.current) pin.setMap(null);
    resultPins.current = [];
  };
  const choose = (place: Place) => {
    geocodeId.current++;
    const k = window.kakao;
    if (!map.current || !k?.maps || !valid(place)) return;
    const coordinates = new k.maps.LatLng(place.lat, place.lng);
    map.current.panTo(coordinates);
    if (selectedPin.current) selectedPin.current.setPosition(coordinates);
    else selectedPin.current = new k.maps.Marker({ map: map.current, position: coordinates });
    setSelected(place);
  };
  const pickCoordinates = (lat: number, lng: number) => {
    const id = ++geocodeId.current;
    const k = window.kakao;
    if (!k?.maps?.services || !valid({ lat, lng })) return;
    const fallback = '지도에서 선택한 위치 (' + lat.toFixed(5) + ', ' + lng.toFixed(5) + ')';
    new k.maps.services.Geocoder().coord2Address(lng, lat, (items: any[], status: any) => {
      if (!mounted.current || id !== geocodeId.current) return;
      const first = status === k.maps.services.Status.OK ? items?.[0] : null;
      const address = first?.road_address?.address_name || first?.address?.address_name || fallback;
      choose({ lat, lng, id: 'pin', label: address, address });
    });
  };

  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    let currentMap: any = null;
    let clickListener: ((event: any) => void) | null = null;
    let observer: ResizeObserver | null = null;
    const saved = savedLocation();
    const start = saved || { lat: 37.5665, lng: 126.978 };
    loadKakaoMaps().then(() => {
      if (cancelled || !mounted.current || !host.current || !window.kakao?.maps?.services) return;
      const k = window.kakao;
      currentMap = new k.maps.Map(host.current, {
        center: new k.maps.LatLng(start.lat, start.lng), level: 4,
      });
      map.current = currentMap;
      clickListener = (event: any) => pickCoordinates(event.latLng.getLat(), event.latLng.getLng());
      k.maps.event.addListener(currentMap, 'click', clickListener);
      if (saved) {
        const address = (localStorage.getItem('userLocation') || '').trim();
        if (address && address !== '위치 미정')
          choose({ ...saved, id: 'mine', label: address, address });
        else pickCoordinates(saved.lat, saved.lng);
      } else {
        setLocationMessage('현재 위치 버튼을 누르거나 지도에서 장소를 선택해주세요.');
      }
      if (typeof ResizeObserver !== 'undefined' && host.current) {
        observer = new ResizeObserver(() => currentMap?.relayout());
        observer.observe(host.current);
      }
      window.requestAnimationFrame(() => currentMap?.relayout());
      setLoad('ready');
    }).catch(() => {
      if (cancelled || !mounted.current) return;
      setLoad('error');
    });
    return () => {
      cancelled = true;
      mounted.current = false;
      requestId.current++;
      geocodeId.current++;
      observer?.disconnect();
      if (currentMap && clickListener && window.kakao?.maps?.event)
        window.kakao.maps.event.removeListener(currentMap, 'click', clickListener);
      clearPins();
      selectedPin.current?.setMap(null);
      selectedPin.current = null;
      map.current = null;
    };
  }, []);

  const showResults = (items: Place[]) => {
    clearPins();
    setResults(items);
    if (!map.current || !window.kakao?.maps) return;
    for (const place of items) {
      const k = window.kakao;
      const pin = new k.maps.Marker({
        map: map.current,
        position: new k.maps.LatLng(place.lat, place.lng),
      });
      k.maps.event.addListener(pin, 'click', () => { choose(place); setResults([]); });
      resultPins.current.push(pin);
    }
  };

  const lookup = (keyword: string, code?: Category) => {
    const k = window.kakao;
    const current = map.current;
    if (!current || !k?.maps?.services) return;
    const id = ++requestId.current;
    setNotice('');
    setSearching(true);
    const places = new k.maps.services.Places();
    const callback = (rows: any[], status: any) => {
      if (!mounted.current || id !== requestId.current) return;
      if (status !== k.maps.services.Status.OK || !rows?.length) {
        if (!code) {
          // Street addresses are not always returned by place keyword search.
          new k.maps.services.Geocoder().addressSearch(keyword.trim(), (addresses: any[], addressStatus: any) => {
            if (!mounted.current || id !== requestId.current) return;
            setSearching(false);
            if (addressStatus === k.maps.services.Status.OK && addresses?.length) {
              const first = addresses[0];
              const place = fromApi({ x: first.x, y: first.y,
                place_name: first.road_address?.address_name || first.address?.address_name || first.address_name || keyword,
                address_name: first.address_name });
              if (place) { showResults([place]); return; }
            }
            showResults([]);
            setNotice('검색 결과가 없어요. 지도를 이동해 다시 검색해주세요.');
          });
          return;
        }
        setSearching(false);
        showResults([]);
        setNotice('이 주변에 선택한 종류의 장소가 없어요.');
        return;
      }
      setSearching(false);
      showResults(rows.map(fromApi).filter(Boolean) as Place[]);
    };
    if (code) {
      places.categorySearch(code, callback, {
        location: current.getCenter(), radius: 2000, size: 12,
        sort: k.maps.services.SortBy.DISTANCE,
      });
    } else {
      places.keywordSearch(keyword.trim(), callback, {
        location: current.getCenter(), size: 12,
      });
    }
  };

  const searchKeyword = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    setCategory(null);
    lookup(query);
  };
  const searchCategory = (code: Category) => {
    const next = category === code ? null : code;
    setCategory(next);
    setQuery('');
    if (next) lookup('', next);
    else {
      requestId.current++;
      setSearching(false);
      showResults([]);
    }
  };
  const locate = () => {
    if (!navigator.geolocation) {
      setNotice('이 기기에서 위치 확인을 지원하지 않습니다.');
      return;
    }
    setLocationMessage('현재 위치 확인 중...');
    navigator.geolocation.getCurrentPosition(
      position => {
        if (!mounted.current) return;
        const lat = position.coords.latitude, lng = position.coords.longitude;
        if (!valid({ lat, lng })) return;
        map.current?.setCenter(new window.kakao.maps.LatLng(lat, lng));
        pickCoordinates(lat, lng);
        setLocationMessage('현재 위치가 지도에 표시됐어요.');
      },
      () => {
        if (mounted.current) setLocationMessage('위치 권한을 확인하거나 지도에서 직접 선택해주세요.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };
  const send = async () => {
    if (!selected || sending) return;
    setNotice('');
    setSending(true);
    try {
      const ok = await onSelectAddress(selected.label, selected.lat, selected.lng);
      if (ok && mounted.current) onClose();
      else if (mounted.current) setNotice('위치를 전송하지 못했습니다. 다시 시도해주세요.');
    } catch {
      setNotice('위치를 전송하지 못했습니다. 다시 시도해주세요.');
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  const sendSearchLocation = async () => {
    const address = query.trim();
    if (!address || sending) return;
    setNotice('');
    setSending(true);
    try {
      // No invented coordinates: the existing sender uses a Kakao search link.
      const ok = await onSelectAddress(address, Number.NaN, Number.NaN);
      if (ok && mounted.current) onClose();
      else if (mounted.current) setNotice('장소를 전송하지 못했습니다. 다시 시도해주세요.');
    } catch {
      setNotice('장소를 전송하지 못했습니다. 다시 시도해주세요.');
    } finally {
      if (mounted.current) setSending(false);
    }
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="채팅 위치 공유 지도"
      className="fixed inset-0 z-[200] flex h-screen h-[100dvh] w-full flex-col overflow-hidden bg-white">
      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
        <button type="button" onClick={onClose} aria-label="뒤로가기"
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-900"><ArrowLeft size={26} /></button>
        <h1 className="text-xl font-bold text-slate-900">지도</h1>
        <button type="button" onClick={onClose} aria-label="지도 닫기"
          className="flex h-11 w-11 items-center justify-center rounded-full text-slate-900"><X size={26} /></button>
      </header>
      {notice && <p role="alert" className="shrink-0 bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p>}
      <div className="relative min-h-0 flex-1 bg-[#eef3f2]">
        <div ref={host} className="absolute inset-0 h-full w-full" aria-label="카카오 지도" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-white/90 via-white/60 to-transparent pb-5 pt-3">
          <form onSubmit={searchKeyword}
            className="pointer-events-auto mx-4 flex h-14 items-center gap-3 rounded-2xl bg-white px-4 shadow-lg">
            <Search size={23} className="shrink-0 text-slate-700" />
            <input value={query} onChange={event => setQuery(event.target.value)}
              placeholder="검색어를 입력하세요" aria-label="장소 또는 주소 검색"
              className="min-w-0 flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400" />
            {query && <button type="button" onClick={() => { setQuery(''); showResults([]); }} aria-label="검색어 지우기">
              <X size={18} className="text-slate-500" />
            </button>}
            <button type="submit" disabled={!query.trim() || load !== 'ready'}
              className="shrink-0 text-sm font-semibold text-blue-600 disabled:opacity-40">검색</button>
          </form>
          <div className="pointer-events-auto mt-3 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
            <button type="button" onClick={locate} disabled={load !== 'ready'}
              className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50">
              <Crosshair size={18} className="text-blue-600" /> 내 위치
            </button>
            {chips.map(item => {
              const Icon = item.icon;
              return <button key={item.id} type="button" onClick={() => searchCategory(item.id)}
                disabled={load !== 'ready'} aria-pressed={category === item.id}
                className={'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-sm font-semibold shadow-md disabled:opacity-50 ' +
                  (category === item.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-800')}>
                <Icon size={17} /> {item.name}
              </button>;
            })}
          </div>
          {results.length > 0 && (
            <div className="pointer-events-auto mx-4 max-h-44 overflow-y-auto rounded-2xl bg-white shadow-xl">
              {results.map(place => <button type="button" key={place.id}
                onClick={() => { choose(place); setResults([]); }}
                className="flex w-full items-start gap-2 border-b border-slate-100 px-4 py-3 text-left last:border-b-0">
                <MapPin size={18} className="mt-0.5 shrink-0 text-blue-600" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-900">{place.label}</span>
                  <span className="block truncate text-xs text-slate-500">{place.address}</span>
                </span>
              </button>)}
            </div>
          )}
          {searching && <p className="mx-4 rounded-xl bg-white px-3 py-2 text-xs text-slate-600 shadow">장소를 검색하고 있어요.</p>}
        </div>
        {load !== 'ready' && (
          <div className="absolute inset-x-6 top-1/2 z-30 -translate-y-1/2 rounded-2xl bg-white p-6 text-center shadow-xl">
            {load === 'loading' ? '카카오 지도를 불러오고 있어요.' : <>
              <p className="font-semibold text-red-700">지도를 불러오지 못했어요.</p>
              <p className="mt-2 text-sm text-slate-600">주소나 장소명을 입력하면 지도 검색 링크로 보낼 수 있어요.</p>
              <input value={query} onChange={event => setQuery(event.target.value)} maxLength={150}
                aria-label="직접 입력할 주소 또는 장소명" placeholder="예: 충주역 앞"
                className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" />
              <button type="button" onClick={sendSearchLocation} disabled={!query.trim() || sending}
                className="mt-3 w-full rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {sending ? '장소 전송 중...' : '입력한 장소 보내기'}
              </button>
            </>}
          </div>
        )}
        <button type="button" onClick={locate} disabled={load !== 'ready'} aria-label="현재 위치로 이동"
          className="absolute bottom-52 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-white text-blue-600 shadow-lg disabled:opacity-50">
          <Crosshair size={24} />
        </button>
        <div className="absolute inset-x-3 bottom-3 z-20 rounded-[24px] bg-white px-5 py-5 shadow-2xl">
          {selected ? <>
            <p className="flex items-start gap-2 text-base font-bold text-slate-900">
              <MapPin size={20} className="mt-0.5 shrink-0 text-blue-600" />{selected.label}
            </p>
            {selected.address !== selected.label && <p className="mt-1 text-sm text-slate-600">{selected.address}</p>}
          </> : <p className="text-base font-semibold text-slate-800">
            지도를 터치하거나 장소를 검색해 선택해주세요.
          </p>}
          {locationMessage && <p className="mt-1 text-xs leading-5 text-slate-500">{locationMessage}</p>}
          <button type="button" onClick={send} disabled={!selected || sending || load !== 'ready'}
            className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
            {sending ? '위치 전송 중...' : '이 위치 보내기'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
