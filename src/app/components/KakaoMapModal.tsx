import { useEffect, useRef, useState } from "react";
import { X, Search, MapPin } from "lucide-react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface KakaoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string, lat: number, lng: number) => void;
}

export default function KakaoMapModal({
  isOpen,
  onClose,
  onSelectAddress,
}: KakaoMapModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const [map, setMap] = useState<any>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedAddress, setSelectedAddress] = useState("");
  const [selectedCoords, setSelectedCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [isKakaoLoaded, setIsKakaoLoaded] = useState(false);

  // 카카오맵 스크립트 로드
  useEffect(() => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => setIsKakaoLoaded(true));
      return;
    }

    const handleScriptLoad = () => {
      window.kakao.maps.load(() => {
        console.log("카카오맵 로드 완료");
        setIsKakaoLoaded(true);
      });
    };

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src*="dapi.kakao.com"]`);
    if (existingScript) {
      existingScript.addEventListener("load", handleScriptLoad, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=7e9bc3aa2da453cb1966f25b7230c34c&libraries=services&autoload=false`;
    script.async = true;
    script.onload = handleScriptLoad;
    document.head.appendChild(script);
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isOpen || !isKakaoLoaded || !mapRef.current || !window.kakao?.maps)
      return;

    const container = mapRef.current;
    const options = {
      center: new window.kakao.maps.LatLng(37.5665, 126.978), // 서울 시청 기본 좌표
      level: 3,
    };

    const newMap = new window.kakao.maps.Map(container, options);
    setMap(newMap);

    // 지도 클릭 이벤트
    window.kakao.maps.event.addListener(
      newMap,
      "click",
      function (mouseEvent: any) {
        const latlng = mouseEvent.latLng;

        // 좌표로 주소 정보 가져오기
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(
          latlng.getLng(),
          latlng.getLat(),
          (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const address = result[0].address.address_name;
              setSelectedAddress(address);
              setSelectedCoords({ lat: latlng.getLat(), lng: latlng.getLng() });

              // 마커 표시 - 기존 마커가 있으면 위치만 변경
              if (markerRef.current) {
                markerRef.current.setPosition(latlng);
              } else {
                markerRef.current = new window.kakao.maps.Marker({
                  position: latlng,
                  map: newMap,
                });
              }
            }
          },
        );
      },
    );
  }, [isOpen, isKakaoLoaded]);

  // 주소 검색
  const handleSearch = () => {
    if (!map || !searchKeyword.trim()) return;

    const ps = new window.kakao.maps.services.Places();

    ps.keywordSearch(searchKeyword, (data: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        // 검색된 첫 번째 장소로 이동
        const firstPlace = data[0];
        const coords = new window.kakao.maps.LatLng(firstPlace.y, firstPlace.x);

        map.setCenter(coords);

        // 현재 위치에 마커 표시 - 기존 마커가 있으면 위치만 변경
        if (markerRef.current) {
          markerRef.current.setPosition(coords);
        } else {
          markerRef.current = new window.kakao.maps.Marker({
            position: coords,
            map: map,
          });
        }

        setSelectedAddress(firstPlace.address_name);
        setSelectedCoords({
          lat: parseFloat(firstPlace.y),
          lng: parseFloat(firstPlace.x),
        });
      } else {
        alert("검색 결과가 없습니다.");
      }
    });
  };

  // 현재 위치 가져오기
  const handleGetCurrentLocation = () => {
    if (!map) return;

    if (!navigator.geolocation) {
      setLocationStatus("브라우저가 위치 정보를 지원하지 않습니다.");
      alert("브라우저가 위치 정보를 지원하지 않습니다.");
      return;
    }

    setLocationStatus("위치 파악 중...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // 지도 중심을 현재 위치로 이동
        const coords = new window.kakao.maps.LatLng(latitude, longitude);
        map.setCenter(coords);

        if (markerRef.current) {
          markerRef.current.setPosition(coords);
        } else {
          markerRef.current = new window.kakao.maps.Marker({
            position: coords,
            map: map,
          });
        }

        // 좌표로 주소 정보 가져오기
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(
          longitude,
          latitude,
          (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const address = result[0].address.address_name;
              setSelectedAddress(address);
              setSelectedCoords({ lat: latitude, lng: longitude });
              setLocationStatus("✓ 현재 위치를 찾았습니다");
            } else {
              setLocationStatus("주소를 가져올 수 없습니다");
            }
          },
        );
      },
      (error) => {
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              "위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
            break;
          default:
            errorMessage = "알 수 없는 오류가 발생했습니다.";
        }
        setLocationStatus(`오류: ${errorMessage}`);
        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const handleConfirm = () => {
    if (selectedAddress && selectedCoords) {
      onSelectAddress(selectedAddress, selectedCoords.lat, selectedCoords.lng);
      onClose();
    } else {
      alert("주소를 선택해주세요. 지도를 클릭하거나 검색하세요.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-[#e2e8f0]">
          <h2 className="text-2xl text-[#2d3748]" style={{ fontWeight: 600 }}>
            주소 검색
          </h2>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-[#2d3748] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 검색 바 */}
        <div className="p-6 border-b border-[#e2e8f0]">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder="주소 또는 장소명을 입력하세요"
              className="flex-1 px-4 py-3 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-3 rounded-2xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635] transition-colors"
              style={{ fontWeight: 500 }}
            >
              <Search size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={handleGetCurrentLocation}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] transition-colors"
              style={{ fontWeight: 500 }}
            >
              <MapPin size={18} />
              <span>현재 위치로 이동</span>
            </button>
            {locationStatus && (
              <p className="text-sm text-[#718096]">{locationStatus}</p>
            )}
          </div>
        </div>

        {/* 지도 영역 */}
        <div className="p-6 flex-1 overflow-hidden">
          <div
            ref={mapRef}
            className="w-full h-full rounded-2xl border border-[#e2e8f0]"
            style={{ minHeight: "400px" }}
          />
        </div>

        {/* 선택된 주소 표시 */}
        {selectedAddress && (
          <div className="px-6 py-4 bg-[#f7fafc] border-t border-[#e2e8f0]">
            <p className="text-sm text-[#718096] mb-1">선택된 주소</p>
            <p className="text-base text-[#2d3748]" style={{ fontWeight: 500 }}>
              {selectedAddress}
            </p>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex gap-3 p-6 border-t border-[#e2e8f0]">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3.5 rounded-2xl border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] transition-colors"
            style={{ fontWeight: 500 }}
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-6 py-3.5 rounded-2xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635] transition-colors"
            style={{ fontWeight: 500 }}
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  );
}
