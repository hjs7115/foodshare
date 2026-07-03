import { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';

export default function FindPasswordScreen({ onBack }: { onBack: () => void }) {
  const [loginId, setLoginId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isResetDone, setIsResetDone] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await apiRequest(API_ENDPOINTS.sendPasswordResetLink, {
        method: 'POST',
        body: JSON.stringify({ loginId, name }),
      });
      setIsCodeSent(true);
      alert('해당 계정의 이메일로 인증번호를 보냈습니다.');
    } catch (error: any) {
      alert(error.message || '일치하는 계정을 찾지 못했습니다.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      alert('비밀번호는 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await apiRequest(API_ENDPOINTS.resetPassword, {
        method: 'POST',
        body: JSON.stringify({ loginId, name, code, newPassword }),
      });
      setIsResetDone(true);
    } catch (error: any) {
      alert(error.message || '비밀번호 재설정에 실패했습니다.');
    }
  };

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12">
      <button onClick={onBack} className="text-[#2d3748] mb-8 text-left text-lg" style={{ fontWeight: 500 }}>
        ← 돌아가기
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>비밀번호 찾기</h1>
          <p className="text-[#718096] text-base">아이디와 이름 확인 후 이메일 인증번호를 보냅니다</p>
        </div>

        {isResetDone ? (
          <div className="text-center space-y-6">
            <div className="bg-[#f7fafc] p-8 rounded-2xl border border-[#e2e8f0]">
              <p className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 600 }}>비밀번호가 변경되었습니다.</p>
              <p className="text-sm text-[#718096]">새 비밀번호로 로그인해주세요.</p>
            </div>
            <button onClick={onBack} className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors shadow-sm" style={{ fontWeight: 500 }}>
              로그인하기
            </button>
          </div>
        ) : (
          <form onSubmit={isCodeSent ? handleResetPassword : handleSendCode} className="space-y-5">
            <div>
              <label htmlFor="loginId" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>아이디</label>
              <input
                id="loginId"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
                disabled={isCodeSent}
              />
            </div>

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
                disabled={isCodeSent}
              />
            </div>

            {isCodeSent && (
              <>
                <div>
                  <label htmlFor="code" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>인증번호</label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="인증번호 6자리"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                    maxLength={6}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>새 비밀번호</label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="8자 이상 입력하세요"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>새 비밀번호 확인</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="새 비밀번호를 다시 입력하세요"
                    className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                    required
                  />
                </div>
              </>
            )}

            <button type="submit" className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm" style={{ fontWeight: 500 }}>
              {isCodeSent ? '비밀번호 재설정' : '인증번호 보내기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
