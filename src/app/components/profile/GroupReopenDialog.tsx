import { useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { useNestedBack } from '../../utils/useNestedBack';

export default function GroupReopenDialog({ postId, onClose, onDone }: { postId: number; onClose: () => void; onDone: () => void }) {
  const [deadline, setDeadline] = useState(new Date(Date.now() + 33 * 3600000).toISOString().slice(0, 16));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useNestedBack(true, () => { if (!busy) onClose(); });
  const submit = async () => {
    setBusy(true); setError('');
    try { await apiRequest(`${API_ENDPOINTS.posts}/${postId}/group-buy/reopen`, { method: 'POST', body: JSON.stringify({ notOrdered: confirmed, deadline }) }); onDone(); }
    catch (e: any) { setError(e.message || '재모집하지 못했습니다.'); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-5">
    <section role="dialog" aria-modal="true" aria-label="공동구매 빈자리 재모집" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5">
      <h2 className="font-bold">공동구매 빈자리 재모집</h2>
      <p className="text-sm text-gray-600">기존 참여자는 유지하고 남은 자리만 다시 모집합니다. 이미 주문·결제했거나 완료 확인을 시작한 거래에는 사용할 수 없어요.</p>
      <label className="block text-sm">새 모집 마감 (한국 시간)<input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="mt-2 w-full rounded-xl border p-3" /></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1" />아직 주문·결제하지 않았으며 기존 참여자에게 재모집을 안내합니다.</label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><button disabled={busy} onClick={onClose} className="flex-1 rounded-xl border p-3">닫기</button><button disabled={busy || !confirmed || !deadline} onClick={() => void submit()} className="flex-1 rounded-xl bg-lime-300 p-3 font-semibold disabled:opacity-50">{busy ? '처리 중…' : '다시 모집하기'}</button></div>
    </section>
  </div>;
}
