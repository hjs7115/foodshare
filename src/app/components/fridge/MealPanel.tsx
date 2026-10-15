import {lazy,Suspense} from 'react';
import type {ShoppingMeal} from './ShoppingScreen';
const ShoppingMealDialog=lazy(()=>import('./ShoppingScreen').then(m=>({default:m.ShoppingMealDialog})));
import { useEffect, useRef, useState } from 'react';
import { ChefHat, ChevronDown, Clock, MapPin, Sparkles, X } from 'lucide-react';
import { API_BASE_URL, apiRequest, buildPostsUrl, resolveImageUrl } from '../../api/config';
import { getDaysLeft } from './expiry';
import LocationSettingsScreen from '../profile/LocationSettingsScreen';

type Item = { id:number; name:string; amount:string; expiryDate:string };
type Ingredient = { name:string; amount:string };
type Meal = { recipe:{id:string;title:string;minutes:number;servings:number;ingredients:Ingredient[];basics:Ingredient[];steps:string[]}; available:string[];missing:string[];priority:string[];fridgeItemIds:number[] };
type Result = { meals:Meal[];mode:string;excludedExpired:string[] };
export default function MealPanel({items,loading,onEdit,onConsumed,onShare}:{items:Item[];loading:boolean;onEdit:(id:number)=>void;onConsumed:(id:number)=>Promise<void>;onShare:(id:number)=>void}) {
 const [shoppingMeal,setShoppingMeal]=useState<ShoppingMeal|null>(null);
 const eligible=items.filter(i=>getDaysLeft(i.expiryDate)>=0);
 const priority=eligible.filter(i=>getDaysLeft(i.expiryDate)<=3).sort((a,b)=>a.expiryDate.localeCompare(b.expiryDate)).slice(0,3);
 const [selected,setSelected]=useState<number[]>([]);
 const known=useRef(new Set<number>());
 const [manual,setManual]=useState('');const [minutes,setMinutes]=useState(30);const [preference,setPreference]=useState('');
 const [result,setResult]=useState<Result|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [expanded,setExpanded]=useState<string|null>(null);const [acting,setActing]=useState<number|null>(null);
 const [nearby,setNearby]=useState<{name:string;busy:boolean;posts:any[];error:string}|null>(null);
 const [locationOpen,setLocationOpen]=useState(false);const sequence=useRef(0);const nearbySequence=useRef(0);
 const formRef=useRef<HTMLDivElement>(null);
 const resultRef=useRef<HTMLDivElement>(null);const nearbyRef=useRef<HTMLElement>(null);
 useEffect(()=>{if(result)resultRef.current?.scrollIntoView({behavior:"smooth",block:"start"})},[result]);
 useEffect(()=>{if(nearby)nearbyRef.current?.scrollIntoView({behavior:"smooth",block:"center"})},[nearby]);
 const signature=eligible.map(i=>i.id+':'+i.name+':'+i.expiryDate).join('|');
 useEffect(()=>{
  const ids=eligible.map(i=>i.id);
  const previous=known.current;
  setSelected(old=>[...new Set([...old.filter(id=>ids.includes(id)),...ids.filter(id=>!previous.has(id))])].slice(0,60));
  known.current=new Set(ids);
 },[signature]);
 useEffect(()=>{sequence.current++;setResult(null);setError('');setBusy(false);setExpanded(null);setNearby(null);nearbySequence.current++;},[selected,manual,minutes,preference,signature]);
 useEffect(()=>()=>{sequence.current++;nearbySequence.current++;},[]);
 const recommend=async()=>{
  const current=++sequence.current;setBusy(true);setError('');setResult(null);setNearby(null);
  try {
   const extra=[...new Set(manual.split(/[,，\n]/).map(s=>s.trim()).filter(Boolean))];
   if(extra.length>30 || extra.some(s=>s.length>50))throw Error('추가 재료는 이름당 50자 이내로, 최대 30개까지 입력해주세요.');
   const response=await apiRequest(API_BASE_URL+'/api/meals/recommend',{method:'POST',body:JSON.stringify({fridgeItemIds:selected,ingredients:extra,maxMinutes:minutes,preference:preference.trim()}),signal:AbortSignal.timeout(50000)});
   if(current===sequence.current)setResult(response.data);
  } catch(e:any){if(current===sequence.current)setError(e?.message || '메뉴를 불러오지 못했어요. 다시 시도해주세요.');}
  finally{if(current===sequence.current)setBusy(false);}
 };
 const findNearby=async(name:string)=>{
  const current=++nearbySequence.current;
  let coords:any;try{coords=JSON.parse(localStorage.getItem('userLocationCoords')||'null')}catch{}
  if(!Number.isFinite(coords?.lat)||!Number.isFinite(coords?.lng)){setNearby({name,busy:false,posts:[],error:'가까운 재료를 찾으려면 위치를 설정해주세요.'});return;}
  setNearby({name,busy:true,posts:[],error:''});
  try {
   const response=await apiRequest(buildPostsUrl({keyword:name,lat:coords.lat,lng:coords.lng,radiusKm:5,sort:'DISTANCE'}),{method:'GET',signal:AbortSignal.timeout(10000)});
   const posts=Array.isArray(response.data)?response.data:[];
   if(current===nearbySequence.current)setNearby({name,busy:false,posts:posts.filter((p:any)=>['SHARE','SALE'].includes(p.postType)&&p.status==='OPEN'&&!p.isMine&&p.distanceKm!=null&&p.distanceKm<=5).slice(0,5),error:''});
  }catch{if(current===nearbySequence.current)setNearby({name,busy:false,posts:[],error:'주변 게시글을 불러오지 못했어요. 다시 시도해주세요.'});}
 };
 const toggle=(id:number)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id]);
 return <section className="mb-5 space-y-4" aria-label="한 끼 완성">
  <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4">
   <div className="flex items-center gap-2"><Clock size={18} className="text-[#a16207]"/><h2 className="font-bold text-[#713f12]">오늘 먼저 확인할 재료</h2></div>
   <p className="mt-1 text-xs leading-5 text-[#856340]">등록한 기한이 가까운 순서예요. 조리 전 실제 상태와 표시된 날짜를 확인해주세요.</p>
   {loading?<p className="mt-3 text-sm">재료를 불러오고 있어요…</p>:priority.length===0?<p className="mt-3 text-sm text-[#6b7280]">3일 안에 기한이 도래하는 재료가 없어요.</p>:<ul className="mt-3 space-y-3">{priority.map(item=><li key={item.id} className="rounded-xl bg-white p-3">
    <div className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words font-semibold">{item.name} <span className="font-normal text-[#64748b]">· {item.amount}</span></span><span className="shrink-0 text-[#a16207]">{getDaysLeft(item.expiryDate)===0?'오늘까지':getDaysLeft(item.expiryDate)+'일 남음'}</span></div>
    <div className="mt-2 flex flex-wrap gap-2 text-xs">
     <button className="rounded-lg bg-[#ecfccb] px-3 py-2 text-[#365314]" onClick={()=>{setSelected(old=>old.includes(item.id)?old:[...old,item.id]);formRef.current?.scrollIntoView({behavior:'smooth',block:'start'})}}>요리에 쓰기</button>
     <button disabled={acting!==null} className="rounded-lg bg-[#f1f5f9] px-3 py-2 disabled:opacity-50" onClick={async()=>{setActing(item.id);try{await onConsumed(item.id)}finally{setActing(null)}}}>다 썼어요</button>
     <button className="rounded-lg bg-[#f1f5f9] px-3 py-2" onClick={()=>onShare(item.id)}>나눔하기</button>
     <button className="px-1 py-2 text-[#64748b]" onClick={()=>onEdit(item.id)}>수량 수정</button>
    </div>
   </li>)}</ul>}
  </div>
  <div ref={formRef} className="scroll-mt-4 rounded-2xl border border-[#bae6fd] bg-white p-4 shadow-sm">
   <div className="flex items-center gap-2"><ChefHat className="text-[#0284c7]" size={22}/><h2 className="text-lg font-bold text-[#0f172a]">오늘 뭐 먹지?</h2></div>
   <p className="mt-1 text-sm leading-6 text-[#64748b]">가진 재료로 한 끼를 골라보세요. 냉장고 등록 없이도 시작할 수 있어요.</p>
   <p className="mb-2 mt-4 text-sm font-semibold">이번 요리에 쓸 재료</p>
   {eligible.length>0?<div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">{eligible.map(item=><button key={item.id} type="button" aria-pressed={selected.includes(item.id)} onClick={()=>toggle(item.id)} className={'max-w-full break-words rounded-full border px-3 py-2 text-sm '+(selected.includes(item.id)?'border-[#7dd3fc] bg-[#e0f2fe] text-[#075985]':'border-[#e2e8f0] text-[#64748b]')}>{selected.includes(item.id)?'✓ ':''}{item.name}</button>)}</div>:<p className="text-xs text-[#64748b]">아래에 가지고 있는 재료를 입력해주세요.</p>}
   {items.length>eligible.length&&<p className="mt-2 text-xs text-[#b45309]">등록된 기한이 지난 재료는 자동 선택에서 제외했어요.</p>}
   <label htmlFor="meal-ingredients" className="mb-1 mt-4 block text-sm">추가로 가진 재료</label>
   <input id="meal-ingredients" value={manual} maxLength={300} onChange={e=>setManual(e.target.value)} placeholder="예: 밥, 계란, 대파 (쉼표로 구분)" className="w-full min-w-0 rounded-xl border border-[#cbd5e1] px-3 py-3 text-sm"/>
   <div className="mt-3 flex items-center justify-between gap-2"><label htmlFor="meal-time" className="text-sm">조리 시간</label><select id="meal-time" value={minutes} onChange={e=>setMinutes(Number(e.target.value))} className="rounded-xl border border-[#cbd5e1] bg-white px-3 py-2 text-sm"><option value={15}>15분 이내</option><option value={30}>30분 이내</option><option value={60}>60분 이내</option></select></div>
   <label htmlFor="meal-preference" className="mb-1 mt-3 flex items-center gap-1 text-sm"><Sparkles size={14}/>취향 한마디 <span className="text-[#64748b]">(선택)</span></label>
   <input id="meal-preference" value={preference} maxLength={120} onChange={e=>setPreference(e.target.value)} placeholder="예: 국물 없이 담백한 메뉴" className="w-full min-w-0 rounded-xl border border-[#cbd5e1] px-3 py-3 text-sm"/>
   <p className="mt-2 text-xs leading-5 text-[#64748b]">AI가 선택한 재료와 취향을 반영해 새로운 메뉴와 레시피를 제안해요.</p>
   <button disabled={busy||loading} onClick={recommend} className="mt-4 w-full rounded-xl bg-[#0284c7] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?'AI가 레시피를 만들고 있어요…':'AI로 메뉴 골라보기'}</button>
   {error&&<p className="mt-3 text-sm text-[#b91c1c]" role="alert">{error}</p>}
  </div>
  {result&&<div ref={resultRef} aria-live="polite" className="scroll-mt-4 space-y-3">
   <div><h3 className="font-bold text-[#0f172a]">{result.mode==='AI'?'취향을 반영한 한 끼':'재료로 고른 한 끼'}</h3><p className="mt-1 text-xs leading-5 text-[#64748b]">{result.mode==='FALLBACK'?'지금은 AI 추천 대신 기본 메뉴를 보여드려요. 잠시 후 다시 시도할 수 있어요.':'AI가 제안한 레시피예요. 보유량·양념·알레르기 재료를 조리 전에 확인해주세요.'}</p></div>
   {result.excludedExpired.length>0&&<p className="text-xs text-[#b45309]">기한이 지나 제외한 재료: {result.excludedExpired.join(', ')}</p>}
   {result.meals.length===0&&<div className="rounded-xl bg-white p-4 text-sm text-[#64748b]">맞는 메뉴를 찾지 못했어요. 재료 이름을 간단히 입력하거나 조리 시간을 늘려보세요.</div>}
   {result.meals.map(meal=><article key={meal.recipe.id} className="overflow-hidden rounded-2xl border border-[#dbeafe] bg-white p-4">
    <div className="flex items-start justify-between gap-2"><h4 className="font-bold text-[#0f172a]">{meal.recipe.title}</h4><span className="shrink-0 text-xs text-[#64748b]">약 {meal.recipe.minutes}분 · {meal.recipe.servings}인분</span></div>
    {meal.priority.length>0&&<p className="mt-2 text-xs text-[#a16207]">먼저 확인할 {meal.priority.join(', ')} 활용</p>}
    <p className="mt-3 text-sm text-[#166534]">있는 재료: {meal.available.join(', ')||'선택한 재료 없음'}</p>
    <p className="mt-1 text-sm text-[#64748b]">{meal.missing.length?'더 필요한 재료: '+meal.missing.join(', '):'주재료는 모두 있어요'}</p>
    {meal.missing.length>0&&<div className="mt-2 flex flex-wrap gap-2">{meal.missing.map(n=><button key={n} onClick={()=>findNearby(n)} className="rounded-lg border border-[#e2e8f0] px-2 py-2 text-xs text-[#0369a1]"><MapPin size={12} className="mr-1 inline"/>{n} 근처에서 찾기</button>)}</div>}
    <button onClick={()=>setShoppingMeal({...meal.recipe,missing:meal.missing})} className="mt-3 w-full rounded-xl border border-[#bae6fd] px-3 py-3 text-sm font-semibold text-[#075985]">장보기 목록에 담기</button>
    <button onClick={()=>{setExpanded(expanded===meal.recipe.id?null:meal.recipe.id);setNearby(null);nearbySequence.current++}} aria-expanded={expanded===meal.recipe.id} className="mt-3 flex w-full items-center justify-between rounded-xl bg-[#f0f9ff] px-3 py-2 text-sm font-semibold text-[#075985]">{expanded===meal.recipe.id?'레시피 접기':'레시피 보기'}<ChevronDown size={16}/></button>
    {expanded===meal.recipe.id&&<div className="mt-4 space-y-4 text-sm">
     <div><h5 className="mb-2 font-semibold">재료 · {meal.recipe.servings}인분 기준</h5><ul className="space-y-1 text-[#475569]">{meal.recipe.ingredients.map(i=><li key={i.name}>{i.name} · {i.amount}</li>)}</ul></div>
     <div><h5 className="mb-2 font-semibold">양념·기본 재료도 확인해주세요</h5><p className="leading-6 text-[#475569]">{meal.recipe.basics.map(i=>i.name+' '+i.amount).join(' / ')}</p></div>
     <ol className="list-decimal space-y-2 pl-5 leading-6 text-[#334155]">{meal.recipe.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
     {meal.fridgeItemIds.length>0&&<div className="rounded-xl bg-[#f8fafc] p-3"><p className="mb-2 font-semibold">요리 후 냉장고 정리</p><p className="mb-2 text-xs text-[#64748b]">전부 사용한 재료만 ‘다 썼어요’를 눌러주세요.</p>{items.filter(i=>meal.fridgeItemIds.includes(i.id)).map(i=><div key={i.id} className="flex items-center justify-between gap-2 py-1"><span className="min-w-0 break-words">{i.name}</span><div className="flex shrink-0 gap-2"><button onClick={()=>onEdit(i.id)} className="p-1 text-xs text-[#0369a1]">수량 수정</button><button disabled={acting!==null} onClick={async()=>{setActing(i.id);try{await onConsumed(i.id)}finally{setActing(null)}}} className="rounded-lg bg-[#e0f2fe] px-2 py-2 text-xs">다 썼어요</button></div></div>)}</div>}
    </div>}
   </article>)}
  </div>}
  {nearby&&<section ref={nearbyRef} className="rounded-2xl border border-[#bef264] bg-white p-4" aria-label="근처 재료 검색 결과"><div className="flex justify-between gap-2"><h3 className="font-semibold">5km 안의 ‘{nearby.name}’ 게시글</h3><button aria-label="검색 결과 닫기" onClick={()=>{nearbySequence.current++;setNearby(null)}}><X size={18}/></button></div>
   {nearby.busy?<p className="mt-3 text-sm">찾고 있어요…</p>:nearby.error?<div className="mt-3"><p className="text-sm text-[#64748b]">{nearby.error}</p><button onClick={()=>setLocationOpen(true)} className="mt-2 text-sm text-[#0369a1]">위치 설정</button><button onClick={()=>findNearby(nearby.name)} className="ml-3 mt-2 text-sm text-[#0369a1]">다시 찾기</button></div>:nearby.posts.length===0?<p className="mt-3 text-sm text-[#64748b]">지금은 해당 재료로 검색되는 나눔·판매 글이 없어요. 레시피는 그대로 이용할 수 있어요.</p>:<div className="mt-3 space-y-2">{nearby.posts.map(p=><a key={p.postId} href={'/app?screen=post&postId='+p.postId} className="flex items-center gap-3 rounded-xl border border-[#e2e8f0] p-3"><img src={resolveImageUrl(p.imageUrl)} alt="" loading="lazy" className="h-12 w-12 rounded-lg object-cover"/><div className="min-w-0"><p className="truncate text-sm font-semibold">{p.title}</p><p className="mt-1 text-xs text-[#64748b]">{p.priceText} · {Number(p.distanceKm).toFixed(1)}km</p></div></a>)}</div>}
  </section>}
  {shoppingMeal&&<Suspense fallback={<div role="status" className="fixed inset-0 z-[60] bg-white p-5">재료를 불러오고 있어요…</div>}><ShoppingMealDialog meal={shoppingMeal} onClose={()=>setShoppingMeal(null)}/></Suspense>}
  {locationOpen&&<LocationSettingsScreen onClose={()=>{setLocationOpen(false);if(nearby)void findNearby(nearby.name)}}/>}
 </section>;
}
