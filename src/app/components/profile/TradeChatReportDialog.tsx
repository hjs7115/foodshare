import { useEffect, useState } from 'react';
import { API_ENDPOINTS, apiRequest, createReport } from '../../api/config';
import { showPrompt, showToast } from '../../utils/feedback';
import { useNestedBack } from '../../utils/useNestedBack';

type Message = { messageId: number; senderNickname: string; content: string; createdAt: string };
export default function TradeChatReportDialog({ requestId, onClose }: { requestId: number; onClose: () => void }) {
  const [rows, setRows] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [more, setMore] = useState(false);
  useNestedBack(true, onClose);
  const url = API_ENDPOINTS.posts.replace(/\/posts$/, '') + `/chat/rooms/by-trade-request/${requestId}/reportable-messages`;
  useEffect(() => {
    let active = true;
    setBusy(true);
    apiRequest(url).then(r => { if (active) { setRows(r.data || []); setMore((r.data || []).length === 100); } })
      .catch(e => { if (active) setError(e.message || '대화를 불러오지 못했습니다.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [url]);
  const older = async () => {
    setBusy(true); setError('');
    try { const r = await apiRequest(url + `?before=${rows[rows.length - 1].messageId}`); setRows(v => [...v, ...(r.data || [])]); setMore((r.data || []).length === 100); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
    <section role="dialog" aria-modal="true" aria-label="지난 대화 신고" className="flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl bg-white p-5">
      <header className="flex items-center justify-between"><h2 className="font-bold">지난 대화 신고</h2><button onClick={onClose} aria-label="닫기">닫기</button></header>
      <p className="my-3 text-sm text-gray-600">차단·퇴장 후에도 참여하던 시점의 상대 메시지를 신고할 수 있어요. 최신 메시지부터 표시됩니다.</p>
      <div className="overflow-y-auto space-y-3">
        {rows.map(m => <article key={m.messageId} className="rounded-xl border p-3">
          <p className="text-xs text-gray-500">{m.senderNickname} · {m.createdAt.replace('T', ' ').slice(0, 16)}</p>
          <p className="my-2 whitespace-pre-wrap break-words text-sm">{m.content}</p>
          <button className="text-sm text-red-700" onClick={async () => {
            const reason = await showPrompt('이 메시지를 신고하는 이유를 입력해주세요.', '메시지 신고'); if (!reason?.trim()) return;
            try { await createReport({ targetType: 'CHAT_MESSAGE', targetId: m.messageId, reason: reason.trim() }); showToast('메시지 증거와 함께 신고가 접수되었습니다.'); }
            catch (e: any) { showToast(e.message || '신고하지 못했습니다.'); }
          }}>이 메시지 신고</button>
        </article>)}
        {!busy && !error && rows.length === 0 && <p className="py-5 text-sm text-gray-500">신고할 상대 메시지가 없습니다.</p>}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {busy && <p className="text-sm">불러오는 중…</p>}
        {more && <button disabled={busy} onClick={() => void older()} className="w-full rounded-xl border p-3 disabled:opacity-50">이전 메시지 더 보기</button>}
      </div>
    </section>
  </div>;
}
