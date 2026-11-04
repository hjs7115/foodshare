import { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { useNestedBack } from '../../utils/useNestedBack';
import { showToast } from '../../utils/feedback';
export default function MarketTradeActionDialog({ requestId, title, action, expirationDate, onClose, onDone }: {
 requestId:number; title:string; action:'cancel'|'reopen'; expirationDate?:string;
 onClose:()=>void; onDone:()=>void;
}) {
 const [reason,setReason]=useState(''); const [confirmed,setConfirmed]=useState(false);
 const [busy,setBusy]=useState(false); const [error,setError]=useState('');
 useNestedBack(true,()=>{if(!busy)onClose()});
 const submit=async()=>{
  if(busy)return;setBusy(true);setError('');
  try {
   await apiRequest(`${API_ENDPOINTS.posts.replace(/\/posts$/, '')}/trade-requests/${requestId}/${action}`,{method:'POST',body:JSON.stringify(action==='cancel'?{reason}:{confirmed})});
   showToast(action==='cancel'?'거래를 취소했습니다. 상대방에게 알렸어요.':'게시글을 다시 공개했습니다.');
   window.dispatchEvent(new Event('market-posts-changed'));onDone();
  }catch(e:any){setError(e.message||'처리하지 못했습니다. 다시 시도해주세요.');}finally{setBusy(false);}
 };
 return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-5" role="dialog" aria-modal="true" aria-labelledby="trade-action-heading">
  <section className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
   <h2 id="trade-action-heading" className="text-lg font-semibold">{action==='cancel'?'거래 취소':'다시 모집하기'}</h2>
   <p className="mt-2 text-sm text-gray-700">{title}</p>
   {action==='cancel'?<>
    <p className="my-3 text-sm text-gray-600">상대방 동의 없이 취소되며 취소 사유가 전달됩니다. 채팅과 거래 기록은 남아요. 송금한 금액은 자동 환불되지 않아요.</p>
    <label className="text-sm">취소 사유<select aria-label="취소 사유" value={reason} onChange={e=>setReason(e.target.value)} className="mt-2 w-full rounded-xl border border-gray-300 bg-white p-3">
     <option value="">사유를 선택해주세요</option>
     {['생각이 바뀌었어요','일정이 맞지 않아요','연락이 닿지 않아요','거래 조건이 달라요','기타'].map(value=><option key={value}>{value}</option>)}
    </select></label>
   </>:<>
    <p className="my-3 text-sm text-gray-600">등록된 날짜: {expirationDate || '확인 필요'}<br/>이전 요청은 자동으로 복원되지 않으며 새 요청을 받을 수 있어요.</p>
    <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} className="mt-1"/>재료 상태와 등록된 날짜를 확인했고 다시 거래할 수 있어요.</label>
   </>}
   {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
   <div className="mt-5 flex gap-2">
    <button disabled={busy} onClick={onClose} className="flex-1 rounded-xl border border-gray-200 py-3">돌아가기</button>
    <button disabled={busy || (action==='cancel'?!reason:!confirmed)} onClick={submit} className="flex-1 rounded-xl bg-[#bef264] py-3 font-semibold disabled:opacity-40">{busy?'처리 중…':action==='cancel'?'취소 확정':'다시 모집하기'}</button>
   </div>
  </section>
 </div>;
}
