export default function LandingScreen({ onShowLogin, onShowSignup }: { onShowLogin: () => void; onShowSignup: () => void }) {
  return (
    <div className="bg-white size-full flex flex-col items-center justify-between px-6 py-16">
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
        <div className="text-center">
          <h1 className="text-7xl mb-4">🥬</h1>
          <h2 className="text-5xl text-[#2d3748] mb-3 mt-8" style={{ fontWeight: 600 }}>반 띵</h2>
          <p className="text-[#718096] text-lg">식재료를 이웃과 나누세요</p>
        </div>

        <div className="space-y-3 pt-12 w-full">
          <button
            onClick={onShowLogin}
            className="w-full bg-[#bef264] text-[#0a0a0a] py-4 rounded-2xl hover:bg-[#a3e635] transition-colors shadow-sm"
            style={{ fontWeight: 500 }}
          >
            로그인
          </button>

          <button
            onClick={onShowSignup}
            className="w-full bg-white text-[#2d3748] py-4 rounded-2xl border-2 border-[#bef264] hover:bg-[#f0fff4] transition-colors"
            style={{ fontWeight: 500 }}
          >
            회원가입
          </button>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-[#a0aec0]">
          음식물 쓰레기를 줄이고<br />
          이웃과 함께 나누는 문화를 만들어가요
        </p>
      </div>
    </div>
  );
}