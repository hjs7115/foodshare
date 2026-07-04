import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';

type ResetStep = 'email' | 'code' | 'password';

export default function FindPasswordScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (timer <= 0) return;

    const interval = setInterval(() => {
      setTimer((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  const requestResetCode = async (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!email.trim()) {
      alert('이메일을 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest(API_ENDPOINTS.sendPasswordResetLink, {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });

      setCode('');
      setStep('code');
      setTimer(300);
      setTimeout(() => codeInputRefs.current[0]?.focus(), 0);
      alert('비밀번호 재설정 인증코드를 이메일로 보냈습니다.');
    } catch (error: any) {
      alert(error.message || '인증코드 발송에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const nextCode = Array.from({ length: 6 }, (_, codeIndex) => code[codeIndex] || '');
    nextCode[index] = digit;
    const normalizedCode = nextCode.join('').slice(0, 6);

    setCode(normalizedCode);

    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }

    if (normalizedCode.length === 6) {
      setStep('password');
    }
  };

  const handleCodeKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const submitNewPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (code.length < 4) {
      alert('인증코드를 입력해주세요.');
      setStep('code');
      return;
    }
    if (newPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          code,
          newPassword,
        }),
      });

      alert('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      onBack();
    } catch (error: any) {
      alert(error.message || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12 overflow-y-auto">
      <button
        onClick={onBack}
        className="text-[#2d3748] mb-8 text-left text-lg"
        style={{ fontWeight: 500 }}
      >
        ← 돌아가기
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto pb-8">
        {step === 'email' && (
          <div>
            <div className="text-center mb-10">
              <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>
                비밀번호 재설정
              </h1>
              <p className="text-[#718096] text-base">
                이메일 인증 후 새로운 비밀번호를 설정할 수 있습니다.
              </p>
            </div>

            <form onSubmit={requestResetCode} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  이메일 주소
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="이메일 주소를 입력해주세요."
                  className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {isSubmitting ? '전송 중...' : '인증코드 받기'}
              </button>
            </form>
          </div>
        )}

        {step === 'code' && (
          <div>
            <div className="text-center mb-10">
              <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>
                인증코드 입력
              </h1>
              <p className="text-[#718096] text-base">
                <span className="text-[#2d3748]" style={{ fontWeight: 700 }}>{email}</span>으로 인증코드를 발송했습니다.
                <br />
                이메일에서 6자리 코드를 확인해주세요.
              </p>
              {timer > 0 && (
                <p className="text-sm text-[#e53e3e] mt-3">남은 시간 {formatTime(timer)}</p>
              )}
            </div>

            <div className="flex justify-center gap-2 mb-8">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  type="text"
                  inputMode="numeric"
                  value={code[index] || ''}
                  onChange={(event) => handleCodeInput(index, event.target.value)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  className="h-16 w-12 rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] text-center text-2xl text-[#2d3748] focus:border-[#bef264] focus:outline-none"
                  maxLength={1}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => (code.length >= 4 ? setStep('password') : alert('인증코드를 입력해주세요.'))}
              className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors shadow-sm"
              style={{ fontWeight: 600 }}
            >
              다음
            </button>

            <button
              type="button"
              onClick={() => requestResetCode()}
              disabled={isSubmitting}
              className="w-full mt-4 py-3 text-[#65a30d] disabled:opacity-50"
              style={{ fontWeight: 600 }}
            >
              인증코드 다시 받기
            </button>
          </div>
        )}

        {step === 'password' && (
          <div>
            <div className="text-center mb-10">
              <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>
                비밀번호 변경
              </h1>
              <p className="text-[#718096] text-base">새로운 비밀번호를 설정해주세요.</p>
            </div>

            <form onSubmit={submitNewPassword} className="space-y-5">
              <div>
                <label htmlFor="verifiedEmail" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                  이메일 주소
                </label>
                <div className="relative">
                  <input
                    id="verifiedEmail"
                    type="email"
                    value={email}
                    readOnly
                    className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] text-[#718096]"
                  />
                  <CheckCircle size={22} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#22c55e]" />
                </div>
              </div>

              <PasswordField
                id="newPassword"
                label="비밀번호"
                value={newPassword}
                show={showPassword}
                onChange={setNewPassword}
                onToggle={() => setShowPassword(!showPassword)}
              />
              <p className="text-sm text-[#718096] -mt-2">영문, 숫자, 특수문자 포함 8자 이상</p>

              <PasswordField
                id="confirmPassword"
                label="비밀번호 확인"
                value={confirmPassword}
                show={showConfirmPassword}
                onChange={setConfirmPassword}
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-[#e53e3e]">비밀번호가 일치하지 않습니다.</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {isSubmitting ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onChange,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`${label}를 입력해주세요.`}
          className="w-full px-4 py-3.5 pr-12 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#2d3748]"
        >
          {show ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
