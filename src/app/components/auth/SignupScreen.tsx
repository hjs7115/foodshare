import { useEffect, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff, Search, X } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import KakaoMapModal from '../KakaoMapModal';
import { clearAuthSession } from '../../auth/session';
import { showToast } from '../../utils/feedback';

const PASSWORD_REQUIREMENT_MESSAGE = '영문, 숫자, 특수문자 포함 8자 이상';

type SignupStep = 1 | 2 | 3 | 4;
type TermKey = 'service' | 'api' | 'privacy';

const TERMS: Record<TermKey, { title: string; summary: string; content: string[] }> = {
  service: {
    title: '반띵 서비스 이용약관',
    summary: '서비스 이용 목적, 회원 의무, 게시글 운영 기준을 확인합니다.',
    content: [
      '회원은 반띵에서 제공하는 공동구매, 나눔, 판매 서비스를 관련 법령과 서비스 운영정책에 따라 이용해야 합니다.',
      '허위 정보 등록, 타인의 권리 침해, 부적절한 거래 유도, 서비스 운영을 방해하는 행위는 제한될 수 있습니다.',
      '서비스 안정성 향상과 이용자 보호를 위해 게시글, 댓글, 신고 내역 등 필요한 정보를 운영 기준에 따라 확인할 수 있습니다.',
    ],
  },
  api: {
    title: '반띵 API 이용약관',
    summary: '앱 기능 연동과 위치 기반 서비스 이용에 필요한 API 약관입니다.',
    content: [
      '앱은 이메일 인증, 위치 검색, 알림, 게시글 등록 등 주요 기능 제공을 위해 백엔드 API와 외부 연동 API를 사용할 수 있습니다.',
      'API 응답 지연, 네트워크 오류, 외부 서비스 장애가 발생할 경우 일부 기능 이용이 일시적으로 제한될 수 있습니다.',
      '사용자는 API 연동 기능을 악용하거나 비정상적인 자동 요청으로 서비스 품질을 저하시켜서는 안 됩니다.',
    ],
  },
  privacy: {
    title: '개인정보 수집 및 이용동의',
    summary: '회원가입과 동네 기반 서비스 제공을 위해 필요한 개인정보 항목입니다.',
    content: [
      '수집 항목은 이메일, 비밀번호, 이름, 닉네임, 전화번호, 주소 및 위치 좌표이며 회원 식별과 서비스 제공에 사용됩니다.',
      '개인정보는 회원 탈퇴 또는 수집 목적 달성 시 지체 없이 파기하며, 관계 법령에 따라 보관이 필요한 정보는 해당 기간 동안 보관합니다.',
      '필수 개인정보 수집 및 이용에 동의하지 않을 경우 회원가입과 서비스 이용이 제한될 수 있습니다.',
    ],
  },
};

function isValidPassword(password: string) {
  return password.length >= 8
    && /[A-Za-z]/.test(password)
    && /[0-9]/.test(password)
    && /[^A-Za-z0-9]/.test(password);
}

