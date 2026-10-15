import { useEffect, useState } from 'react';
import { API_ENDPOINTS, apiRequest } from '../../api/config';
import { getSessionRevision, getStoredUserInfo, saveStoredUserInfo } from '../../auth/session';
import { registerFirebaseMessaging } from '../../firebase';
import { currentLocation, hasLocationCoordinates, saveLocationFromUser } from '../../utils/location';
import { showToast } from '../../utils/feedback';
import LocationSettingsScreen from '../profile/LocationSettingsScreen';

function iosBrowser() {
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  return ios && !(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);
}
export default function FirstRunSetup() {
  const [stage,setStage]=useState<'loading'|'location'|'editor'|'push'|'done'>('loading');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const next=()=>{
    const snoozed=Number(localStorage.getItem('push-onboarding-snooze')||0)>Date.now();
    const allowed=typeof Notification!=='undefined' && Notification.permission==='granted';
    // Permission belongs to the browser; logout removes the account's token only.
    // Restore that connection without asking for consent a second time.
    if (allowed) {
      setStage('done');
      void registerFirebaseMessaging().then(connected => {
        if (!connected) showToast('알림 자동 연결을 완료하지 못했어요. 설정 → 알림 설정에서 다시 연결해주세요.', 'error');
      }).catch(() => showToast('알림 자동 연결에 실패했어요. 설정 → 알림 설정에서 다시 연결해주세요.', 'error'));
      return;
    }
    setStage(snoozed ? 'done':'push');
  };
  useEffect(()=>{
    let active=true;const revision=getSessionRevision();
    apiRequest(API_ENDPOINTS.getProfile,{method:'GET',signal:AbortSignal.timeout(10000)}).then(response=>{
      if(!active || getSessionRevision()!==revision)return;
      const user=response?.data?.user || response?.user;
      if(user){ saveStoredUserInfo({...getStoredUserInfo(),...user});saveLocationFromUser(user); }
    }).catch(()=>{if(active)setMessage('저장된 정보를 불러오지 못했어요. 위치를 확인해주세요.');}).finally(()=>{
      if(!active || getSessionRevision()!==revision)return;
      if(!hasLocationCoordinates() && !sessionStorage.getItem('location-setup-skipped'))setStage('location');else next();
    });
    return ()=>{active=false};
  },[]);
  const enable=async()=>{
    setBusy(true);setMessage('');
    try {
      const connected=await registerFirebaseMessaging({requestPermission:true});
      if(connected){setStage('done');return;}
      setMessage(typeof Notification!=='undefined' && Notification.permission==='denied'
        ? '알림이 차단되어 있어요. 기기 또는 브라우저 설정에서 반띵 알림을 허용한 뒤 다시 연결해주세요.'
        : '알림을 허용하면 채팅과 거래 요청을 알려드릴 수 있어요.');
    } catch(error:any){setMessage(error.message || '알림 연결에 실패했습니다. 다시 시도해주세요.');}
    finally{setBusy(false);}
  };
  if(stage==='done')return null;
  if(stage==='editor')return <LocationSettingsScreen onClose={()=>{setMessage('');setStage('location')}} />;
  const locationStage=stage==='location';
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-5" role="dialog" aria-modal="true" aria-labelledby="setup-heading">
    <section className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
      <h2 id="setup-heading" className="text-xl font-bold text-[#243b2e]">{stage==='loading'?'내 설정을 확인하고 있어요':locationStage?'먼저 우리 동네를 설정해요':'채팅과 거래 알림을 받을까요?'}</h2>
      {stage!=='loading' && <>
        <p className="my-4 text-sm leading-6 text-[#52616b]">{locationStage
          ? `현재 위치: ${currentLocation()}. 동네를 설정하면 가까운 식재료를 찾을 수 있어요.`
          : iosBrowser()?'아이폰은 Safari에서 공유 → 홈 화면에 추가 후, 반띵 아이콘으로 실행해야 알림을 연결할 수 있어요.'
          :'새 채팅과 거래 요청을 놓치지 않도록 이 기기의 알림을 연결해주세요. 다음 화면에서 알림을 허용하면 돼요.'}</p>
        {message && <p className="mb-4 text-sm leading-6 text-[#9a5310]" role="status">{message}</p>}
        <button disabled={busy} onClick={locationStage?()=>{setMessage('');setStage('editor')}:enable} className="w-full rounded-xl bg-[#bef264] px-4 py-3 font-semibold text-[#163323] disabled:opacity-50">{locationStage?'위치 설정하기':busy?'연결 중…':'알림 켜기'}</button>
        {locationStage && hasLocationCoordinates() && <button onClick={()=>{setMessage('');next()}} className="mt-3 w-full rounded-xl border border-[#b7d89b] py-3 text-[#34562b]">이 위치로 계속하기</button>}
        <button disabled={busy} onClick={()=>{
          if(locationStage){sessionStorage.setItem('location-setup-skipped','true');setMessage('');next();}
          else{localStorage.setItem('push-onboarding-snooze',String(Date.now()+7*86400000));setStage('done');}
        }} className="mt-3 w-full py-2 text-sm text-[#637568]">{locationStage?'나중에 설정하기':'나중에'}</button>
      </>}
    </section>
  </div>;
}
