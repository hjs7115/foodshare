import { useState, type FormEvent } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { API_BASE_URL, apiRequest } from '../../api/config';
import { getStoredUserInfo } from '../../auth/session';
import { showToast } from '../../utils/feedback';

type Category = 'ERROR' | 'SUGGESTION' | 'ACCOUNT' | 'OTHER';

const categories: {value: Category; label: string}[] = [
  { value: 'ERROR', label: '오류 신고' },
  { value: 'SUGGESTION', label: '개선 제안' },
  { value: 'ACCOUNT', label: '계정·이용 문의' },
  { value: 'OTHER', label: '기타 문의' },
];

export default function SupportInquiryScreen({ onClose }: {onClose: () => void}) {
  const [category, setCategory] = useState<Category>('ERROR');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const email = getStoredUserInfo<{email?: string}>()?.email;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const subject = title.trim();
    const body = content.trim();
    if (subject.length < 2 || subject.length > 100) {
      showToast('제목은 2~100자로 작성해 주세요.', 'error');
      return;
    }
    if (body.length < 10 || body.length > 3000) {
      showToast('문의 내용은 10~3000자로 작성해 주세요.', 'error');
      return;
    }
    if (sending) return;
    setSending(true);
    try {
      await apiRequest(API_BASE_URL + '/api/support/inquiries', {
        method: 'POST',
        body: JSON.stringify({ category, title: subject, content: body }),
      });
      showToast('문의 내용이 이메일로 전달되었습니다.', 'success');
      setTitle('');
      setContent('');
      onClose();
    } catch (error: any) {
      showToast(error?.message || '이메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
        <button type="button" onClick={onClose} aria-label="설정으로 돌아가기" className="text-[#2d3748]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-extrabold text-[#2d3748]">문의하기</h1>
        <div className="w-6" />
      </div>
      <form onSubmit={submit} className="flex-1 space-y-5 overflow-y-auto bg-[#f7fafc] px-5 py-6">
        <div className="rounded-2xl bg-[#eff6ff] p-4 text-sm leading-6 text-[#1e3a8a]">
          서비스 사용 중 불편했던 점이나 개선 의견을 남겨주세요. 입력한 내용은 반띵 운영 이메일로 전달됩니다.
          {email && <p className="mt-1 text-xs">답변 받을 이메일: {email}</p>}
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[#334155]">문의 유형</span>
          <select value={category} onChange={e => setCategory(e.target.value as Category)}
            className="w-full rounded-xl border border-[#cbd5e1] bg-white px-3 py-3 text-sm text-[#334155]">
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[#334155]">제목</span>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
            placeholder="문의 제목을 입력해 주세요"
            className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm outline-none focus:border-[#14b8a6]" />
          <p className="text-right text-xs text-[#64748b]">{title.length}/100</p>
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-bold text-[#334155]">문의 내용</span>
          <textarea rows={8} value={content} onChange={e => setContent(e.target.value)} maxLength={3000}
            placeholder="어떤 상황에서 문제가 생겼는지, 또는 개선했으면 하는 점을 적어주세요."
            className="w-full resize-none rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-[#14b8a6]" />
          <p className="text-right text-xs text-[#64748b]">{content.length}/3000</p>
        </label>
        <button type="submit" disabled={sending || title.trim().length < 2 || content.trim().length < 10}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#14b8a6] px-4 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <Send size={17} /> {sending ? '이메일 전송 중...' : '문의 보내기'}
        </button>
      </form>
    </div>
  );
}
