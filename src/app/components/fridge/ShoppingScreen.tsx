import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,ShoppingCart,Trash2,X} from 'lucide-react';
import {API_BASE_URL,apiRequest} from '../../api/config';
import {showConfirm,showToast} from '../../utils/feedback';
import {useNestedBack} from '../../utils/useNestedBack';

const NotificationSettingsScreen=lazy(()=>import('../profile/NotificationSettingsScreen'));

type Ingredient={name:string;amount:string};
export type ShoppingMeal={title:string;servings:number;ingredients:Ingredient[];basics:Ingredient[];missing:string[]};
type Row={id:number;name:string;amount:string;source:string;state:string;fridgeRegistered?:boolean;stock:{name:string;amount:string;expiryDate:string}[]};
type ListData={weekStart:string;today:string;shoppingDay:number;reminderEnabled?:boolean;reminderTime?:string;items:Row[]};
const days=['월','화','수','목','금','토','일'];
const key=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const shift=(date:string,n:number)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return key(d)};
export const currentShoppingWeek=()=>{const date=new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Seoul'}));date.setDate(date.getDate()-(date.getDay()+6)%7);return key(date)};
const short=(date:string)=>date.slice(5).replace('-','/');
const box='w-full min-w-0 rounded-xl border border-[#cbd5e1] bg-white px-3 py-3 text-sm';

export function ShoppingMealDialog({meal,onClose}:{meal:ShoppingMeal;onClose:()=>void}) {
 const ingredients=[...meal.ingredients,...meal.basics].filter((v,i,a)=>a.findIndex(x=>x.name===v.name)===i);
 const [selected,setSelected]=useState<string[]>([...meal.missing,...meal.basics.map(i=>i.name)]);
 const [week,setWeek]=useState(currentShoppingWeek());const [busy,setBusy]=useState(false);const [savedWeek,setSavedWeek]=useState<string|null>(null);
 useNestedBack(true,()=>{if(!busy)onClose()});
 const save=async()=>{setBusy(true);try{const r=await apiRequest(API_BASE_URL+'/api/shopping',{method:'POST',body:JSON.stringify({week,source:meal.title,items:ingredients.filter(i=>selected.includes(i.name))})});showToast('장보기 목록에 저장했어요. 같은 메뉴·재료·수량은 중복으로 담지 않아요.');setSavedWeek(r.data.weekStart)}catch(e:any){showToast(e.message||'저장하지 못했어요.')}finally{setBusy(false)}};
 if(savedWeek)return <ShoppingScreen initialWeek={savedWeek} onClose={onClose} manageHistory={false}/>;
 return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="장보기 재료 담기" className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5">
 <div className="flex items-center justify-between gap-2"><h2 className="font-bold">장보기 재료 담기</h2><button disabled={busy} aria-label="재료 담기 닫기" onClick={onClose}><X size={22}/></button></div>
 <p className="mt-3 break-words font-semibold text-[#075985]">{meal.title} · {meal.servings}인분</p><p className="mt-2 text-xs leading-5 text-[#64748b]">부족한 주재료와 양념을 미리 선택했어요. 실제 보유량을 확인하고 살 재료만 담아주세요.</p>
 <label className="mt-4 block text-sm" htmlFor="shopping-meal-week">담을 주</label><select disabled={busy} id="shopping-meal-week" value={week} onChange={e=>setWeek(e.target.value)} className={box+' mt-1'}>{[0,7,14,21].map(n=><option key={n} value={shift(currentShoppingWeek(),n)}>{n===0?'이번 주':n===7?'다음 주':`${n/7}주 뒤`} ({short(shift(currentShoppingWeek(),n))}~{short(shift(currentShoppingWeek(),n+6))})</option>)}</select>
 <div className="my-4 space-y-2">{ingredients.map(i=><label key={i.name} className="flex items-start gap-3 rounded-xl bg-[#f8fafc] p-3 text-sm"><input disabled={busy} type="checkbox" checked={selected.includes(i.name)} onChange={()=>setSelected(s=>s.includes(i.name)?s.filter(n=>n!==i.name):[...s,i.name])} className="mt-1 h-4 w-4 shrink-0"/><span className="min-w-0 break-words">{i.name} · {i.amount}</span></label>)}</div>
 <button disabled={busy||!selected.length} onClick={()=>void save()} className="w-full rounded-xl bg-[#0284c7] p-3 font-semibold text-white disabled:opacity-50">{busy?'저장 중…':'선택한 재료 담기'}</button>
 </section></div>;
}

export default function ShoppingScreen({initialWeek,onClose,manageHistory=true}:{initialWeek?:string;onClose:()=>void;manageHistory?:boolean}) {
 const [week,setWeek]=useState(initialWeek||currentShoppingWeek());const [data,setData]=useState<ListData|null>(null);
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [filter,setFilter]=useState('NEED');
 const [name,setName]=useState('');const [amount,setAmount]=useState('');const [edit,setEdit]=useState<number|null>(null);const [editAmount,setEditAmount]=useState('');
 const [reminderOn,setReminderOn]=useState(false);const [reminderTime,setReminderTime]=useState('09:00');
 const [pushSettings,setPushSettings]=useState(false);
 const [registration,setRegistration]=useState<Row|null>(null);const [registerAmount,setRegisterAmount]=useState('');const [registerExpiry,setRegisterExpiry]=useState('');const [registerStorage,setRegisterStorage]=useState('냉장');
 const sequence=useRef(0);useNestedBack(manageHistory,onClose);useNestedBack(pushSettings,()=>setPushSettings(false));useNestedBack(registration!==null,()=>setRegistration(null));
 useEffect(()=>{setReminderOn(data?.reminderEnabled??false);setReminderTime(data?.reminderTime||'09:00')},[data?.reminderEnabled,data?.reminderTime]);
 const openRegistration=(row:Row)=>{setRegisterAmount(row.amount==='수량 확인'?'':row.amount.slice(0,50));setRegisterExpiry('');setRegisterStorage('냉장');setRegistration(row)};
 const load=async()=>{const token=++sequence.current;setLoading(true);setError('');try{const r=await apiRequest(API_BASE_URL+'/api/shopping?week='+week);if(token===sequence.current)setData(r.data)}catch(e:any){if(token===sequence.current){setData(null);setError(e.message||'목록을 불러오지 못했어요.')}}finally{if(token===sequence.current)setLoading(false)}};
 useEffect(()=>{void load();return()=>{sequence.current++}},[week]);
 const mutate=async(path:string,method:string,body?:unknown)=>{setBusy(true);try{const r=await apiRequest(API_BASE_URL+'/api/shopping'+path,{method,...(body?{body:JSON.stringify(body)}:{})});setData(r.data);return true}catch(e:any){showToast(e.message||'저장하지 못했어요.');return false}finally{setBusy(false)}};
 const update=(id:number,state:string)=>mutate('/items/'+id,'PATCH',{state});
 const bought=async(row:Row)=>{if(await update(row.id,'BOUGHT')){if(!row.fridgeRegistered)openRegistration(row)}};
 const rows=(data?.items||[]).filter(i=>filter==='ALL'||i.state===filter);
 const groups=new Map<string,Row[]>();rows.forEach(i=>{const k=i.name.replace(/\s+/g,'').replace(/^달걀$/,'계란');groups.set(k,[...(groups.get(k)||[]),i])});
 const counts={NEED:0,HAVE:0,BOUGHT:0};data?.items.forEach(i=>{if(i.state in counts)counts[i.state as keyof typeof counts]++});
 return <div role="dialog" aria-modal="true" aria-label="주간 장보기" className="fixed inset-0 z-50 flex flex-col bg-[#f7fafc]">
 <header className="flex items-center gap-3 border-b border-[#bae6fd] bg-gradient-to-r from-[#e0f2fe] to-[#ecfccb] px-4 py-4"><button onClick={onClose} aria-label="장보기 닫기" className="rounded-full bg-white p-2"><ArrowLeft size={22}/></button><div><h1 className="text-lg font-bold">주간 장보기</h1><p className="text-xs text-[#475569]">필요한 것만 담고, 한 주씩 준비해요</p></div></header>
 <main className="flex-1 overflow-y-auto px-4 py-5 pb-12"><div className="mx-auto max-w-lg space-y-4">
 <section className="rounded-2xl border border-[#dbeafe] bg-white p-4"><div className="flex items-center justify-between gap-2"><button disabled={busy||loading||week<=shift(currentShoppingWeek(),-364)} aria-label="이전 주" onClick={()=>{setEdit(null);setWeek(shift(week,-7))}} className="p-2 disabled:opacity-30"><ChevronLeft size={20}/></button><h2 className="text-sm font-bold">{week.slice(0,4)} · {short(week)} ~ {short(shift(week,6))}</h2><button disabled={busy||loading||week>=shift(currentShoppingWeek(),364)} aria-label="다음 주" onClick={()=>{setEdit(null);setWeek(shift(week,7))}} className="p-2 disabled:opacity-30"><ChevronRight size={20}/></button></div>
 <button disabled={busy||loading} className="mt-1 text-xs text-[#0284c7]" onClick={()=>setWeek(currentShoppingWeek())}>이번 주로</button>
 {data&&<div className="mt-3 border-t border-[#e2e8f0] pt-3"><div className="flex items-center justify-between gap-2"><label htmlFor="shopping-day" className="text-sm font-semibold">매주 장보는 날</label><select id="shopping-day" disabled={busy||loading} value={data.shoppingDay} onChange={e=>void mutate('/preference','PUT',{week,shoppingDay:Number(e.target.value)})} className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm">{days.map((d,i)=><option key={d} value={i+1}>{d}요일</option>)}</select></div><p className="mt-2 text-xs leading-5 text-[#64748b]">선택한 주의 장보기: {short(shift(week,data.shoppingDay-1))} ({days[data.shoppingDay-1]}). 요일과 목록은 계정에 저장돼요.</p></div>}
 {data&&<form className="mt-4 border-t border-[#e2e8f0] pt-4" onSubmit={async e=>{e.preventDefault();if(await mutate('/reminder','PUT',{week,enabled:reminderOn,time:reminderTime}))showToast(reminderOn?'장보기 알림을 켰어요. 기기의 알림 연결도 확인해주세요.':'장보기 알림을 껐어요.')}}>
 <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={reminderOn} disabled={busy||loading} onChange={e=>setReminderOn(e.target.checked)} className="h-4 w-4"/>장보기 알림 받기</label>
 <div className="mt-3 flex items-center justify-between gap-2"><label htmlFor="shopping-reminder-time" className="text-sm">알림 시간 (한국)</label><input id="shopping-reminder-time" type="time" required disabled={busy||loading} value={reminderTime} onChange={e=>setReminderTime(e.target.value)} className="min-w-0 rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm"/></div>
 <p className="mt-2 text-xs leading-5 text-[#64748b]">설정한 요일·시간 이후, 이번 주에 살 품목이 남아 있을 때 주 1회 알려드려요. 휴대폰 알림을 받으려면 기기의 알림 권한과 연결도 필요해요.</p>
 <div className="mt-3 flex flex-wrap gap-3"><button disabled={busy||loading} className="rounded-lg bg-[#0284c7] px-3 py-2 text-xs text-white">알림 설정 저장</button><button type="button" onClick={()=>setPushSettings(true)} className="text-xs text-[#0284c7]">기기 알림 연결 확인</button></div>
 </form>}
 </section>
 {loading?<p role="status" className="p-4 text-sm">장보기 목록을 불러오고 있어요…</p>:error?<div role="alert" className="rounded-xl bg-white p-4 text-sm">{error}<button onClick={()=>void load()} className="ml-3 text-[#0284c7]">다시 시도</button></div>:data&&<>
 <form onSubmit={async e=>{e.preventDefault();if(!name.trim()||busy)return;if(await mutate('','POST',{week,source:'',items:[{name:name.trim(),amount:amount.trim()}]})){setName('');setAmount('');setFilter('NEED')}}} className="rounded-2xl border border-[#e2e8f0] bg-white p-4"><h2 className="mb-3 font-semibold">직접 담기</h2><label htmlFor="shopping-name" className="mb-1 block text-xs">재료 이름</label><input id="shopping-name" disabled={busy} value={name} maxLength={100} required onChange={e=>setName(e.target.value)} placeholder="예: 우유" className={box}/><label htmlFor="shopping-amount" className="mb-1 mt-2 block text-xs">살 수량 (선택)</label><input id="shopping-amount" disabled={busy} value={amount} maxLength={100} onChange={e=>setAmount(e.target.value)} placeholder="예: 1L, 반 모" className={box}/><button disabled={busy||!name.trim()} className="mt-3 w-full rounded-xl bg-[#0284c7] py-3 text-sm font-semibold text-white disabled:opacity-50">목록에 추가</button></form>
 <div><p className="mb-3 text-sm font-semibold">살 것 {counts.NEED} · 이미 있음 {counts.HAVE} · 구매 완료 {counts.BOUGHT}</p><nav aria-label="장보기 상태" className="flex gap-1 rounded-xl bg-[#e2e8f0] p-1">{[['NEED','살 것'],['HAVE','있어요'],['BOUGHT','샀어요'],['ALL','전체']].map(([v,t])=><button key={v} onClick={()=>setFilter(v)} className={'flex-1 rounded-lg py-2 text-sm '+(filter===v?'bg-white font-bold text-[#075985]':'text-[#475569]')}>{t}</button>)}</nav></div>
 {!rows.length&&<section className="rounded-2xl border border-dashed border-[#cbd5e1] p-6 text-center"><ShoppingCart size={28} className="mx-auto mb-2 text-[#0284c7]"/><p className="text-sm">{data.items.length?'이 상태의 재료가 없어요.':'아직 담은 재료가 없어요.'}</p><p className="mt-2 text-xs leading-5 text-[#64748b]">직접 추가하거나 ‘한 끼 완성’의 추천 메뉴에서<br/>‘장보기 목록에 담기’를 눌러보세요.</p></section>}
 {[...groups.entries()].map(([k,group])=><section key={k} className="rounded-2xl border border-[#e2e8f0] bg-white p-4"><h3 className="break-words font-bold">{group[0].name}</h3>{group[0].stock.length>0&&<p className="mt-2 rounded-lg bg-[#ecfccb] p-2 text-xs leading-5 text-[#365314]">냉장고 기록: {group[0].stock.map(s=>s.amount+' ('+s.expiryDate+'까지)').join(' / ')}. 실제 남은 양을 확인하고 ‘이미 있어요’를 눌러주세요.</p>}
 {group.map(i=><article key={i.id} className="mt-3 border-t border-[#f1f5f9] pt-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="break-words text-sm font-semibold">{i.amount}</p><p className="mt-1 break-words text-xs text-[#64748b]">{i.source||'직접 추가'} · {i.state==='NEED'?'살 것':i.state==='HAVE'?'이미 있음':'구매 완료'}</p></div><button disabled={busy} aria-label={i.name+' 삭제'} onClick={async()=>{if(await showConfirm(i.name+'을 이 주의 목록에서 삭제할까요?','품목 삭제','삭제'))await mutate('/items/'+i.id,'DELETE')}} className="p-2 text-[#94a3b8]"><Trash2 size={16}/></button></div>
 {edit===i.id?<form className="mt-2 flex gap-2" onSubmit={async e=>{e.preventDefault();if(await mutate('/items/'+i.id,'PATCH',{amount:editAmount.trim()}))setEdit(null)}}><input aria-label={i.name+' 수량 수정'} value={editAmount} maxLength={100} required onChange={e=>setEditAmount(e.target.value)} className={box}/><button disabled={busy||!editAmount.trim()} className="shrink-0 text-sm text-[#0284c7]">저장</button><button type="button" onClick={()=>setEdit(null)} className="shrink-0 text-xs">취소</button></form>:<div className="mt-3 flex flex-wrap gap-2 text-xs">{i.state==='NEED'?<><button disabled={busy} onClick={()=>void bought(i)} className="rounded-lg bg-[#0284c7] px-3 py-2 text-white">샀어요</button><button disabled={busy} onClick={()=>void update(i.id,'HAVE')} className="rounded-lg bg-[#ecfccb] px-3 py-2 text-[#365314]">이미 있어요</button></>:<button disabled={busy} onClick={()=>void update(i.id,'NEED')} className="rounded-lg bg-[#e0f2fe] px-3 py-2 text-[#075985]">다시 살 것에 넣기</button>}{i.state==='BOUGHT'&&(i.fridgeRegistered?<span className="px-2 py-2 text-[#166534]">냉장고 등록 완료</span>:<button disabled={busy} onClick={()=>openRegistration(i)} className="rounded-lg bg-[#dcfce7] px-3 py-2 text-[#166534]">냉장고에 등록</button>)}<button disabled={busy} onClick={()=>{setEdit(i.id);setEditAmount(i.amount)}} className="px-2 py-2 text-[#64748b]">수량 수정</button></div>}</article>)}
 </section>)}
 <p className="text-xs leading-5 text-[#64748b]">여러 메뉴의 같은 재료는 함께 보여주되 필요량을 각각 표시해요. 보유량 차감이나 서로 다른 단위의 합산은 하지 않아요. 구매 후 수량·기한·보관 위치를 확인하면 냉장고에 등록할 수 있어요. 지난주 목록은 그대로 보관돼요.</p>
 </>}
 </div></main>
 {registration&&<div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"><form role="dialog" aria-modal="true" aria-label="구매 재료 냉장고 등록" onSubmit={async e=>{e.preventDefault();if(await mutate('/items/'+registration.id+'/fridge','POST',{amount:registerAmount.trim(),expiryDate:registerExpiry,storagePlace:registerStorage})){setRegistration(null);window.dispatchEvent(new Event('fridge-items-changed'));showToast('냉장고에 등록했어요.')}}} className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5">
 <h2 className="font-bold">냉장고에도 넣을까요?</h2><p className="mt-2 break-words text-sm text-[#075985]">{registration.name}</p><p className="mt-2 text-xs leading-5 text-[#64748b]">실제로 구매한 양과 제품에 표시된 기한을 확인해주세요. 기존 재료에 합산하지 않고 새 기록으로 저장해요.</p>
 <label htmlFor="register-amount" className="mb-1 mt-4 block text-sm">구매한 수량</label><input id="register-amount" required maxLength={50} disabled={busy} value={registerAmount} onChange={e=>setRegisterAmount(e.target.value)} className={box}/>
 <label htmlFor="register-expiry" className="mb-1 mt-3 block text-sm">표시된 기한</label><input id="register-expiry" type="date" required min={data?.today} disabled={busy} value={registerExpiry} onChange={e=>setRegisterExpiry(e.target.value)} className={box}/>
 <label htmlFor="register-storage" className="mb-1 mt-3 block text-sm">보관 위치</label><select id="register-storage" disabled={busy} value={registerStorage} onChange={e=>setRegisterStorage(e.target.value)} className={box}>{['냉장','냉동','실온'].map(v=><option key={v}>{v}</option>)}</select>
 <div className="mt-5 flex gap-3"><button type="button" disabled={busy} onClick={()=>setRegistration(null)} className="flex-1 rounded-xl bg-[#f1f5f9] p-3 text-sm">나중에</button><button disabled={busy||!registerAmount.trim()||!registerExpiry} className="flex-1 rounded-xl bg-[#0284c7] p-3 text-sm text-white">{busy?'저장 중…':'냉장고에 저장'}</button></div>
 </form></div>}
 {pushSettings&&<Suspense fallback={<div className="fixed inset-0 z-[60] bg-white p-5">알림 설정을 여는 중…</div>}><div className="fixed inset-0 z-[60]"><NotificationSettingsScreen onClose={()=>setPushSettings(false)}/></div></Suspense>}
 </div>;
}
