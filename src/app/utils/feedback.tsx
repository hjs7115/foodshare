import { ReactNode, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type ToastTone = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface DialogState {
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  inputPlaceholder?: string;
  resolve: (value: boolean | string | null) => void;
  type: 'confirm' | 'prompt';
}

let toastHandler: ((message: string, tone?: ToastTone) => void) | null = null;
let dialogHandler: ((state: Omit<DialogState, 'resolve'>) => Promise<boolean | string | null>) | null = null;

export function showToast(message: string, tone: ToastTone = 'info') {
  if (toastHandler) {
    toastHandler(message, tone);
    return;
  }
  console.log(message);
}

export function showSuccess(message: string) {
  showToast(message, 'success');
}

export function showError(message: string) {
  showToast(message, 'error');
}

export function showConfirm(message: string, title = '확인', confirmText = '확인', cancelText = '취소') {
  if (!dialogHandler) {
    return Promise.resolve(false);
  }
  return dialogHandler({ type: 'confirm', title, message, confirmText, cancelText }) as Promise<boolean>;
}

export function showPrompt(message: string, title = '입력', inputPlaceholder = '내용을 입력해주세요.', confirmText = '확인', cancelText = '취소') {
  if (!dialogHandler) {
    return Promise.resolve(null);
  }
  return dialogHandler({ type: 'prompt', title, message, inputPlaceholder, confirmText, cancelText }) as Promise<string | null>;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    toastHandler = (message, tone = 'info') => {
      const id = Date.now();
      setToast({ id, message, tone });
      window.setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
      }, 2800);
    };

    dialogHandler = (state) => new Promise((resolve) => {
      setInputValue('');
      setDialog({ ...state, resolve });
    });

    return () => {
      toastHandler = null;
      dialogHandler = null;
    };
  }, []);

  const closeDialog = (value: boolean | string | null) => {
    dialog?.resolve(value);
    setDialog(null);
    setInputValue('');
  };

  const ToastIcon = toast?.tone === 'success' ? CheckCircle2 : toast?.tone === 'error' ? AlertCircle : Info;
  const toastToneClass =
    toast?.tone === 'success'
      ? 'border-[#bef264] bg-[#f0fdf4] text-[#365314]'
      : toast?.tone === 'error'
        ? 'border-[#fecaca] bg-[#fff5f5] text-[#991b1b]'
        : 'border-[#99f6e4] bg-white text-[#1a202c]';

  return (
    <>
      {children}

      {toast && (
        <div className={`fixed left-4 right-4 top-4 z-[120] mx-auto flex max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl ${toastToneClass}`}>
          <ToastIcon size={20} className="mt-0.5 shrink-0" />
          <p className="min-w-0 flex-1 text-sm leading-5" style={{ fontWeight: 700 }}>{toast.message}</p>
          <button type="button" onClick={() => setToast(null)} className="shrink-0 opacity-70" aria-label="알림 닫기">
            <X size={16} />
          </button>
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-5">
          <div className="w-full max-w-sm rounded-3xl border border-[#2d3748]/10 bg-white p-5 shadow-2xl">
            <h2 className="text-lg text-[#1a202c]" style={{ fontWeight: 900 }}>{dialog.title}</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#4a5568]">{dialog.message}</p>
            {dialog.type === 'prompt' && (
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder={dialog.inputPlaceholder}
                autoFocus
                className="mt-4 w-full rounded-2xl border border-[#e2e8f0] bg-[#f7fafc] px-4 py-3 text-sm text-[#1a202c] outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#99f6e4]"
              />
            )}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => closeDialog(dialog.type === 'prompt' ? null : false)}
                className="rounded-2xl bg-[#f1f5f9] py-3 text-sm text-[#2d3748]"
                style={{ fontWeight: 800 }}
              >
                {dialog.cancelText || '취소'}
              </button>
              <button
                type="button"
                onClick={() => closeDialog(dialog.type === 'prompt' ? inputValue.trim() : true)}
                className="rounded-2xl bg-[#14b8a6] py-3 text-sm text-white"
                style={{ fontWeight: 900 }}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
