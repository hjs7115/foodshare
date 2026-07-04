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
import { hasAuthSession } from './auth/session';

type Screen = 'landing' | 'login' | 'signup' | 'findId' | 'findPassword' | 'category' | 'main';
type MainView = 'board' | 'fridge' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>('board');
  const [profileTradeHistorySignal, setProfileTradeHistorySignal] = useState(0);

  const handleMainNavigate = (screen: string) => {
    if (screen === '나눔 및 판매' || screen === '공동구매') {
      setSelectedCategory(screen);
      setMainView('board');
      return;
    }

    if (screen === 'tradeHistory') {
      setMainView('profile');
      setProfileTradeHistorySignal((value) => value + 1);
      return;
    }

    setMainView(screen as MainView);
  };

  useEffect(() => {
    if (hasAuthSession()) {
      setCurrentScreen('category');
    }
  }, []);

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
    return <ProfileScreen onNavigate={handleMainNavigate} openTransactionHistorySignal={profileTradeHistorySignal} />;
  }

  if (mainView === 'fridge') {
    return <FridgeScreen onNavigate={handleMainNavigate} />;
  }

  if (selectedCategory === '나눔 및 판매') {
    return <SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} />;
  }

  if (selectedCategory === '공동구매') {
    return <GroupBuyingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} />;
  }

  return <SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={handleMainNavigate} />;
}
