import {useState} from 'react';
import {API_BASE_URL,apiRequest} from '../../api/config';
import {resetDeviceSession} from '../../auth/deviceSession';
import {useNestedBack} from '../../utils/useNestedBack';
export default function WithdrawalScreen({onClose}:{onClose:()=>void}){
 const [password,setPassword]=useState('');const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useNestedBack(true,()=>{if(!busy)onClose();});
 return <div className="fixed inset-0 z-[70] overflow-y-auto bg-white p-5"><button disabled={busy} onClick={onClose} className="mb-5">닫기</button><h1 className="text-xl font-bold">회원탈퇴</h1>
 <p className="my-5 text-sm leading-7">게시글을 닫고 진행 중 요청과 거래를 종료합니다. 연락처·위치·프로필과 냉장고·장보기·요리 보관함은 삭제합니다. 거래·채팅·신고 기록은 분쟁 대응을 위해 탈퇴 사용자로 표시하여 보관합니다. 송금 금액은 자동 환불되지 않으므로 먼저 상대와 정산해주세요.</p>
 <form className="max-w-md space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  await apiRequest(API_BASE_URL+'/api/account',{method:'DELETE',body:JSON.stringify({password,confirmed})});await resetDeviceSession();localStorage.removeItem('userLocation');localStorage.removeItem('userLocationCoords');window.location.assign('/app');
 }catch(e:any){setError(e.message||'탈퇴하지 못했습니다.');setBusy(false);}}}>
 <label className="block text-sm">현재 비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border p-3"/></label>
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>안내와 거래 정산 필요 사항을 확인했습니다.</label>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={!confirmed||busy} className="rounded-xl bg-red-700 px-5 py-3 text-white disabled:opacity-50">{busy?'처리 중…':'회원탈퇴 확정'}</button></form></div>;
}
