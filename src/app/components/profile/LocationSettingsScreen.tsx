import { useState, useEffect } from 'react';
import { X, MapPin, Map } from 'lucide-react';
import KakaoMapModal from '../KakaoMapModal';
import { API_ENDPOINTS, apiRequest } from '../../api/config';

declare global {
  interface Window {
    kakao: any;
  }
}

/**
 * 위치 설정 화면
 *
 * 카카오맵 API 연동 가이드:
 * 1. 카카오 Developers에서 앱 등록 및 JavaScript 키 발급 (https://developers.kakao.com/)
 * 2. MapModal 컴포넌트의 useEffect 주석 해제
 * 3. YOUR_APP_KEY를 실제 발급받은 키로 변경
 * 4. 지도가 로드되면 중앙 핀을 기준으로 도로명 주소가 자동으로 표시됩니다
 */

export default function LocationSettingsScreen({ onClose }: { onClose: () => void }) {
  const [location, setLocation] = useState('서울 강남구 테헤란로 123');
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [customLocation, setCustomLocation] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // localStorage에서 위치 설정 불러오기
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      setLocation(savedLocation);
    }

    const savedCoords = localStorage.getItem('userLocationCoords');
    if (savedCoords) {
      try {
        setLocationCoords(JSON.parse(savedCoords));
      } catch {
        localStorage.removeItem('userLocationCoords');
      }
    }
  }, []);

  const saveLocation = async (
    address: string,
    coords?: { lat: number; lng: number } | null
  ) => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      alert('로그인 후 위치를 저장할 수 있습니다.');
      return false;
    }

    setIsSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.updateLocation, {
        method: 'PUT',
        body: JSON.stringify({
          address,
          latitude: coords?.lat,
          longitude: coords?.lng,
        }),
      });

      setLocation(address);
      localStorage.setItem('userLocation', address);

      if (coords) {
        setLocationCoords(coords);
        localStorage.setItem('userLocationCoords', JSON.stringify(coords));
      } else {
        setLocationCoords(null);
        localStorage.removeItem('userLocationCoords');
      }

      return true;
    } catch (error: any) {
      alert(error.message || '위치 저장에 실패했습니다.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomLocation = async () => {
    if (customLocation.trim()) {
      const saved = await saveLocation(customLocation, null);
      if (!saved) return;

      localStorage.removeItem('userLocationCoords');
      setLocationCoords(null);
      setCustomLocation('');
      setIsEditing(false);
    }
  };

  const handleSelectMapLocation = async (address: string, lat: number, lng: number) => {
    const coords = { lat, lng };
    const saved = await saveLocation(address, coords);
    if (saved) {
      setShowMapModal(false);
    }
  };

  const loadKakaoMaps = (): Promise<void> => {
    if (window.kakao?.maps?.services) {
      return new Promise((resolve) => {
        window.kakao.maps.load(resolve);
      });
    }

    return new Promise((resolve, reject) => {
      const handleLoad = () => {
        window.kakao.maps.load(resolve);
      };

      const existingScript = document.querySelector<HTMLScriptElement>('script[src*="dapi.kakao.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', handleLoad, { once: true });
        existingScript.addEventListener('error', () => reject(new Error('카카오맵을 불러올 수 없습니다.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = '//dapi.kakao.com/v2/maps/sdk.js?appkey=7e9bc3aa2da453cb1966f25b7230c34c&libraries=services&autoload=false';
      script.async = true;
      script.onload = handleLoad;
      script.onerror = () => reject(new Error('카카오맵을 불러올 수 없습니다.'));
      document.head.appendChild(script);
    });
  };

  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    await loadKakaoMaps();

    return new Promise((resolve, reject) => {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result: any, status: any) => {
        if (status !== window.kakao.maps.services.Status.OK || !result?.length) {
          reject(new Error('현재 위치의 주소를 찾을 수 없습니다.'));
          return;
        }

        const address =
          result[0].road_address?.address_name ||
          result[0].address?.address_name;

        if (!address) {
          reject(new Error('현재 위치의 주소를 찾을 수 없습니다.'));
          return;
        }

        resolve(address);
      });
    });
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('브라우저가 위치 정보를 지원하지 않습니다.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        try {
          const currentAddress = await getAddressFromCoords(coords.lat, coords.lng);
          const saved = await saveLocation(currentAddress, coords);
          if (saved) {
            alert(`현재 위치가 설정되었습니다:\n${currentAddress}`);
          }
        } catch (error: any) {
          alert(error.message || '현재 위치의 주소를 가져올 수 없습니다.');
        }
      },
      (error) => {
        alert('위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#e2e8f0] px-5 py-4 flex items-center justify-between">
        <button onClick={onClose} className="text-[#2d3748]">
          <X size={24} />
        </button>
        <h1 className="text-lg text-[#2d3748]" style={{ fontWeight: 600 }}>
          위치 설정
        </h1>
        <div className="w-6" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f7fafc]">
        {/* Current Location */}
        <div className="bg-white px-5 py-6 mb-2">
          <h2 className="text-sm text-[#718096] mb-3">현재 설정된 위치</h2>

          {/* Location Info */}
          <div className="flex items-center gap-3 p-4 bg-[#f0fff4] border border-[#bef264] rounded-2xl mb-3">
            <MapPin size={24} className="text-[#65a30d]" />
            <div className="flex-1">
              <p className="text-[#2d3748]" style={{ fontWeight: 600 }}>
                {location}
              </p>
              <p className="text-sm text-[#718096]">
                이 위치 기준으로 게시글이 표시됩니다
              </p>
              {locationCoords && (
                <p className="text-xs text-[#a0aec0] mt-1">
                  {locationCoords.lat.toFixed(6)}, {locationCoords.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>

          {/* Mini Map Preview */}
          <div className="relative h-40 bg-[#f7fafc] border-2 border-[#e2e8f0] rounded-2xl overflow-hidden mb-3">
            <div id="mini-kakao-map" className="absolute inset-0"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <Map size={48} className="text-[#cbd5e0] mx-auto mb-2" />
                <p className="text-sm text-[#a0aec0]">지도 미리보기</p>
              </div>
            </div>
            {/* 중앙 마커 */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-full pointer-events-none">
              <MapPin size={24} className="text-[#ef4444] fill-[#ef4444] drop-shadow-md" />
            </div>
          </div>

          {/* Map Button */}
          <button
            onClick={() => setShowMapModal(true)}
            disabled={isSaving}
            className="w-full py-3.5 bg-white border-2 border-[#bef264] text-[#65a30d] rounded-2xl hover:bg-[#f0fff4] transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            {isSaving ? '위치 저장 중...' : '🗺️ 지도에서 위치 선택하기'}
          </button>
        </div>

        {/* Current Location Button */}
        <div className="bg-white px-5 py-4 mb-2">
          <button
            onClick={handleGetCurrentLocation}
            disabled={isSaving}
            className="w-full py-3.5 bg-[#bef264] text-[#0a0a0a] rounded-2xl hover:bg-[#a3e635] transition-colors shadow-sm"
            style={{ fontWeight: 600 }}
          >
            {isSaving ? '위치 저장 중...' : '📍 현재 위치로 설정'}
          </button>
        </div>

        {/* Custom Location */}
        <div className="bg-white px-5 py-4 mb-2">
          <h2 className="text-sm text-[#718096] mb-3">주소 직접 입력</h2>
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                placeholder="예: 서울 마포구 월드컵로 240"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCustomLocation}
                  disabled={isSaving}
                  className="flex-1 py-2.5 bg-[#bef264] text-[#0a0a0a] rounded-xl hover:bg-[#a3e635] transition-colors shadow-sm"
                  style={{ fontWeight: 600 }}
                >
                  {isSaving ? '저장 중' : '확인'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setCustomLocation('');
                  }}
                  className="flex-1 py-2.5 bg-white text-[#2d3748] rounded-xl border border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors"
                  style={{ fontWeight: 500 }}
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full text-center px-4 py-3.5 rounded-2xl border-2 border-dashed border-[#e2e8f0] bg-[#f7fafc] text-[#718096] hover:border-[#bef264] hover:bg-white transition-colors"
              style={{ fontWeight: 500 }}
            >
              ✏️ 도로명 주소 입력하기
            </button>
          )}
        </div>

        <div className="mt-6 px-5 pb-6">
          <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl p-4">
            <p className="text-sm text-[#1e3a8a] mb-2">
              💡 <span style={{ fontWeight: 600 }}>도로명 주소로 설정</span>
            </p>
            <p className="text-xs text-[#1e3a8a]">
              거리 계산에 사용되며, 건물명이나 상세 주소는 표시되지 않아 개인정보가 보호됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* Full Screen Map Modal */}
      {showMapModal && (
        <KakaoMapModal
          isOpen={showMapModal}
          onClose={() => setShowMapModal(false)}
          onSelectAddress={handleSelectMapLocation}
        />
      )}
    </div>
  );
}
