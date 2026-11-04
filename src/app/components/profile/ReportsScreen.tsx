import {useEffect,useState} from 'react';
import {API_BASE_URL,apiRequest} from '../../api/config';
import {useNestedBack} from '../../utils/useNestedBack';
export default function ReportsScreen({onClose}:{onClose:()=>void}){
 const [rows,setRows]=useState<any[]>([]);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 useNestedBack(true,onClose);
 const load=async()=>{setLoading(true);setError('');try{const r=await apiRequest(API_BASE_URL+'/api/reports/me');setRows(r.data||[]);}catch(e:any){setError(e.message||'불러오지 못했습니다.');}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
 return <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-50 p-5"><header className="mb-5 flex justify-between"><button onClick={onClose}>닫기</button><h1 className="font-bold">내 신고·분쟁 내역</h1><button onClick={()=>void load()}>새로고침</button></header>
 {loading?<p role="status">불러오는 중…</p>:error?<p role="alert">{error}</p>:rows.length===0?<p>접수한 신고가 없습니다.</p>:rows.map(r=><article key={r.reportId} className="mb-3 rounded-xl border bg-white p-4"><p className="font-semibold">{r.reason}</p><p className="my-2 text-sm">{{PENDING:'검토 대기',REVIEWED:'처리 완료',REJECTED:'반려'}[r.status as string]||r.status}</p>{r.resolution&&<p className="whitespace-pre-wrap text-sm">처리 안내: {r.resolution}</p>}<p className="mt-2 text-xs text-gray-500">접수: {r.createdAt?.slice(0,16).replace('T',' ')}</p></article>)}</div>;
}
