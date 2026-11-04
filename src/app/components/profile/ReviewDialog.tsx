import {useState} from 'react';
import {API_ENDPOINTS,apiRequest} from '../../api/config';
import {useNestedBack} from '../../utils/useNestedBack';
import {showToast} from '../../utils/feedback';
export default function ReviewDialog({requestId,title,onClose,onDone}:{requestId:number;title:string;onClose:()=>void;onDone:()=>void}){
 const [rating,setRating]=useState(5);const [content,setContent]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 useNestedBack(true,()=>{if(!busy)onClose();});
 return <div role="dialog" aria-modal="true" aria-label="거래 평가" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-5"><form className="w-full max-w-sm rounded-2xl bg-white p-5" onSubmit={async e=>{
  e.preventDefault();if(busy)return;setBusy(true);setError('');
  try{await apiRequest(API_ENDPOINTS.posts.replace(/\/posts$/,'')+`/trade-requests/${requestId}/reviews`,{method:'POST',body:JSON.stringify({rating,content})});showToast('평가를 남겼습니다.');onDone();}
  catch(e:any){setError(e.message||'평가를 저장하지 못했습니다.');}finally{setBusy(false);}
 }}><h2 className="text-lg font-semibold">거래 평가하기</h2><p className="my-3 text-sm">{title}</p>
 <label className="block text-sm">별점<select value={rating} onChange={e=>setRating(Number(e.target.value))} className="my-2 w-full rounded-xl border bg-white p-3">{[5,4,3,2,1].map(n=><option key={n} value={n}>{'★'.repeat(n)} · {n}점</option>)}</select></label>
 <label className="block text-sm">후기 (선택)<textarea maxLength={1000} value={content} onChange={e=>setContent(e.target.value)} className="mt-2 w-full rounded-xl border p-3" rows={4}/></label>
 {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<p className="my-2 text-xs text-gray-500">완료 거래당 한 번 작성하며 상대방 신선도에 반영됩니다.</p>
 <div className="mt-4 flex gap-3"><button type="button" disabled={busy} onClick={onClose} className="flex-1 rounded-xl border py-3">닫기</button><button disabled={busy} className="flex-1 rounded-xl bg-lime-200 py-3">{busy?'저장 중…':'평가 저장'}</button></div></form></div>;
}
