import { useEffect, useState } from 'react';
import { Eye, EyeOff, Search } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import KakaoMapModal from '../KakaoMapModal';
import { clearAuthSession } from '../../auth/session';

export default function SignupScreen({
  onSignup,
  onBack,
  onShowLogin,
}: {
  onSignup: () => void;
  onBack: () => void;
  onShowLogin: () => void;
}) {
  const [name, setName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [isLoginIdChecked, setIsLoginIdChecked] = useState(false);
  const [loginIdError, setLoginIdError] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [phoneSmsUri, setPhoneSmsUri] = useState('');
  const [phoneMessage, setPhoneMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isPhoneCodeSent, setIsPhoneCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [phoneTimer, setPhoneTimer] = useState(0);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = window.setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (phoneTimer <= 0) return;
    const interval = window.setInterval(() => setPhoneTimer((prev) => prev - 1), 1000);
    return () => window.clearInterval(interval);
  }, [phoneTimer]);

  const handleLoginIdChange = (value: string) => {
    setLoginId(value);
    setIsLoginIdChecked(false);
    setLoginIdError('');
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    setIsPhoneCodeSent(false);
    setIsPhoneVerified(false);
    setPhoneVerificationCode('');
    setPhoneSmsUri('');
    setPhoneMessage('');
    setPhoneTimer(0);
  };

  const handleCheckLoginId = async () => {
    if (loginId.trim().length < 2) {
      alert('아이디는 2자 이상 입력해주세요.');
      return;
    }

    try {
      const response = await apiRequest(`${API_ENDPOINTS.checkNickname}?nickname=${encodeURIComponent(loginId.trim())}`, {
        method: 'GET',
      });
      const available = response.available ?? response.data?.available ?? response.result;

      if (available) {
        setLoginIdError('');
        setIsLoginIdChecked(true);
        alert('사용 가능한 아이디입니다.');
      } else {
        setLoginIdError('이미 사용 중인 아이디입니다.');
        setIsLoginIdChecked(false);
        alert('이미 사용 중인 아이디입니다.');
      }
    } catch (error: any) {
      alert(error.message || '아이디 중복 확인에 실패했습니다.');
    }
  };

  const handleSendCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      await apiRequest(API_ENDPOINTS.sendEmailCode, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setIsCodeSent(true);
      setTimer(300);
      alert(`${email}로 인증번호를 보냈습니다.`);
    } catch (error: any) {
      alert(error.message || '인증번호 전송에 실패했습니다.');
    }
  };

  const handleVerifyCode = async () => {
    try {
      await apiRequest(API_ENDPOINTS.verifyEmailCode, {
        method: 'POST',
        body: JSON.stringify({ email, code: verificationCode }),
      });
      setIsEmailVerified(true);
      setTimer(0);
      alert('이메일 인증이 완료되었습니다.');
    } catch (error: any) {
      alert(error.message || '인증번호가 일치하지 않습니다.');
    }
  };

  const handleSendPhoneVerification = async () => {
    if (phone.replace(/[^0-9]/g, '').length < 10) {
      alert('전화번호를 정확히 입력해주세요.');
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.sendPhoneCode, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = response.data ?? response;
      setPhoneVerificationCode(data.code || '');
      setPhoneSmsUri(data.smsUri || '');
      setPhoneMessage(data.message || '');
      setIsPhoneCodeSent(true);
      setPhoneTimer(data.expiresInSeconds || 600);

      if (data.smsUri) {
        window.location.href = data.smsUri;
      }
      alert('문자 앱이 열리면 작성된 인증 문자를 그대로 전송한 뒤, 전송 완료 확인을 눌러주세요.');
    } catch (error: any) {
      alert(error.message || '휴대폰 인증 문자 생성에 실패했습니다.');
    }
  };

  const handleVerifyPhone = async () => {
    try {
      await apiRequest(API_ENDPOINTS.verifyPhoneCode, {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: phone, code: phoneVerificationCode }),
      });
      setIsPhoneVerified(true);
      setPhoneTimer(0);
      alert('휴대폰 인증이 완료되었습니다.');
    } catch (error: any) {
      alert(error.message || '아직 인증 문자가 확인되지 않았습니다. 잠시 후 다시 눌러주세요.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoginIdChecked) {
      alert('아이디 중복 확인을 해주세요.');
      return;
    }
    if (!isEmailVerified) {
      alert('이메일 인증을 완료해주세요.');
      return;
    }
    if (!isPhoneVerified) {
      alert('휴대폰 인증을 완료해주세요.');
      return;
    }
    if (password.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (password !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await apiRequest(API_ENDPOINTS.signup, {
        method: 'POST',
        body: JSON.stringify({
          name,
          nickname: loginId.trim(),
          email,
          phone,
          address,
          latitude: addressCoords?.lat,
          longitude: addressCoords?.lng,
          password,
        }),
      });

      clearAuthSession();
      localStorage.setItem('userLocation', address);
      if (addressCoords) {
        localStorage.setItem('userLocationCoords', JSON.stringify(addressCoords));
      }

      alert('회원가입이 완료되었습니다. 아이디로 로그인해주세요.');
      onSignup();
    } catch (error: any) {
      alert(error.message || '회원가입에 실패했습니다.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12 overflow-y-auto">
      <button onClick={onBack} className="text-[#2d3748] mb-8 text-left text-lg" style={{ fontWeight: 500 }}>
        ← 돌아가기
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto pb-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>회원가입</h1>
          <p className="text-[#718096] text-base">이메일과 휴대폰 인증 후 FoodShare를 시작하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
              required
            />
          </div>

          <div>
            <label htmlFor="loginId" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>아이디</label>
            <div className="flex gap-2">
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => handleLoginIdChange(e.target.value)}
                placeholder="로그인에 사용할 아이디"
                className="flex-1 px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
              />
              <button
                type="button"
                onClick={handleCheckLoginId}
                disabled={loginId.length < 2 || isLoginIdChecked}
                className="px-4 py-3.5 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ fontWeight: 500 }}
              >
                {isLoginIdChecked ? '확인완료' : '중복확인'}
              </button>
            </div>
            {loginIdError && <p className="text-sm text-[#e53e3e] mt-2">{loginIdError}</p>}
            {isLoginIdChecked && <p className="text-sm text-[#65a30d] mt-2">사용 가능한 아이디입니다.</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>이메일</label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsCodeSent(false);
                  setIsEmailVerified(false);
                  setVerificationCode('');
                }}
                placeholder="example@email.com"
                className="flex-1 px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
                disabled={isEmailVerified}
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isEmailVerified || !email}
                className="px-4 py-3.5 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ fontWeight: 500 }}
              >
                {isEmailVerified ? '인증완료' : isCodeSent ? '재전송' : '인증번호'}
              </button>
            </div>
          </div>

          {isCodeSent && !isEmailVerified && (
            <div>
              <label htmlFor="verificationCode" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                이메일 인증번호 {timer > 0 && <span className="text-[#e53e3e]">({formatTime(timer)})</span>}
              </label>
              <div className="flex gap-2">
                <input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="인증번호 6자리"
                  className="flex-1 px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                  maxLength={6}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length < 4}
                  className="px-4 py-3.5 rounded-2xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={{ fontWeight: 500 }}
                >
                  확인
                </button>
              </div>
            </div>
          )}

          {isEmailVerified && (
            <div className="px-4 py-3 rounded-2xl bg-[#f0fff4] border border-[#bef264]">
              <p className="text-sm text-[#0a0a0a]">이메일 인증이 완료되었습니다.</p>
            </div>
          )}

          <div>
            <label htmlFor="phone" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>전화번호</label>
            <div className="flex gap-2">
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01012345678"
                className="flex-1 px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
                disabled={isPhoneVerified}
              />
              <button
                type="button"
                onClick={handleSendPhoneVerification}
                disabled={isPhoneVerified || phone.replace(/[^0-9]/g, '').length < 10}
                className="px-4 py-3.5 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                style={{ fontWeight: 500 }}
              >
                {isPhoneVerified ? '인증완료' : isPhoneCodeSent ? '문자 다시 열기' : '휴대폰 인증'}
              </button>
            </div>
          </div>

          {isPhoneCodeSent && !isPhoneVerified && (
            <div className="space-y-3 px-4 py-3 rounded-2xl bg-[#f7fafc] border border-[#e2e8f0]">
              <p className="text-sm text-[#2d3748]">
                문자 앱에서 아래 인증 문구가 수신용 이메일로 전송되면 서버가 발신 번호를 확인합니다.
                {phoneTimer > 0 && <span className="text-[#e53e3e]"> ({formatTime(phoneTimer)})</span>}
              </p>
              {phoneMessage && (
                <div className="text-sm text-[#4a5568] bg-white rounded-xl px-3 py-2 break-all">
                  {phoneMessage}
                </div>
              )}
              <div className="flex gap-2">
                {phoneSmsUri && (
                  <a
                    href={phoneSmsUri}
                    className="flex-1 text-center px-4 py-3 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264]"
                    style={{ fontWeight: 500 }}
                  >
                    문자 앱 열기
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleVerifyPhone}
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#bef264] text-[#0a0a0a] hover:bg-[#a3e635]"
                  style={{ fontWeight: 500 }}
                >
                  전송 완료 확인
                </button>
              </div>
            </div>
          )}

          {isPhoneVerified && (
            <div className="px-4 py-3 rounded-2xl bg-[#f0fff4] border border-[#bef264]">
              <p className="text-sm text-[#0a0a0a]">휴대폰 인증이 완료되었습니다.</p>
            </div>
          )}

          <div>
            <label htmlFor="address" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>주소</label>
            <div className="flex gap-2">
              <input
                id="address"
                type="text"
                value={address}
                placeholder="주소를 검색하세요"
                className="flex-1 px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                readOnly
                required
              />
              <button
                type="button"
                onClick={() => setIsMapModalOpen(true)}
                className="px-4 py-3.5 rounded-2xl bg-white border border-[#e2e8f0] text-[#2d3748] hover:border-[#bef264] transition-colors"
                style={{ fontWeight: 500 }}
              >
                <Search size={20} />
              </button>
            </div>
          </div>

          <PasswordInput
            id="password"
            label="비밀번호"
            value={password}
            onChange={setPassword}
            show={showPassword}
            onToggle={() => setShowPassword(!showPassword)}
            placeholder="8자 이상 입력하세요"
          />

          <PasswordInput
            id="confirmPassword"
            label="비밀번호 확인"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirmPassword}
            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
            placeholder="비밀번호를 다시 입력하세요"
          />

          {confirmPassword && password !== confirmPassword && (
            <p className="text-sm text-[#e53e3e]">비밀번호가 일치하지 않습니다.</p>
          )}
          {confirmPassword && password === confirmPassword && (
            <p className="text-sm text-[#65a30d]">비밀번호가 일치합니다.</p>
          )}

          <button type="submit" className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm" style={{ fontWeight: 500 }}>
            회원가입
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#718096]">
            이미 계정이 있으신가요?{' '}
            <button onClick={onShowLogin} className="text-[#65a30d] underline">로그인</button>
          </p>
        </div>
      </div>

      <KakaoMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectAddress={(selectedAddress, lat, lng) => {
          setAddress(selectedAddress);
          setAddressCoords({ lat, lng });
        }}
      />
    </div>
  );
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  show,
  onToggle,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
          required
        />
        <button type="button" onClick={onToggle} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#2d3748]">
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
