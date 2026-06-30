import { useState } from 'react';

export default function FindIdScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [foundId, setFoundId] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && email) {
      // 실제로는 서버에 요청을 보내야 합니다
      setFoundId('user@example.com');
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
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>아이디 찾기</h1>
          <p className="text-[#718096] text-base">가입 시 입력한 정보를 입력해주세요</p>
        </div>

        {!foundId ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                이름
              </label>
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
              아이디 찾기
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-[#f7fafc] p-8 rounded-2xl border border-[#e2e8f0]">
              <p className="text-[#718096] mb-3">회원님의 아이디는</p>
              <p className="text-2xl text-[#2d3748]" style={{ fontWeight: 600 }}>{foundId}</p>
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
