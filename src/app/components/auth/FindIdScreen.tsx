import { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';

export default function FindIdScreen({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await apiRequest(API_ENDPOINTS.findEmail, {
        method: 'POST',
        body: JSON.stringify({ name, phone, phoneNumber: phone, mobileNum: phone }),
      });

      const email = response.email || response.data?.email || response.data;
      setFoundEmail(String(email || '가입된 이메일을 찾지 못했습니다.'));
    } catch (error: any) {
      alert(error.message || '이메일 찾기에 실패했습니다.');
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
          <h1 className="text-4xl mb-3 text-[#2d3748]" style={{ fontWeight: 600 }}>이메일 찾기</h1>
          <p className="text-[#718096] text-base">가입할 때 입력한 이름과 전화번호를 입력해주세요</p>
        </div>

        {!foundEmail ? (
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
              <label htmlFor="phone" className="block text-sm text-[#2d3748] mb-2" style={{ fontWeight: 500 }}>
                전화번호
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="01012345678"
                className="w-full px-4 py-3.5 rounded-2xl border border-[#e2e8f0] focus:border-[#bef264] focus:outline-none bg-[#f7fafc]"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors mt-8 shadow-sm"
              style={{ fontWeight: 500 }}
            >
              이메일 찾기
            </button>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-[#f7fafc] p-8 rounded-2xl border border-[#e2e8f0]">
              <p className="text-[#718096] mb-3">회원님의 이메일은</p>
              <p className="text-2xl text-[#2d3748] break-all" style={{ fontWeight: 600 }}>{foundEmail}</p>
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
