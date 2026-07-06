import { useState, useEffect } from 'react';
import {
  LandingScreen,
  LoginScreen,
  SignupScreen,
  FindIdScreen,
  FindPasswordScreen
} from './components/auth';
import { CategorySelectScreen } from './components/category';
import { SharingBoard, GroupBuyingBoard } from './components/board';
import { ProfileScreen } from './components/profile';
import { FridgeScreen } from './components/fridge';
import { ChatScreen } from './components/chat';
import { getAuthToken, hasAuthSession } from './auth/session';
import { API_ENDPOINTS, WS_BASE_URL, apiRequest } from './api/config';
import { listenForegroundMessages, registerFirebaseMessaging } from './firebase';

type Screen = 'landing' | 'login' | 'signup' | 'findId' | 'findPassword' | 'category' | 'main';
type MainView = 'board' | 'chat' | 'fridge' | 'profile';

interface ChatToast {
  roomId?: number;
  senderNickname: string;
  content: string;
  clickAction?: string;
}

function showSystemNotification(title: string, body: string, clickAction = '/') {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/assets/notification-icon-192.png',
    badge: '/assets/notification-badge-96.png',
    data: { clickAction },
  });

  notification.onclick = () => {
    window.focus();
    const target = new URL(clickAction, window.location.origin);
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    notification.close();
  };
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>('board');
  const [profileTradeHistorySignal, setProfileTradeHistorySignal] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState<ChatToast | null>(null);

  const refreshChatUnreadCount = async () => {
    if (!hasAuthSession()) {
      setChatUnreadCount(0);
      return;
    }

    try {
      const response = await apiRequest(`${API_ENDPOINTS.chatRooms}?filter=ALL`, { method: 'GET' });
      const raw = response?.data?.content || response?.data || response?.rooms || response?.chatRooms || response;
      const total = Array.isArray(raw)
        ? raw.reduce((sum, room) => sum + Number(room.unreadCount ?? 0), 0)
        : 0;
      setChatUnreadCount(total);
    } catch {
      setChatUnreadCount(0);
    }
  };

  const handleMainNavigate = (screen: string) => {
    if (screen === '나눔 및 판매' || screen === '공동구매') {
      setProfileTradeHistorySignal(0);
      setSelectedCategory(screen);
      setMainView('board');
      return;
    }

    if (screen === 'tradeHistory') {
      setMainView('profile');
      setProfileTradeHistorySignal((value) => value + 1);
      return;
    }

    if (screen === 'profile') {
      setProfileTradeHistorySignal(0);
    }

    setMainView(screen as MainView);
  };

  const openNotificationAction = (clickAction?: string) => {
    if (!clickAction) {
      return;
    }

    const url = new URL(clickAction, window.location.origin);
    const screen = url.searchParams.get('screen');
    if (screen === 'chat') {
      handleMainNavigate('chat');
      return;
    }
    if (screen === 'tradeHistory') {
      handleMainNavigate('tradeHistory');
      return;
    }
    if (screen === 'profile') {
      handleMainNavigate('profile');
      return;
    }
    if (screen === 'notifications') {
      handleMainNavigate('profile');
    }
  };

  useEffect(() => {
    if (hasAuthSession()) {
      setCurrentScreen('category');
    }
  }, []);

  useEffect(() => {
    if (currentScreen !== 'main') return;

    refreshChatUnreadCount();
    registerFirebaseMessaging().catch(() => null);
    const timer = window.setInterval(refreshChatUnreadCount, 10000);
    const handleFocus = () => refreshChatUnreadCount();

    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen !== 'main') return;

    let unsubscribe: (() => void) | undefined;
    let toastTimer: number | undefined;

    listenForegroundMessages((payload) => {
      const type = payload.data?.type || '';
      if (type === 'CHAT_MESSAGE') {
        showSystemNotification(
          payload.notification?.title || '새 채팅',
          payload.notification?.body || '새 채팅이 도착했습니다.',
          payload.data?.clickAction || '/?screen=chat'
        );
        return;
      }

      setChatToast({
        senderNickname: payload.notification?.title || '반띵 알림',
        content: payload.notification?.body || '새 알림이 도착했습니다.',
        clickAction: payload.data?.clickAction || '/?screen=notifications',
      });
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setChatToast(null), 4500);
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => {
      window.clearTimeout(toastTimer);
      unsubscribe?.();
    };
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen !== 'main') return;

    const token = getAuthToken();
    if (!token) return;

    const socket = new WebSocket(`${WS_BASE_URL}/ws/chat?token=${encodeURIComponent(token)}`);
    let toastTimer: number | undefined;

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type !== 'CHAT_NOTIFICATION') return;

        const message = payload.message || {};
        if (!message.senderId || mainView === 'chat') {
          refreshChatUnreadCount();
          return;
        }

        const toast = {
          roomId: Number(payload.roomId ?? message.chatRoomId),
          senderNickname: message.senderNickname || '상대방',
          content: message.content || '새 메시지가 도착했습니다.',
          clickAction: `/?screen=chat&roomId=${Number(payload.roomId ?? message.chatRoomId)}`,
        };

        setChatUnreadCount((count) => count + 1);
        setChatToast(toast);
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => setChatToast(null), 4500);

      } catch (error) {
        console.warn('채팅 알림 처리 실패', error);
      }
    };

    socket.onerror = () => {
      console.warn('채팅 알림 소켓 연결에 실패했습니다.');
    };

    return () => {
      window.clearTimeout(toastTimer);
      socket.close();
    };
  }, [currentScreen, mainView]);

  const renderWithChatToast = (content: JSX.Element) => (
    <>
      {content}
      {chatToast && (
        <button
          type="button"
          onClick={() => {
            setChatToast(null);
            if (chatToast.clickAction) {
              openNotificationAction(chatToast.clickAction);
              return;
            }
            handleMainNavigate('chat');
          }}
          className="fixed left-4 right-4 top-4 z-[90] rounded-2xl border border-[#99f6e4] bg-white px-4 py-3 text-left shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ccfbf1] text-[#14b8a6]">
              채팅
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#1a202c]" style={{ fontWeight: 900 }}>{chatToast.senderNickname}</p>
              <p className="mt-0.5 line-clamp-2 text-sm text-[#4a5568]">{chatToast.content}</p>
            </div>
          </div>
        </button>
      )}
    </>
  );

  if (currentScreen === 'landing') {
    return (
      <LandingScreen
        onShowLogin={() => setCurrentScreen('login')}
        onShowSignup={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onLogin={() => setCurrentScreen('category')}
        onBack={() => setCurrentScreen('landing')}
        onFindId={() => setCurrentScreen('findId')}
        onFindPassword={() => setCurrentScreen('findPassword')}
        onShowSignup={() => setCurrentScreen('signup')}
      />
    );
  }

  if (currentScreen === 'signup') {
    return (
      <SignupScreen
        onSignup={() => setCurrentScreen('login')}
        onBack={() => setCurrentScreen('landing')}
        onShowLogin={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'findId') {
    return (
      <FindIdScreen
        onBack={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'findPassword') {
    return (
      <FindPasswordScreen
        onBack={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'category') {
    return (
      <CategorySelectScreen
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setCurrentScreen('main');
        }}
      />
    );
  }

  if (mainView === 'profile') {
    return renderWithChatToast(<ProfileScreen onNavigate={handleMainNavigate} openTransactionHistorySignal={profileTradeHistorySignal} chatUnreadCount={chatUnreadCount} />);
  }

  if (mainView === 'fridge') {
    return renderWithChatToast(<FridgeScreen onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} />);
  }

  if (mainView === 'chat') {
    return renderWithChatToast(<ChatScreen onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} onChatUnreadChange={setChatUnreadCount} />);
  }

  if (selectedCategory === '나눔 및 판매') {
    return renderWithChatToast(<SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} />);
  }

  if (selectedCategory === '공동구매') {
    return renderWithChatToast(<GroupBuyingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} />);
  }

  return renderWithChatToast(<SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} />);
}
