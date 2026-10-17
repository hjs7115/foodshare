import {useState} from 'react';
import {Leaf,X} from 'lucide-react';
import {resolveImageUrl,uploadImage} from '../../api/config';
import {showToast} from '../../utils/feedback';
import {useNestedBack} from '../../utils/useNestedBack';

export default function FridgePhoto({url,name,onChange,onBusy}:{url?:string|null;name:string;onChange?:(url:string)=>void|Promise<void>;onBusy?:(busy:boolean)=>void}) {
 const [expanded,setExpanded]=useState(false);const [busy,setBusy]=useState(false);const [failed,setFailed]=useState('');
 useNestedBack(expanded,()=>setExpanded(false));
 const valid=Boolean(url&&failed!==url);
 const change=async(value:string)=>{setBusy(true);onBusy?.(true);try{await onChange?.(value)}catch(e:any){showToast(e.message||'사진을 저장하지 못했어요.')}finally{setBusy(false);onBusy?.(false)}};
 const upload=async(file?:File)=>{if(!file)return;if(file.size>10*1024*1024){showToast('사진은 10MB 이하로 선택해주세요.');return;}setBusy(true);onBusy?.(true);try{const value=await uploadImage(file);await onChange?.(value)}catch(e:any){showToast(e.message||'사진을 올리지 못했어요.')}finally{setBusy(false);onBusy?.(false)}};
 return <div className="my-3 flex flex-wrap items-center gap-3">
  {valid?<button type="button" aria-label={`${name} 사진 확대`} onClick={()=>setExpanded(true)} className="shrink-0 overflow-hidden rounded-xl border border-[#e2e8f0]"><img src={resolveImageUrl(url!)} alt={`${name} 사진`} loading="lazy" decoding="async" className="h-20 w-20 object-cover" onError={()=>setFailed(url!)}/></button>:<div role="img" aria-label={`${name} 사진 없음`} className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#ecfccb] text-[#65a30d]"><Leaf size={30}/></div>}
  {onChange&&<div className="min-w-0 text-xs text-[#64748b]"><label className="inline-block cursor-pointer rounded-lg border border-[#cbd5e1] bg-white px-3 py-2 text-[#0284c7]">{busy?'사진 저장 중…':url?'사진 변경':'사진 추가 (선택)'}<input aria-label={`${name} 사진 선택`} disabled={busy} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={e=>{const file=e.target.files?.[0];e.target.value='';void upload(file)}}/></label>{url&&<button type="button" disabled={busy} onClick={()=>void change('')} className="ml-2 underline">사진 삭제</button>}<p className="mt-2">직접 찍은 사진으로 상태를 보여주세요.</p></div>}
  {expanded&&valid&&<div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/85 p-5" role="dialog" aria-modal="true" aria-label={`${name} 사진 보기`} onClick={()=>setExpanded(false)}><button type="button" autoFocus aria-label="사진 닫기" className="absolute right-5 top-5 rounded-full bg-white p-2 text-black" onClick={()=>setExpanded(false)}><X/></button><img src={resolveImageUrl(url!)} alt={`${name} 확대 사진`} className="max-h-[85dvh] max-w-full rounded-xl object-contain" onClick={e=>e.stopPropagation()}/></div>}
 </div>;
}
