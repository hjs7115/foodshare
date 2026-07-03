import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { registerFirebaseMessaging } from '../../firebase';
import { saveAuthSession } from '../../auth/session';

export default function LoginScreen({
  onLogin,
  onBack,
  onFindId,
  onFindPassword,
  onShowSignup,
}: {
  onLogin: () => void;
  onBack: () => void;
  onFindId: () => void;
  onFindPassword: () => void;
  onShowSignup: () => void;
}) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await apiRequest(API_ENDPOINTS.login, {
        method: 'POST',
        body: JSON.stringify({ loginId, password }),
      });

      const token = response.token || response.accessToken || response.data?.token || response.data?.accessToken;
      const user = response.user || response.data?.user || response.data;

      saveAuthSession(token || null, user, autoLogin);
      onLogin();
      void registerFirebaseMessaging();
    } catch (error: any) {
      alert(error.message || '아이디 또는 비밀번호가 일치하지 않습니다.');
    }
  };

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12">
      <button onClick={onBack} className="text-[#2d3748] mb-8 text-left text-lg" style={{ fontWeight: 500 }}>
        ← 돌아가기
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>로그인</h1>
          <p className="text-[#718096] text-base">FoodShare에 다시 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="loginId" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              아이디
            </label>
            <input
              id="loginId"
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
              비밀번호
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#2d3748]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center mt-5">
            <input
              id="autoLogin"
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => setAutoLogin(e.target.checked)}
              className="w-4 h-4 rounded border border-[#e2e8f0] text-[#bef264] focus:ring-[#bef264]"
            />
            <label htmlFor="autoLogin" className="ml-2 text-sm text-[#2d3748]">
              자동 로그인
            </label>
          </div>

          <button type="submit" className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm" style={{ fontWeight: 500 }}>
            로그인
          </button>
        </form>

        <div className="flex justify-center items-center gap-3 mt-6">
          <button type="button" onClick={onFindId} className="text-sm text-[#718096] hover:text-[#2d3748]">아이디 찾기</button>
          <span className="text-sm text-[#cbd5e0]">/</span>
          <button type="button" onClick={onFindPassword} className="text-sm text-[#718096] hover:text-[#2d3748]">비밀번호 찾기</button>
          <span className="text-sm text-[#cbd5e0]">/</span>
          <button type="button" onClick={onShowSignup} className="text-sm text-[#718096] hover:text-[#2d3748]">회원가입</button>
        </div>
      </div>
    </div>
  );
}
