import FirstRunSetup from './components/common/FirstRunSetup';
import { useState, useEffect, useRef } from 'react';
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
import { API_ENDPOINTS, WS_BASE_URL, apiRequest, getNotificationUnreadCount, getNotifications } from './api/config';
import { listenForegroundMessages } from './firebase';

type Screen = 'landing' | 'login' | 'signup' | 'findId' | 'findPassword' | 'category' | 'main';
type MainView = 'board' | 'chat' | 'fridge' | 'profile';
type AppRoute = { screen: Screen; selectedCategory: string | null; mainView: MainView };

const APP_ROUTE_STATE_KEY = '__foodshareRoute';
const APP_ROUTE_INDEX_KEY = '__foodshareRouteIndex';
const ROOT_GUARD = '__foodshareRootGuard';
function prepareRootHistory(route: AppRoute, force = false) {
  if (window.history.state?.[ROOT_GUARD] === true && (!force || window.history.state?.[APP_ROUTE_STATE_KEY]?.screen === 'main')) return;
  const base = { ...window.history.state, [APP_ROUTE_STATE_KEY]: route, [APP_ROUTE_INDEX_KEY]: 0, __foodshareNestedDepth: 0, [ROOT_GUARD]: false };
  window.history.replaceState(base, '', window.location.href);
  window.history.pushState({ ...base, [ROOT_GUARD]: true }, '', window.location.href);
}

function isAppRoute(value: unknown): value is AppRoute {
  if (!value || typeof value !== 'object') return false;
  const route = value as Partial<AppRoute>;
  return ['landing', 'login', 'signup', 'findId', 'findPassword', 'category', 'main'].includes(String(route.screen))
    && ['board', 'chat', 'fridge', 'profile'].includes(String(route.mainView))
    && (route.selectedCategory === null || typeof route.selectedCategory === 'string');
}

function getInitialRoute(): AppRoute {
  // History state belongs to this tab/entry and survives a refresh. Read it
  // before URL defaults, which may still describe the original entry screen.
  const savedRoute = window.history.state?.[APP_ROUTE_STATE_KEY];
  if (!hasAuthSession()) {
    if (isAppRoute(savedRoute) && ['landing', 'login', 'signup', 'findId', 'findPassword'].includes(savedRoute.screen)) return savedRoute;
    return { screen: 'landing', selectedCategory: null, mainView: 'board' };
  }
  if (isAppRoute(savedRoute) && ['main', 'category'].includes(savedRoute.screen)) {
    if (savedRoute.screen === 'main') prepareRootHistory(savedRoute);
    return savedRoute;
  }

  const requestedScreen = new URLSearchParams(window.location.search).get('screen');
  const mainView: MainView = requestedScreen === 'chat'
    ? 'chat'
    : requestedScreen === 'fridge'
      ? 'fridge'
      : requestedScreen === 'profile' || requestedScreen === 'tradeHistory' || requestedScreen === 'notifications'
        ? 'profile'
        : 'board';

  const route: AppRoute = {screen: requestedScreen ? 'main' : 'category', selectedCategory: requestedScreen === 'groupBuy' ? '공동구매' : '시장', mainView};
  if (route.screen === 'main') prepareRootHistory(route, true);
  return route;
}

interface ChatToast {
  roomId?: number;
  senderNickname: string;
  content: string;
  clickAction?: string;
}

