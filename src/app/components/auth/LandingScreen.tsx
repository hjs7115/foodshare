import { useState } from 'react';
import { ShoppingBasket } from 'lucide-react';
import brandMarkUrl from '../../../assets/brand-mark.png';

export default function LandingScreen({
  onShowLogin,
  onShowSignup,
}: {
  onShowLogin: () => void;
  onShowSignup: () => void;
}) {
  const [brandImageFailed, setBrandImageFailed] = useState(false);

  return (
    <div className="bg-white size-full flex flex-col items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-3xl border border-[#e2e8f0] bg-white px-6 py-12 shadow-sm">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="text-center">
            <div className="mx-auto flex h-32 w-44 items-start justify-center overflow-hidden" role="img" aria-label="반띵 식재료 바구니 로고">
              {brandImageFailed ? (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-[#ecfccb] text-[#65a30d]">
                  <ShoppingBasket size={72} strokeWidth={1.8} aria-hidden="true" />
                </div>
              ) : (
                <img
                  src={brandMarkUrl}
                  alt=""
                  className="block h-auto w-full shrink-0 object-contain"
                  onError={() => setBrandImageFailed(true)}
                />
              )}
            </div>
            <h2 className="mt-2 mb-3 text-4xl text-[#2d3748]" style={{ fontWeight: 700 }}>반띵</h2>
            <p className="text-[#718096] text-lg">식재료를 이웃과 나누세요</p>
          </div>

          <div className="space-y-3 pt-10 w-full">
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

        <div className="text-center mt-10">
          <p className="text-sm text-[#a0aec0]">
            음식물 쓰레기를 줄이고<br />
            이웃과 함께 나누는 문화를 만들어가요
          </p>
        </div>
      </section>
    </div>
  );
}
