import { useState } from 'react';
import { API_BASE_URL } from '../api/config';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: string;
}

export default function BackendDiagnostic({ onClose }: { onClose: () => void }) {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...updates } : t));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);

    const initialTests: TestResult[] = [
      { name: '1. 기본 서버 연결', status: 'pending', message: '테스트 중...' },
      { name: '2. CORS 헤더 확인', status: 'pending', message: '대기 중...' },
      { name: '3. API 엔드포인트', status: 'pending', message: '대기 중...' },
    ];

    setTests(initialTests);

    // 테스트 1: 기본 연결
    try {
      console.log(`테스트 1: ${API_BASE_URL} 연결 시도...`);

      const response = await fetch(API_BASE_URL, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        mode: 'cors',
      });

      // 403 Forbidden 특수 처리
      if (response.status === 403) {
        updateTest(0, {
          status: 'error',
          message: '⛔ 접근 거부 (403 Forbidden)',
          details: `서버는 실행 중이지만 요청을 거부했습니다.\n\n해결 방법:\n1. ngrok URL이 만료됨 → 백엔드에서 새 URL 확인\n2. 백엔드 보안 설정 → 공개 API 접근 허용\n3. docs/FIX_403_ERROR.md 파일 참고`
        });

        updateTest(1, {
          status: 'error',
          message: '⏭️ 건너뜀',
          details: '403 에러로 인해 CORS 테스트를 진행할 수 없습니다.'
        });
      } else {
        updateTest(0, {
          status: 'success',
          message: `✅ 연결 성공 (상태: ${response.status})`,
          details: `서버가 응답했습니다. HTTP ${response.status}`
        });

        // 테스트 2: CORS
        const corsHeader = response.headers.get('access-control-allow-origin');
        if (corsHeader) {
          updateTest(1, {
            status: 'success',
            message: `✅ CORS 설정됨: ${corsHeader}`,
            details: 'CORS 헤더가 올바르게 설정되어 있습니다.'
          });
        } else {
          updateTest(1, {
            status: 'error',
            message: '⚠️ CORS 헤더 없음',
            details: 'Access-Control-Allow-Origin 헤더가 없습니다. 백엔드에 CORS 설정이 필요합니다.'
          });
        }
      }

    } catch (error: any) {
      console.error('테스트 1 실패:', error);

      updateTest(0, {
        status: 'error',
        message: '❌ 연결 실패',
        details: `${API_BASE_URL}에 연결할 수 없습니다.\n\n가능한 원인:\n1. 백엔드 서버가 실행되지 않음\n2. 포트 번호가 다름 (현재: 8080)\n3. 방화벽 차단`
      });

      updateTest(1, {
        status: 'error',
        message: '⏭️ 건너뜀',
        details: '서버 연결 실패로 인해 테스트를 진행할 수 없습니다.'
      });
    }

    // 테스트 3: API 엔드포인트
    try {
      console.log('테스트 3: API 엔드포인트 확인...');

      const apiUrl = `${API_BASE_URL}/api/auth/signup`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ test: true }),
        mode: 'cors',
      });

      // 403 Forbidden 특수 처리
      if (response.status === 403) {
        updateTest(2, {
          status: 'error',
          message: '⛔ API 접근 거부 (403)',
          details: `API 엔드포인트가 요청을 거부했습니다.\n\n가능한 원인:\n1. ngrok URL 만료\n2. /api/auth/signup이 인증 없이 접근 불가\n3. 백엔드 보안 설정 문제\n\n→ docs/FIX_403_ERROR.md 참고`
        });
      } else {
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          updateTest(2, {
            status: 'success',
            message: `✅ API 응답 (${response.status})`,
            details: `API가 JSON으로 응답합니다. 정상 작동 중입니다.`
          });
        } else {
          updateTest(2, {
            status: 'error',
            message: '⚠️ JSON이 아닌 응답',
            details: `Content-Type: ${contentType}\nAPI가 JSON이 아닌 형식으로 응답합니다.`
          });
        }
      }

    } catch (error: any) {
      console.error('테스트 3 실패:', error);

      updateTest(2, {
        status: 'error',
        message: '❌ API 접근 실패',
        details: error.message || 'API 엔드포인트에 접근할 수 없습니다.'
      });
    }

    setIsRunning(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl text-[#2d3748]" style={{ fontWeight: 600 }}>
            🔍 백엔드 서버 진단
          </h2>
          <button onClick={onClose} className="text-[#718096] hover:text-[#2d3748]">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-[#f0f9ff] border border-[#bfdbfe] rounded-xl p-4">
            <p className="text-sm text-[#1e40af]">
              <strong>서버 주소:</strong> <code className="bg-white px-2 py-1 rounded">{API_BASE_URL}</code>
            </p>
          </div>

          {tests.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#718096] mb-4">
                백엔드 서버 상태를 확인하려면<br />아래 버튼을 클릭하세요.
              </p>
              <button
                onClick={runDiagnostics}
                disabled={isRunning}
                className="px-6 py-3 bg-[#bef264] text-[#0a0a0a] rounded-xl hover:bg-[#a3e635] disabled:opacity-50"
                style={{ fontWeight: 500 }}
              >
                진단 시작
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className={`border rounded-xl p-4 ${
                    test.status === 'success' ? 'bg-[#f0fdf4] border-[#86efac]' :
                    test.status === 'error' ? 'bg-[#fef2f2] border-[#fca5a5]' :
                    'bg-[#f7fafc] border-[#e2e8f0]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-[#2d3748]">{test.name}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-white">
                      {test.status === 'pending' ? '⏳' : test.status === 'success' ? '✅' : '❌'}
                    </span>
                  </div>
                  <p className="text-sm text-[#2d3748] mb-2">{test.message}</p>
                  {test.details && (
                    <details className="text-xs text-[#64748b] mt-2">
                      <summary className="cursor-pointer">상세 정보</summary>
                      <pre className="mt-2 bg-white p-2 rounded whitespace-pre-wrap">{test.details}</pre>
                    </details>
                  )}
                </div>
              ))}

              <div className="flex gap-3">
                <button
                  onClick={runDiagnostics}
                  disabled={isRunning}
                  className="flex-1 px-4 py-3 bg-[#bef264] text-[#0a0a0a] rounded-xl hover:bg-[#a3e635] disabled:opacity-50"
                  style={{ fontWeight: 500 }}
                >
                  {isRunning ? '⏳ 테스트 중...' : '🔄 다시 테스트'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white text-[#2d3748] rounded-xl border border-[#e2e8f0] hover:bg-[#f7fafc]"
                >
                  닫기
                </button>
              </div>
            </div>
          )}

          {/* 도움말 */}
          <div className="border-t border-[#e2e8f0] pt-6 space-y-4">
            <h3 className="font-medium text-[#2d3748]">💡 문제 해결 방법</h3>

            <details className="text-sm">
              <summary className="cursor-pointer text-[#2d3748] font-medium mb-2">
                ❌ 연결 실패 해결 방법
              </summary>
              <div className="pl-4 space-y-2 text-[#64748b]">
                <p><strong>1. 백엔드 서버 실행 확인</strong></p>
                <pre className="bg-[#f7fafc] p-2 rounded text-xs">
터미널에서 실행:
cd backend
npm start
# 또는
./gradlew bootRun</pre>

                <p><strong>2. 포트 확인</strong></p>
                <p>현재 프론트엔드는 8080 포트로 연결을 시도합니다.</p>
                <p>백엔드가 다른 포트를 사용한다면 <code>src/app/api/config.ts</code> 파일을 수정하세요.</p>
              </div>
            </details>

            <details className="text-sm">
              <summary className="cursor-pointer text-[#2d3748] font-medium mb-2">
                ⚠️ CORS 에러 해결 방법
              </summary>
              <div className="pl-4 space-y-2 text-[#64748b]">
                <p>백엔드 코드에 CORS 설정을 추가하세요:</p>
                <pre className="bg-[#f7fafc] p-2 rounded text-xs overflow-x-auto">
{`// Express.js
const cors = require('cors');
app.use(cors({ origin: '*' }));`}</pre>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
