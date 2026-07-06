import { showConfirm } from '../utils/feedback';
﻿import { useState, useEffect } from 'react';
import { API_BASE_URL, testServerConnection } from '../api/config';

export default function ServerConnectionCheck({ children }: { children: React.ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setIsChecking(true);
    setError(null);

    try {
      const connected = await testServerConnection();
      setIsConnected(connected);

      if (!connected) {
        setError('백엔드 서버에 연결할 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message);
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  // 연결 확인 중
  if (isChecking) {
    return (
      <div className="size-full flex items-center justify-center bg-[#f7fafc]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bef264] mx-auto mb-4"></div>
          <p className="text-[#2d3748]">서버 연결 확인 중...</p>
          <p className="text-sm text-[#718096] mt-2">{API_BASE_URL}</p>
        </div>
      </div>
    );
  }

  // 연결 실패
  if (!isConnected) {
    return (
      <div className="size-full flex items-center justify-center bg-[#f7fafc] p-6 overflow-y-auto">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg p-6 my-8">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 600 }}>
              백엔드 서버 연결 실패
            </h2>
            <p className="text-sm text-[#718096]">
              백엔드 서버에 연결할 수 없습니다
            </p>
          </div>

          <div className="bg-[#fff5f5] border border-[#feb2b2] rounded-xl p-4 mb-6">
            <p className="text-sm text-[#e53e3e] mb-3" style={{ fontWeight: 500 }}>
              {error || '서버가 응답하지 않습니다'}
            </p>
            <div className="text-xs text-[#718096] space-y-1">
              <p>• 서버 주소: <span className="font-mono bg-[#f7fafc] px-2 py-1 rounded">{API_BASE_URL}</span></p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#f0f9ff] border border-[#bfdbfe] rounded-xl p-4">
              <p className="text-sm text-[#2d3748] mb-3" style={{ fontWeight: 500 }}>
                🔍 빠른 확인:
              </p>
              <div className="space-y-2">
                <div className="text-xs text-[#475569]">
                  <p className="font-mono bg-white px-2 py-1 rounded mb-1">
                    curl http://localhost:8080
                  </p>
                  <p className="text-[#64748b]">터미널에서 실행해보세요</p>
                </div>
                <div className="text-xs text-[#475569]">
                  <p className="mb-1">브라우저 주소창에 입력:</p>
                  <p className="font-mono bg-white px-2 py-1 rounded">
                    http://localhost:8080
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#f7fafc] rounded-xl p-4">
              <p className="text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                ✅ 확인 사항:
              </p>
              <ul className="text-xs text-[#718096] space-y-1.5">
                <li className="flex items-start">
                  <span className="mr-2">1.</span>
                  <span>백엔드 서버 실행 중?</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">2.</span>
                  <span>포트 번호 8080 맞음?</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">3.</span>
                  <span>CORS 설정 되어있음?</span>
                </li>
              </ul>
            </div>
          </div>

          <details className="mb-6 bg-[#fefce8] border border-[#fde047] rounded-xl p-4">
            <summary className="cursor-pointer text-sm text-[#2d3748] font-medium">
              💡 포트가 8080이 아닌가요? (클릭하여 펼치기)
            </summary>
            <div className="mt-3 text-xs text-[#64748b] space-y-2">
              <p>백엔드가 다른 포트(예: 3000)에서 실행 중이라면:</p>
              <div className="bg-white rounded p-2 font-mono text-[10px] overflow-x-auto">
                <p className="text-[#059669]">// 파일: src/app/api/config.ts</p>
                <p className="text-[#dc2626]">- export const API_BASE_URL = "http://localhost:8080";</p>
                <p className="text-[#16a34a]">+ export const API_BASE_URL = "http://localhost:3000";</p>
              </div>
              <p className="text-[#f59e0b]">⚠️ 파일 수정 후 브라우저 새로고침 필요</p>
            </div>
          </details>

          <div className="space-y-3">
            <button
              onClick={checkConnection}
              className="w-full bg-[#bef264] text-[#0a0a0a] py-3 rounded-xl hover:bg-[#a3e635] transition-colors"
              style={{ fontWeight: 500 }}
            >
              🔄 다시 연결 시도
            </button>

            <button
              onClick={async () => {
                if (await showConfirm('서버 연결 없이 계속하면 대부분의 기능이 작동하지 않습니다.\n정말 계속하시겠습니까?', '서버 연결 없이 계속', '계속')) {
                  setIsConnected(true);
                  setError(null);
                }
              }}
              className="w-full bg-white text-[#718096] py-3 rounded-xl border border-[#e2e8f0] hover:bg-[#f7fafc] transition-colors text-sm"
            >
              ⚠️ 서버 연결 없이 계속하기 (기능 제한됨)
            </button>

            <p className="text-center text-xs text-[#94a3b8] pt-2">
              도움이 필요하면 <span className="font-mono bg-[#f1f5f9] px-1">docs/CHECK_SERVER.md</span> 파일을 참고하세요
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 연결 성공 - 정상적으로 앱 렌더링
  return <>{children}</>;
}
