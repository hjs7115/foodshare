import { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin, Search, X } from 'lucide-react';
import { showToast } from '../utils/feedback';

declare global {
  interface Window {
    kakao?: any;
  }
}

interface KakaoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, lat: number, lng: number) => void;
}

const KAKAO_MAP_APP_KEY =
  import.meta.env.VITE_KAKAO_MAP_APP_KEY || import.meta.env.VITE_KAKAO_MAP_KEY;

let kakaoMapsLoader: Promise<void> | null = null;

function getKakaoMapLoadError() {
  return `카카오맵 SDK 로드에 실패했습니다. Kakao Developers의 JavaScript 플랫폼에 현재 도메인(${window.location.origin})을 등록해주세요.`;
}

function clearKakaoScript() {
  document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]')?.remove();
  delete window.kakao;
}

export function loadKakaoMaps() {
  if (!KAKAO_MAP_APP_KEY) {
    return Promise.reject(
      new Error('카카오맵 JavaScript 키가 설정되지 않았습니다. .env에 VITE_KAKAO_MAP_APP_KEY를 추가해주세요.')
    );
  }

  if (window.kakao?.maps?.services) {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => reject(new Error('카카오맵 SDK 초기화가 지연되고 있습니다.')), 10000);
      window.kakao?.maps.load(() => {
        window.clearTimeout(timeoutId);
        resolve();
      });
    });
  }

  if (kakaoMapsLoader) {
    return kakaoMapsLoader;
  }

  kakaoMapsLoader = new Promise<void>((resolve, reject) => {
    document.querySelector<HTMLScriptElement>('script[data-kakao-map-sdk="true"]')?.remove();
    const timeoutId = window.setTimeout(() => {
      clearKakaoScript();
      reject(new Error('카카오맵 SDK 응답이 지연되고 있습니다. 도메인 등록 후 프론트 서버와 브라우저를 새로고침해주세요.'));
    }, 10000);

    const completeLoad = () => {
      if (!window.kakao?.maps) {
        window.clearTimeout(timeoutId);
        reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
        return;
      }

      window.kakao.maps.load(() => {
        window.clearTimeout(timeoutId);
        if (window.kakao?.maps?.services) {
          resolve();
          return;
        }
        reject(new Error('카카오맵 services 라이브러리를 사용할 수 없습니다.'));
      });
    };

    const script = document.createElement('script');
    script.dataset.kakaoMapSdk = 'true';
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_APP_KEY}&libraries=services&autoload=false`;
    script.async = true;
    script.onload = completeLoad;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      clearKakaoScript();
      reject(new Error(getKakaoMapLoadError()));
    };
    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapsLoader = null;
    throw error;
  });

  return kakaoMapsLoader;
}

export default function KakaoMapModal({
  isOpen,
  onClose,
  onSelectAddress,
}: KakaoMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isUsingFallbackLocation, setIsUsingFallbackLocation] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadError('');
    setIsKakaoLoaded(false);
    setMap(null);
    setSelectedAddress('');
    setSelectedCoords(null);
    setManualAddress('');
    setLocationStatus('');
    markerRef.current = null;

    loadKakaoMaps()
      .then(() => {
        if (!cancelled) {
          setIsKakaoLoaded(true);
        }
      })
      .catch((error: Error) => {
        if (!cancelled) {
          setLoadError(error.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isKakaoLoaded || !mapRef.current || !window.kakao?.maps) return;

    const initialCenter = new window.kakao.maps.LatLng(37.5665, 126.978);
    const newMap = new window.kakao.maps.Map(mapRef.current, {
      center: initialCenter,
      level: 3,
    });

    setMap(newMap);

    window.kakao.maps.event.addListener(newMap, 'click', (mouseEvent: any) => {
      const latlng = mouseEvent.latLng;
      const geocoder = new window.kakao.maps.services.Geocoder();

      geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
        if (status !== window.kakao.maps.services.Status.OK || !result?.length) return;

        setPickedLocation(newMap, latlng, result[0].road_address?.address_name || result[0].address.address_name);
      });
    });

    window.setTimeout(() => newMap.relayout(), 0);
  }, [isOpen, isKakaoLoaded]);

  const setPickedLocation = (targetMap: any, coords: any, address: string) => {
    if (markerRef.current) {
      markerRef.current.setPosition(coords);
    } else {
      markerRef.current = new window.kakao.maps.Marker({
        position: coords,
        map: targetMap,
      });
    }

    setSelectedAddress(address);
    setSelectedCoords({
      lat: coords.getLat(),
      lng: coords.getLng(),
    });
  };

  const handleSearch = () => {
    if (!map || !searchKeyword.trim() || !window.kakao?.maps?.services) return;

    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(searchKeyword.trim(), (data: any[], status: any) => {
      if (status !== window.kakao.maps.services.Status.OK || !data?.length) {
        showToast('검색 결과가 없습니다.');
        return;
      }

      const firstPlace = data[0];
      const coords = new window.kakao.maps.LatLng(Number(firstPlace.y), Number(firstPlace.x));
      map.setCenter(coords);
      setPickedLocation(map, coords, firstPlace.address_name || firstPlace.road_address_name || firstPlace.place_name);
    });
  };

  const handleGetCurrentLocation = () => {
    if (!map || !window.kakao?.maps?.services) return;

    if (!navigator.geolocation) {
      const message = '브라우저가 위치 정보를 지원하지 않습니다.';
      setLocationStatus(message);
      showToast(message);
      return;
    }

    setLocationStatus('위치 확인 중...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const coords = new window.kakao.maps.LatLng(latitude, longitude);
        const geocoder = new window.kakao.maps.services.Geocoder();

        map.setCenter(coords);
        geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK && result?.length) {
            setPickedLocation(map, coords, result[0].road_address?.address_name || result[0].address.address_name);
            setLocationStatus('현재 위치를 찾았습니다.');
            return;
          }
          setLocationStatus('현재 위치의 주소를 가져올 수 없습니다.');
        });
      },
      (error) => {
        const message = getGeolocationErrorMessage(error);
        setLocationStatus(`오류: ${message}`);
        showToast(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleFallbackSelect = () => {
    const address = manualAddress.trim();
    if (!address) {
      showToast('주소를 입력해주세요.');
      return;
    }

    if (!navigator.geolocation) {
      showToast('브라우저가 위치 정보를 지원하지 않습니다.');
      return;
    }

    setIsUsingFallbackLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onSelectAddress(address, position.coords.latitude, position.coords.longitude);
        setIsUsingFallbackLocation(false);
        onClose();
      },
      (error) => {
        setIsUsingFallbackLocation(false);
        showToast(getGeolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleConfirm = () => {
    if (!selectedAddress || !selectedCoords) {
      showToast('주소를 선택해주세요. 지도를 클릭하거나 검색해보세요.');
      return;
    }

    onSelectAddress(selectedAddress, selectedCoords.lat, selectedCoords.lng);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e2e8f0] p-6">
          <h2 className="text-2xl text-[#2d3748]" style={{ fontWeight: 600 }}>
            주소 검색
          </h2>
          <button onClick={onClose} className="text-[#718096] transition-colors hover:text-[#2d3748]" aria-label="지도 닫기">
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-[#e2e8f0] p-6">
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
              placeholder="주소 또는 장소명을 입력하세요"
              className="min-w-0 flex-1 rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3 outline-none focus:border-[#bef264]"
            />
            <button
              onClick={handleSearch}
              className="rounded-2xl bg-[#bef264] px-6 py-3 text-[#0a0a0a] transition-colors hover:bg-[#a3e635]"
              style={{ fontWeight: 500 }}
              aria-label="주소 검색"
            >
              <Search size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleGetCurrentLocation}
              disabled={!map}
              className="flex items-center gap-2 rounded-2xl border border-[#e2e8f0] bg-white px-4 py-2 text-[#2d3748] transition-colors hover:border-[#bef264] disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <MapPin size={18} />
              <span>현재 위치로 이동</span>
            </button>
            {locationStatus && <p className="min-w-0 text-right text-sm text-[#718096]">{locationStatus}</p>}
          </div>
        </div>

        <div className="min-h-[400px] flex-1 overflow-hidden p-6">
          {loadError ? (
            <div className="flex min-h-[400px] flex-col justify-center rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-6">
              <div className="mb-5 text-center">
                <AlertCircle size={34} className="mx-auto mb-3 text-[#ef4444]" />
                <p className="text-sm leading-6 text-[#991b1b]">{loadError}</p>
                <p className="mt-3 text-xs leading-5 text-[#7f1d1d]">
                  카카오 Developers의 JavaScript 플랫폼에 현재 도메인
                  <br />
                  <span className="font-mono">{window.location.origin}</span>
                  <br />
                  이 등록되어 있는지 확인해주세요.
                </p>
              </div>

              <div className="rounded-2xl border border-[#fed7d7] bg-white p-4">
                <p className="mb-3 text-sm text-[#2d3748]" style={{ fontWeight: 600 }}>
                  지도 없이 현재 위치로 저장
                </p>
                <input
                  value={manualAddress}
                  onChange={(event) => setManualAddress(event.target.value)}
                  placeholder="예: 서울 광진구 화양동"
                  className="mb-3 w-full rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3 text-sm outline-none focus:border-[#bef264]"
                />
                <button
                  onClick={handleFallbackSelect}
                  disabled={isUsingFallbackLocation}
                  className="w-full rounded-2xl bg-[#bef264] px-4 py-3 text-[#0a0a0a] transition-colors hover:bg-[#a3e635] disabled:opacity-60"
                  style={{ fontWeight: 600 }}
                >
                  {isUsingFallbackLocation ? '현재 위치 확인 중...' : '입력한 주소와 현재 위치로 저장'}
                </button>
              </div>
            </div>
          ) : !isKakaoLoaded ? (
            <div className="flex h-[400px] items-center justify-center rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] text-sm text-[#718096]">
              카카오맵을 불러오는 중입니다.
            </div>
          ) : (
            <div ref={mapRef} className="h-full min-h-[400px] w-full rounded-2xl border border-[#e2e8f0]" />
          )}
        </div>

        {selectedAddress && (
          <div className="border-t border-[#e2e8f0] bg-[#f7fafc] px-6 py-4">
            <p className="mb-1 text-sm text-[#718096]">선택한 주소</p>
            <p className="text-base text-[#2d3748]" style={{ fontWeight: 500 }}>
              {selectedAddress}
            </p>
          </div>
        )}

        <div className="flex gap-3 border-t border-[#e2e8f0] p-6">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[#e2e8f0] px-6 py-3.5 text-[#2d3748] transition-colors hover:border-[#bef264]"
            style={{ fontWeight: 500 }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-2xl bg-[#bef264] px-6 py-3.5 text-[#0a0a0a] transition-colors hover:bg-[#a3e635]"
            style={{ fontWeight: 500 }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}

function getGeolocationErrorMessage(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
    case error.POSITION_UNAVAILABLE:
      return '위치 정보를 사용할 수 없습니다.';
    case error.TIMEOUT:
      return '위치 정보 요청 시간이 초과되었습니다.';
    default:
      return '알 수 없는 위치 오류가 발생했습니다.';
  }
}