export default function App() {
  const [authVersion, setAuthVersion] = useState(0);
  useEffect(() => {
    const renewed = () => setAuthVersion((value) => value + 1);
    window.addEventListener('auth-token-refreshed', renewed);
    window.addEventListener('push-connected', renewed);
    return () => {window.removeEventListener('auth-token-refreshed', renewed);window.removeEventListener('push-connected', renewed);};
  }, []);
  const [initialRoute] = useState(getInitialRoute);
  const [exitHint, setExitHint] = useState(false);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (exitTimerRef.current) clearTimeout(exitTimerRef.current); }, []);
  const [currentScreen, setCurrentScreen] = useState<Screen>(initialRoute.screen);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialRoute.selectedCategory);
  const [mainView, setMainView] = useState<MainView>(initialRoute.mainView);
  const [chatRoomTargetId, setChatRoomTargetId] = useState<number | null>(() => {
    const roomId = Number(new URLSearchParams(window.location.search).get('roomId'));
    return initialRoute.mainView === 'chat' && new URLSearchParams(window.location.search).get('screen') === 'chat' && Number.isFinite(roomId) && roomId > 0 ? roomId : null;
  });
  const [postTargetId, setPostTargetId] = useState<number | null>(() => {
    const postId = Number(new URLSearchParams(window.location.search).get('postId'));
    return initialRoute.mainView === 'board' && initialRoute.selectedCategory === '시장' && new URLSearchParams(window.location.search).get('screen') === 'post' && Number.isFinite(postId) && postId > 0 ? postId : null;
  });
  const [profileTradeHistorySignal, setProfileTradeHistorySignal] = useState(0);
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [chatToast, setChatToast] = useState<ChatToast | null>(null);
  const notificationUnreadCountRef = useRef<number | null>(null);
  const appHistoryRef = useRef<{ route: AppRoute | null; index: number; suppressRoutePush: boolean }>({
    route: null,
    index: 0,
    suppressRoutePush: false,
  });

  useEffect(() => {
    const route: AppRoute = { screen: currentScreen, selectedCategory, mainView };
    const routeKey = JSON.stringify(route);
    const historyState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {};

    if (route.screen === 'main') {
      prepareRootHistory(route, Boolean(appHistoryRef.current.route && appHistoryRef.current.route.screen !== 'main'));
      setExitHint(false);
      // Bottom tabs replace the current root; they are not a navigation stack.
      window.history.replaceState({ ...window.history.state, [APP_ROUTE_STATE_KEY]: route, [APP_ROUTE_INDEX_KEY]: 0 }, '', window.location.href);
      appHistoryRef.current = { route, index: 0, suppressRoutePush: false };
      return;
    }

    if (!appHistoryRef.current.route) {
      const rootState = {
        ...historyState,
        [APP_ROUTE_STATE_KEY]: route,
        [APP_ROUTE_INDEX_KEY]: 0,
      };
      window.history.replaceState(rootState, '', window.location.href);
      appHistoryRef.current = { route, index: 0, suppressRoutePush: false };
      return;
    }

    if (appHistoryRef.current.suppressRoutePush) {
      appHistoryRef.current = { ...appHistoryRef.current, route, suppressRoutePush: false };
      return;
    }

    if (JSON.stringify(appHistoryRef.current.route) === routeKey) return;

    const nextIndex = Math.max(
      appHistoryRef.current.index,
      Number(window.history.state?.[APP_ROUTE_INDEX_KEY] ?? 0)
    ) + 1;
    window.history.pushState({
      ...historyState,
      [APP_ROUTE_STATE_KEY]: route,
      [APP_ROUTE_INDEX_KEY]: nextIndex,
    }, '', window.location.href);
    appHistoryRef.current = { route, index: nextIndex, suppressRoutePush: false };
  }, [currentScreen, selectedCategory, mainView]);

  useEffect(() => {
    const handleBackNavigation = (event: PopStateEvent) => {
      const state = event.state && typeof event.state === 'object' ? event.state : {};
      if (appHistoryRef.current.route?.screen === 'main' && state[ROOT_GUARD] === false) {
        const route = appHistoryRef.current.route;
        window.history.replaceState({ ...state, [APP_ROUTE_STATE_KEY]: route }, '', window.location.href);
        // Leave the guard consumed: the next physical Back belongs to the browser/OS.
        // Do not call window.close(), push another entry, or render a fake exit page.
        setExitHint(true);
        if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
        exitTimerRef.current = setTimeout(() => {
          setExitHint(false);
          if (window.history.state?.[ROOT_GUARD] === false && Number(window.history.state?.__foodshareNestedDepth ?? 0) === 0) {
            prepareRootHistory(appHistoryRef.current.route || route);
          }
        }, 2500);
        return;
      }
      if (appHistoryRef.current.route?.screen === 'main') return;
      const route = isAppRoute(state[APP_ROUTE_STATE_KEY])
        ? state[APP_ROUTE_STATE_KEY] as AppRoute
        : appHistoryRef.current.route || initialRoute;
      const index = Number(state[APP_ROUTE_INDEX_KEY] ?? appHistoryRef.current.index);
      const routeChanged = JSON.stringify(route) !== JSON.stringify(appHistoryRef.current.route);

      appHistoryRef.current = { route, index, suppressRoutePush: routeChanged };
      setCurrentScreen(route.screen);
      setSelectedCategory(route.selectedCategory);
      setMainView(route.mainView);
    };

    window.addEventListener('popstate', handleBackNavigation);
    return () => window.removeEventListener('popstate', handleBackNavigation);
  }, [initialRoute]);

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

  const refreshNotificationUnreadCount = async (showNewToast = false) => {
    if (!hasAuthSession()) {
      notificationUnreadCountRef.current = 0;
      return;
    }

    try {
      const unreadCount = await getNotificationUnreadCount();
      const previousCount = notificationUnreadCountRef.current;
      notificationUnreadCountRef.current = unreadCount;

      if (!showNewToast || previousCount === null || unreadCount <= previousCount) {
        return;
      }

      const response = await getNotifications(0, 5);
      const raw = response?.data?.content || response?.data || response?.content || response?.notifications || [];
      const latestUnread = Array.isArray(raw)
        ? raw.find((item: any) => !(item.read || item.isRead))
        : null;

      setChatToast({
        senderNickname: latestUnread?.title || '반띵 알림',
        content: latestUnread?.message || latestUnread?.body || '새 알림이 도착했습니다.',
        clickAction: latestUnread?.targetType === 'TRADE_REQUEST'
          ? '/?screen=tradeHistory'
          : '/?screen=notifications',
      });
    } catch {
      notificationUnreadCountRef.current = 0;
    }
  };

  const goBack = (fallbackScreen: Screen = 'landing') => {
    if (appHistoryRef.current.index > 0) {
      window.history.back();
      return;
    }
    setCurrentScreen(fallbackScreen);
  };

  const handleMainNavigate = (screen: string) => {
    if (screen === '시장' || screen === '나눔 및 판매' || screen === '공동구매') {
      setProfileTradeHistorySignal(0);
      setSelectedCategory(screen === '나눔 및 판매' ? '시장' : screen);
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
      const roomId = Number(url.searchParams.get('roomId'));
      setChatRoomTargetId(Number.isFinite(roomId) && roomId > 0 ? roomId : null);
      handleMainNavigate('chat');
      return;
    }
    if (screen === 'post') {
      const postId = Number(url.searchParams.get('postId'));
      if (Number.isFinite(postId) && postId > 0) {
        setPostTargetId(postId);
        setSelectedCategory('시장');
        setMainView('board');
      }
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
    const handleSessionCleared = () => {
      notificationUnreadCountRef.current = 0;
      setChatUnreadCount(0);
      setChatToast(null);
      setSelectedCategory(null);
      setMainView('board');
      setCurrentScreen('landing');
      const landingRoute: AppRoute = { screen: 'landing', selectedCategory: null, mainView: 'board' };
      const historyState = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
      window.history.replaceState({ ...historyState, [APP_ROUTE_STATE_KEY]: landingRoute, [APP_ROUTE_INDEX_KEY]: 0 }, '', window.location.href);
      appHistoryRef.current = { route: landingRoute, index: 0, suppressRoutePush: true };
    };

    window.addEventListener('auth-session-cleared', handleSessionCleared);
    return () => window.removeEventListener('auth-session-cleared', handleSessionCleared);
  }, []);

  useEffect(() => {
    if (currentScreen !== 'main') return;

    refreshChatUnreadCount();
    refreshNotificationUnreadCount(false);
    const timer = window.setInterval(() => {
      refreshChatUnreadCount();
      refreshNotificationUnreadCount(true);
    }, 10000);
    const handleFocus = () => {
      refreshChatUnreadCount();
      refreshNotificationUnreadCount(true);
    };

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
    let active = true;
    listenForegroundMessages((payload) => {
      const data = payload.data || {};
      setChatToast({
        senderNickname: data.title || payload.notification?.title || '반띵 알림',
        content: data.body || payload.notification?.body || '새 알림이 도착했습니다.',
        clickAction: data.clickAction || '/?screen=notifications',
      });
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setChatToast(null), 4500);
    }).then((stop) => { if (active) unsubscribe = stop; else stop(); }).catch((error) => console.warn('포그라운드 FCM 수신을 시작하지 못했습니다.', error));
    return () => {
      window.clearTimeout(toastTimer);
      active = false;
      unsubscribe?.();
    };
  }, [currentScreen, authVersion]);

  useEffect(() => {
    if (currentScreen !== 'main') return;

    let toastTimer: number | undefined;
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'FOODSHARE_PUSH_RECEIVED') return;
      const payload = event.data.payload || {};
      if (payload.type === 'CHAT_MESSAGE') return;

      setChatToast({
        senderNickname: payload.title || '반띵 알림',
        content: payload.body || '새 알림이 도착했습니다.',
        clickAction: payload.clickAction || '/?screen=notifications',
      });
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setChatToast(null), 4500);
    };

    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      window.clearTimeout(toastTimer);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [currentScreen, authVersion]);

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
  }, [currentScreen, mainView, authVersion]);

  const renderWithChatToast = (content: JSX.Element) => (
    <>
      {content}
      <FirstRunSetup />
      {exitHint && <div role="status" className="pointer-events-none fixed bottom-24 left-1/2 z-[150] w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/80 px-5 py-3 text-center text-sm text-white shadow-lg">한 번 더 뒤로가기를 누르면 종료됩니다</div>}

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
        onBack={() => goBack('landing')}
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
        onBack={() => goBack('landing')}
        onShowLogin={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'findId') {
    return (
      <FindIdScreen
        onBack={() => goBack('login')}
      />
    );
  }

  if (currentScreen === 'findPassword') {
    return (
      <FindPasswordScreen
        onBack={() => goBack('login')}
      />
    );
  }

  if (currentScreen === 'category') {
    return renderWithChatToast(
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
    return renderWithChatToast(<ChatScreen onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} onChatUnreadChange={setChatUnreadCount} initialRoomId={chatRoomTargetId} onInitialRoomHandled={() => setChatRoomTargetId(null)} />);
  }

  if (selectedCategory === '시장' || selectedCategory === '나눔 및 판매') {
    return renderWithChatToast(<SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} initialPostId={postTargetId} onInitialPostHandled={() => setPostTargetId(null)} />);
  }

  if (selectedCategory === '공동구매') {
    return renderWithChatToast(<GroupBuyingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} />);
  }

  return renderWithChatToast(<SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} chatUnreadCount={chatUnreadCount} initialPostId={postTargetId} onInitialPostHandled={() => setPostTargetId(null)} />);
}