function includesAny(value: string | undefined, patterns: string[]) {
  const normalized = (value || '').toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

function isDuplicateEmailError(message?: string) {
  return includesAny(message, ['Email already exists', '이미 사용 중인 이메일', '이미 가입된 이메일']);
}

function isDuplicatePhoneError(message?: string) {
  return includesAny(message, ['Phone number already exists', '이미 사용 중인 전화번호', '이미 가입된 전화번호']);
}

function isDuplicateNicknameError(message?: string) {
  return includesAny(message, ['Nickname already exists', '이미 사용 중인 닉네임', '중복된 닉네임']);
}

export default function SignupScreen({
  onSignup,
  onBack,
  onShowLogin,
}: {
  onSignup: () => void;
  onBack: () => void;
  onShowLogin: () => void;
}) {
  const [step, setStep] = useState<SignupStep>(1);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [isNicknameChecked, setIsNicknameChecked] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [address, setAddress] = useState('');
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [timer, setTimer] = useState(0);
  const [agreedTerms, setAgreedTerms] = useState<Record<TermKey, boolean>>({
    service: false,
    api: false,
    privacy: false,
  });
  const [activeTerms, setActiveTerms] = useState<TermKey | null>(null);

  const allTermsAgreed = Object.values(agreedTerms).every(Boolean);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const passwordRequirements = [
    { label: '8자 이상', checked: password.length >= 8 },
    { label: '영문', checked: /[A-Za-z]/.test(password) },
    { label: '숫자', checked: /[0-9]/.test(password) },
    { label: '특수문자', checked: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleSendCode = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.');
      return;
    }

    try {
      setEmailError('');
      await apiRequest(API_ENDPOINTS.sendEmailCode, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      setIsCodeSent(true);
      setTimer(300);
      setStep(2);
      showToast(`${email}으로 인증번호가 전송되었습니다.`);
    } catch (error: any) {
      if (isDuplicateEmailError(error.message)) {
        setEmailError('이미 가입된 이메일입니다.');
        return;
      }
      showToast(error.message || '인증번호 전송에 실패했습니다.');
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
      setStep(3);
      showToast('이메일 인증이 완료되었습니다.');
    } catch (error: any) {
      showToast(error.message || '인증번호가 일치하지 않습니다.');
    }
  };

  const handleCheckNickname = async () => {
    if (!nickname.trim()) {
      setNicknameError('닉네임을 입력해주세요.');
      return;
    }

    try {
      const response = await apiRequest(`${API_ENDPOINTS.checkNickname}?nickname=${encodeURIComponent(nickname)}`, {
        method: 'GET',
      });

      const available = response.available ?? response.data?.available ?? response.result;

      if (available) {
        setNicknameError('');
        setIsNicknameChecked(true);
      } else {
        setNicknameError('이미 사용 중인 닉네임입니다.');
        setIsNicknameChecked(false);
      }
    } catch (error: any) {
      if (isDuplicateNicknameError(error.message)) {
        setNicknameError('이미 사용 중인 닉네임입니다.');
        setIsNicknameChecked(false);
        return;
      }
      showToast(error.message || '닉네임 중복 확인에 실패했습니다.');
    }
  };

  const handleNicknameChange = (value: string) => {
    setNickname(value);
    setIsNicknameChecked(false);
    setNicknameError('');
  };

  const validateMemberInfo = () => {
    if (!name.trim()) {
      showToast('이름을 입력해주세요.');
      return false;
    }
    if (!phone.trim()) {
      setPhoneError('전화번호를 입력해주세요.');
      return false;
    }
    if (!address.trim()) {
      showToast('주소를 검색해주세요.');
      return false;
    }
    if (!isValidPassword(password)) {
      showToast(`비밀번호는 ${PASSWORD_REQUIREMENT_MESSAGE}이어야 합니다.`);
      return false;
    }
    if (password !== confirmPassword) {
      showToast('비밀번호가 일치하지 않습니다.');
      return false;
    }
    if (!allTermsAgreed) {
      showToast('필수 이용약관에 모두 동의해주세요.');
      return false;
    }
    return true;
  };

  const handleGoNicknameStep = () => {
    if (validateMemberInfo()) {
      setStep(4);
    }
  };

  const handleSubmit = async () => {
    if (!isEmailVerified) {
      showToast('이메일 인증을 완료해주세요.');
      setStep(isCodeSent ? 2 : 1);
      return;
    }
    if (!validateMemberInfo()) {
      setStep(3);
      return;
    }
    if (!isNicknameChecked) {
      showToast('닉네임 중복확인을 해주세요.');
      return;
    }

    try {
      setEmailError('');
      setPhoneError('');
      setNicknameError('');
      await apiRequest(API_ENDPOINTS.signup, {
        method: 'POST',
        body: JSON.stringify({
          name,
          nickname,
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

      showToast('회원가입이 완료되었습니다!');
      onSignup();
    } catch (error: any) {
      if (isDuplicateEmailError(error.message)) {
        setEmailError('이미 가입된 이메일입니다.');
        setStep(1);
      } else if (isDuplicatePhoneError(error.message)) {
        setPhoneError('이미 가입된 전화번호입니다.');
        setStep(3);
      } else if (isDuplicateNicknameError(error.message)) {
        setNicknameError('이미 사용 중인 닉네임입니다.');
        setIsNicknameChecked(false);
        setStep(4);
      } else if (error.message?.includes('password') || error.message?.includes('비밀번호')) {
        showToast('비밀번호는 8자 이상이어야 합니다.');
      } else {
        showToast(error.message || '회원가입에 실패했습니다.');
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleAllTerms = (checked: boolean) => {
    setAgreedTerms({
      service: checked,
      api: checked,
      privacy: checked,
    });
  };

  const toggleTerm = (key: TermKey) => {
    setAgreedTerms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderStepHeader = (title: string, description?: string) => (
    <div className="text-center mb-9">
      <p className="text-[#65a30d] text-base mb-4" style={{ fontWeight: 700 }}>{step} / 4</p>
      <h1 className="text-4xl text-[#2d3748] mb-3 leading-tight" style={{ fontWeight: 600 }}>{title}</h1>
      {description && <p className="text-[#718096] text-base leading-6">{description}</p>}
    </div>
  );

  const renderFieldLabel = (htmlFor: string, label: string) => (
    <label htmlFor={htmlFor} className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
      {label}
    </label>
  );

  const inputClassName = 'w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc] text-[#2d3748] placeholder:text-[#a0aec0]';
  const primaryButtonClassName = 'w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm';

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12 overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto pb-8">
        <button
          onClick={step === 1 ? onBack : () => setStep((prev) => Math.max(1, prev - 1) as SignupStep)}
          className="text-[#2d3748] mb-8 text-left text-lg"
          style={{ fontWeight: 500 }}
        >
          ← 돌아가기
        </button>

        {step === 1 && (
          <section className="rounded-3xl border border-[#e2e8f0] bg-white px-6 py-10 shadow-sm">
            {renderStepHeader('이메일 주소로 회원가입', '이메일 인증 후 회원가입을 완료할 수 있습니다.')}
            <div className="space-y-7">
              <div>
                {renderFieldLabel('email', '이메일 주소')}
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setEmailError('');
                    setIsCodeSent(false);
                    setIsEmailVerified(false);
                    setVerificationCode('');
                  }}
                  placeholder="이메일 주소를 입력해주세요."
                  className={inputClassName}
                  disabled={isEmailVerified}
                />
                {emailError && <p className="mt-2 text-sm text-[#ff6b6b]">{emailError}</p>}
              </div>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={!email}
                className={primaryButtonClassName}
                style={{ fontWeight: 800 }}
              >
                인증코드 받기
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="rounded-3xl border border-[#e2e8f0] bg-white px-6 py-10 shadow-sm">
            {renderStepHeader(
              '인증코드 입력',
              `${email}으로 인증코드를 발송했습니다. 이메일에서 6자리 코드를 확인해주세요.`,
            )}
            <div className="space-y-8">
              <input
                id="verificationCode"
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-5 py-4 text-center text-3xl tracking-[0.5em] text-[#2d3748] placeholder:text-[#cbd5e0] focus:border-[#bef264] focus:outline-none"
                maxLength={6}
              />

              {timer > 0 && (
                <p className="text-center text-sm text-[#718096]">남은 시간 {formatTime(timer)}</p>
              )}

              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verificationCode.length < 6}
                className={primaryButtonClassName}
                style={{ fontWeight: 800 }}
              >
                인증하기
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                className="w-full text-[#65a30d] text-base"
                style={{ fontWeight: 800 }}
              >
                인증코드 다시 받기
              </button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="rounded-3xl border border-[#e2e8f0] bg-white px-6 py-9 shadow-sm">
            {renderStepHeader('회원정보 입력', '회원가입에 필요한 정보를 입력해주세요.')}
            <div className="space-y-6">
              <div>
                {renderFieldLabel('verifiedEmail', '이메일 주소')}
                <div className="relative">
                  <input
                    id="verifiedEmail"
                    type="email"
                    value={email}
                    className={`${inputClassName} pr-14 text-[#718096]`}
                    readOnly
                  />
                  <span className="absolute right-4 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-[#bef264] text-[#0a0a0a]">
                    <Check size={18} strokeWidth={3} />
                  </span>
                </div>
                {emailError && <p className="mt-2 text-sm text-[#ff6b6b]">{emailError}</p>}
              </div>

              <div>
                {renderFieldLabel('name', '이름')}
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름을 입력해주세요."
                  className={inputClassName}
                />
              </div>

              <div>
                {renderFieldLabel('phone', '전화번호')}
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setPhoneError('');
                  }}
                  placeholder="01012345678"
                  className={inputClassName}
                />
                {phoneError && <p className="mt-2 text-sm text-[#ff6b6b]">{phoneError}</p>}
              </div>

              <div>
                {renderFieldLabel('address', '주소')}
                <div className="flex gap-2">
                  <input
                    id="address"
                    type="text"
                    value={address}
                    placeholder="주소를 검색해주세요."
                    className={`${inputClassName} flex-1`}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(true)}
                    className="flex size-[54px] shrink-0 items-center justify-center rounded-2xl border border-[#e2e8f0] bg-white text-[#2d3748] hover:border-[#bef264] transition-colors"
                    aria-label="주소 검색"
                  >
                    <Search size={22} />
                  </button>
                </div>
              </div>

              <div>
                {renderFieldLabel('password', '비밀번호')}
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호를 입력해주세요."
                    className={`${inputClassName} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#2d3748]"
                    aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {passwordRequirements.map((requirement) => (
                    <div
                      key={requirement.label}
                      className={`flex items-center gap-1.5 text-xs ${
                        requirement.checked ? 'text-[#65a30d]' : 'text-[#718096]'
                      }`}
                    >
                      <span className={`size-3 rounded-full border ${
                        requirement.checked ? 'border-[#bef264] bg-[#bef264]' : 'border-[#cbd5e0]'
                      }`} />
                      {requirement.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {renderFieldLabel('confirmPassword', '비밀번호 확인')}
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="비밀번호를 재입력"
                    className={`${inputClassName} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#2d3748]"
                    aria-label={showConfirmPassword ? '비밀번호 확인 숨기기' : '비밀번호 확인 보기'}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <label className="flex items-center gap-3 text-[#2d3748]" style={{ fontWeight: 700 }}>
                  <input
                    type="checkbox"
                    checked={allTermsAgreed}
                    onChange={(event) => toggleAllTerms(event.target.checked)}
                    className="size-6 rounded border-[#cbd5e0] accent-[#bef264]"
                  />
                  모든 필수 이용약관에 동의합니다.
                </label>

                {(Object.keys(TERMS) as TermKey[]).map((key) => (
                  <div key={key} className="flex items-center gap-3 pl-5">
                    <input
                      type="checkbox"
                      checked={agreedTerms[key]}
                      onChange={() => toggleTerm(key)}
                      className="size-5 rounded border-[#cbd5e0] accent-[#bef264]"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveTerms(key)}
                      className="flex flex-1 items-center justify-between gap-2 text-left text-[#718096]"
                    >
                      <span>{TERMS[key].title} (필수)</span>
                      <ChevronRight size={18} className="text-[#a0aec0]" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleGoNicknameStep}
                className={primaryButtonClassName}
                style={{ fontWeight: 800 }}
              >
                다음
              </button>

            </div>
          </section>
        )}

        {step === 4 && (
          <section className="rounded-3xl border border-[#e2e8f0] bg-white px-6 py-10 shadow-sm">
            {renderStepHeader('닉네임 설정', '앱에서 사용할 닉네임을 정해주세요.')}
            <div className="mb-8 flex justify-center">
              <div className="flex size-24 items-center justify-center rounded-full bg-[#bef264] text-[#0a0a0a]">
                <Check size={58} strokeWidth={3.5} />
              </div>
            </div>

            <div className="space-y-7">
              <div>
                {renderFieldLabel('nickname', '닉네임')}
                <div className="flex gap-2">
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => handleNicknameChange(event.target.value)}
                    placeholder="닉네임을 입력해주세요."
                    className={`${inputClassName} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleCheckNickname}
                    disabled={nickname.length < 2 || isNicknameChecked}
                    className="shrink-0 rounded-2xl border border-[#e2e8f0] bg-white px-4 text-[#2d3748] hover:border-[#bef264] disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ fontWeight: 800 }}
                  >
                    {isNicknameChecked ? '완료' : '확인'}
                  </button>
                </div>
                {nicknameError && <p className="mt-2 text-sm text-[#ff6b6b]">{nicknameError}</p>}
                {isNicknameChecked && <p className="mt-2 text-sm text-[#65a30d]">사용 가능한 닉네임입니다.</p>}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!isNicknameChecked}
                className={primaryButtonClassName}
                style={{ fontWeight: 800 }}
              >
                회원가입 완료
              </button>
            </div>
          </section>
        )}

        <div className="text-center mt-6">
          <p className="text-sm text-[#718096]">
            이미 계정이 있으신가요?{' '}
            <button onClick={onShowLogin} className="text-[#65a30d] underline">
              로그인
            </button>
          </p>
        </div>
      </div>

      {activeTerms && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 pb-4 sm:items-center">
          <div className="max-h-[82vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl text-[#2d3748]" style={{ fontWeight: 800 }}>{TERMS[activeTerms].title}</h2>
                <p className="mt-2 text-sm leading-5 text-[#718096]">{TERMS[activeTerms].summary}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTerms(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f7fafc] text-[#718096]"
                aria-label="약관 닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              {TERMS[activeTerms].content.map((paragraph) => (
                <p key={paragraph} className="rounded-2xl bg-[#f7fafc] p-4 text-sm leading-6 text-[#4a5568]">
                  {paragraph}
                </p>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setAgreedTerms((prev) => ({ ...prev, [activeTerms]: true }));
                setActiveTerms(null);
              }}
              className={`${primaryButtonClassName} mt-6`}
              style={{ fontWeight: 800 }}
            >
              읽고 동의하기
            </button>
          </div>
        </div>
      )}

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
