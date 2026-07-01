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

type Screen = 'landing' | 'login' | 'signup' | 'findId' | 'findPassword' | 'category' | 'main';
type MainView = 'board' | 'profile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [mainView, setMainView] = useState<MainView>('board');

  useEffect(() => {
    const autoLogin = localStorage.getItem('autoLogin');
    if (autoLogin === 'true') {
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
    return <ProfileScreen onNavigate={(screen) => setMainView(screen as MainView)} />;
  }

  if (selectedCategory === '나눔 및 판매') {
    return <SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={(screen) => setMainView(screen as MainView)} />;
  }

  if (selectedCategory === '공동구매') {
    return <GroupBuyingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={(screen) => setMainView(screen as MainView)} />;
  }

  return <SharingBoard onSwitchBoard={(board) => setSelectedCategory(board)} onNavigate={(screen) => setMainView(screen as MainView)} />;
}
