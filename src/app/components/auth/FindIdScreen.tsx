export default function FindIdScreen({onBack}:{onBack:()=>void}) {
 return <div className="flex h-full flex-col bg-white px-6 py-12"><button onClick={onBack} className="mb-8 text-left">← 로그인으로 돌아가기</button><main className="mx-auto max-w-md"><h1 className="mb-5 text-2xl font-bold">가입 이메일 확인 안내</h1><p className="text-sm leading-7 text-gray-700">현재 전화번호 본인인증을 제공하지 않아 이름과 연락처만으로 가입 이메일을 공개하지 않습니다. 가입할 때 받은 ‘반띵 이메일 인증’ 메일을 메일함에서 검색해주세요. 비밀번호를 잊었다면 로그인 화면의 비밀번호 찾기에서 이메일 인증으로 변경할 수 있습니다.</p></main></div>;
}
