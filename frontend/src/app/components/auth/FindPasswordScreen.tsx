import { useState } from 'react';

export default function FindPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // 실제로는 서버에 요청을 보내야 합니다
      setIsEmailSent(true);
    }
  };

  return (
    <div className="bg-white size-full flex flex-col px-6 py-12">
      <button
        onClick={onBack}
        className="text-[#2d3748] mb-8 text-left text-lg"
        style={{ fontWeight: 500 }}
      >
        ← 돌아가기
      </button>

      <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>비밀번호 찾기</h1>
          <p className="text-[#718096] text-base">가입 시 사용한 이메일을 입력해주세요</p>
        </div>

        {!isEmailSent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm"
              style={{ fontWeight: 500 }}
            >
              비밀번호 재설정 링크 보내기
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-[#f7fafc] p-8 rounded-2xl border border-[#e2e8f0]">
              <div className="text-5xl mb-6">✉️</div>
              <p className="text-[#718096] mb-2">비밀번호 재설정 링크를</p>
              <p className="text-xl text-[#2d3748] mb-2" style={{ fontWeight: 600 }}>{email}</p>
              <p className="text-[#718096] mb-4">으로 전송했습니다.</p>
              <p className="text-sm text-[#a0aec0] mt-6">
                이메일을 확인하고 링크를 클릭하여<br />
                비밀번호를 재설정해주세요.
              </p>
            </div>

            <button
              onClick={onBack}
              className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors shadow-sm"
              style={{ fontWeight: 500 }}
            >
              로그인하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
