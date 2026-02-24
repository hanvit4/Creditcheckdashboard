import { useEffect, useState } from 'react';
import { ArrowLeft, Award, Calendar, TrendingUp, Settings, LogOut, CheckCircle2, Link2, ChevronRight, Bell } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import * as api from '../utils/api';
import AdBanner from './AdBanner';
import { toast } from 'sonner';
import ChurchRegistration, { Church } from './ChurchRegistration';

interface ProfileTabProps {
  credits?: number;
  todayEarned?: number;
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  church?: string;
  onChurchUpdated?: (church: string) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  bibleTranslation?: api.BibleTranslation;
  onChangeBibleTranslation?: (translation: api.BibleTranslation) => void;
  onOpenSocialLink?: () => void;
  totalVersesCompleted?: number;
  consecutiveDays?: number;
  canCheckIn?: boolean;
}

export default function ProfileTab({
  credits = 0,
  todayEarned = 0,
  nickname = '사용자',
  email = '',
  avatarUrl = '',
  church = '',
  onChurchUpdated,
  isDarkMode = false,
  onToggleDarkMode,
  bibleTranslation = 'nkrv',
  onChangeBibleTranslation,
  onOpenSocialLink,
  totalVersesCompleted = 0,
  consecutiveDays = 0,
  canCheckIn = true,
}: ProfileTabProps) {
  const profileInitial = (nickname?.trim()?.charAt(0) || 'U').toUpperCase();
  const [isAvatarError, setIsAvatarError] = useState(false);
  const profileImageSrc = avatarUrl && !isAvatarError ? avatarUrl : '/app-icon.svg';
  const [showChurchRegistration, setShowChurchRegistration] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const [showNoticeMenu, setShowNoticeMenu] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [isSavingChurch, setIsSavingChurch] = useState(false);

  // Sample notices data - 나중에 API/DB로 대체 가능
  interface Notice {
    id: string;
    title: string;
    content: string;
    date: string;
    isImportant?: boolean;
  }

  const notices: Notice[] = [
    {
      id: '1',
      title: '서비스 점검 안내',
      content: '2월 25일 자정 ~ 새벽 1시에 시스템 점검이 예정되어 있습니다. 이 시간에는 서비스를 이용하실 수 없으니 참고 부탁드립니다.',
      date: '2월 24일',
      isImportant: true,
    },
    {
      id: '2',
      title: '새로운 번역본 추가',
      content: '새로운 성경 번역본이 추가되었습니다. 이제 더 다양한 번역본으로 필사를 진행할 수 있습니다.',
      date: '2월 20일',
    },
    {
      id: '3',
      title: '달란트 마켓 오픈 예정',
      content: '달란트 마켓이 곧 오픈될 예정입니다. 획득한 포인트로 다양한 상품을 교환할 수 있게 됩니다.',
      date: '2월 15일',
    },
  ];

  const translationOptions: { value: api.BibleTranslation; label: string }[] = [
    { value: 'nkrv', label: '개역개정' },
    { value: 'krv', label: '개역한글' },
    { value: 'kor', label: '새번역' },
  ];

  const currentTranslationLabel = translationOptions.find((opt) => opt.value === bibleTranslation)?.label || '개역개정';

  useEffect(() => {
    // reserved for church-related state sync
  }, [church]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      // App 컴포넌트에서 supabase.auth.onAuthStateChange로 인증 상태를 감지하고
      // 로그인 화면으로 돌아가므로 여기서는 추가 네비게이션이 필요 없습니다.
      // 필요하면 강제 리로드: window.location.reload();
    } catch (error) {
      console.error('로그아웃 에러:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  const handleChurchComplete = async (selectedChurch: Church) => {
    const trimmed = selectedChurch.name.trim();
    setIsSavingChurch(true);
    onChurchUpdated?.(trimmed);
    setShowChurchRegistration(false);
    setIsSavingChurch(false);
    toast.success('소속 교회가 반영되었습니다.');
  };

  if (showChurchRegistration) {
    const currentChurches: Church[] = church
      ? [{
        id: 'current',
        name: church,
        address: '등록된 주소 없음',
        city: '기타',
        district: '-',
        phone: '-',
        memberCount: 0,
        pastor: '-',
        denomination: '-',
      }]
      : [];

    return (
      <ChurchRegistration
        onBack={() => setShowChurchRegistration(false)}
        onComplete={handleChurchComplete}
        currentChurches={currentChurches}
      />
    );
  }

  // 공지사항 상세 보기
  if (showNoticeMenu && selectedNotice) {
    return (
      <div className="min-h-screen bg-[#fef7ff]">
        <div className="max-w-[360px] mx-auto w-full min-h-screen bg-white flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#e7e0ec]">
            <div className="flex items-center px-4 h-14">
              <button
                onClick={() => setSelectedNotice(null)}
                className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
              </button>
              <h1 className="flex-1 text-[#1d1b20] text-lg font-semibold ml-2">공지사항</h1>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedNotice.isImportant && (
              <div className="mb-4 p-3 bg-[#ffebee] rounded-[12px] flex items-start gap-2">
                <span className="px-2 py-1 bg-[#ba1a1a] text-white text-xs font-bold rounded">중요</span>
              </div>
            )}
            <h2 className="text-[#1d1b20] text-2xl font-bold mb-2">{selectedNotice.title}</h2>
            <p className="text-[#79747e] text-sm mb-6">{selectedNotice.date}</p>
            <div className="text-[#1d1b20] text-base leading-relaxed whitespace-pre-wrap">
              {selectedNotice.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 공지사항 목록
  if (showNoticeMenu) {
    return (
      <div className="min-h-screen bg-[#fef7ff]">
        <div className="max-w-[360px] mx-auto w-full min-h-screen bg-white flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-[#e7e0ec]">
            <div className="flex items-center px-4 h-14">
              <button
                onClick={() => setShowNoticeMenu(false)}
                className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
              </button>
              <h1 className="flex-1 text-[#1d1b20] text-lg font-semibold ml-2">공지사항</h1>
            </div>
          </div>

          {/* Notice List */}
          <div className="p-4 space-y-2">
            {notices.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-8 h-8 text-[#d0bcff] mx-auto mb-3" />
                <p className="text-[#79747e]">공지사항이 없습니다</p>
              </div>
            ) : (
              notices.map((notice) => (
                <button
                  key={notice.id}
                  onClick={() => setSelectedNotice(notice)}
                  className="w-full text-left bg-white rounded-[12px] p-4 border border-[#e7e0ec] hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {notice.isImportant && (
                          <span className="px-2 py-0.5 bg-[#ba1a1a] text-white text-xs font-bold rounded">
                            중요
                          </span>
                        )}
                        <h3 className="text-[#1d1b20] font-semibold text-base flex-1">{notice.title}</h3>
                      </div>
                      <p className="text-[#79747e] text-xs mb-1">{notice.date}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[#79747e] flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showSettingsMenu) {
    if (showTranslationMenu) {
      return (
        <div className="min-h-screen bg-[#fef7ff]">
          <div className="max-w-[360px] mx-auto w-full min-h-screen bg-white flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-[#e7e0ec]">
              <div className="flex items-center px-4 h-14">
                <button
                  onClick={() => setShowTranslationMenu(false)}
                  className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
                </button>
                <h1 className="flex-1 text-[#1d1b20] text-lg font-semibold ml-2">성경 번역본</h1>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-white rounded-[16px] shadow-sm divide-y divide-[#e7e0ec] border border-[#f1edf4]">
                {translationOptions.map((option) => {
                  const selected = bibleTranslation === option.value;
                  return (
                    <button
                      key={option.value}
                      onClick={() => onChangeBibleTranslation?.(option.value)}
                      className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]"
                    >
                      <span className={`font-medium text-base ${selected ? 'text-[#6750a4]' : 'text-[#1d1b20]'}`}>
                        {option.label}
                      </span>
                      {selected && <CheckCircle2 className="w-5 h-5 text-[#6750a4]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#fef7ff]">
        <div className="max-w-[360px] mx-auto w-full min-h-screen bg-white flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b border-[#e7e0ec]">
            <div className="flex items-center px-4 h-14">
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
              </button>
              <h1 className="flex-1 text-[#1d1b20] text-lg font-semibold ml-2">설정</h1>
            </div>
          </div>

          <div className="p-4">
            <div className="bg-white rounded-[16px] shadow-sm divide-y divide-[#e7e0ec] border border-[#f1edf4]">
              <button
                onClick={onToggleDarkMode}
                className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8] first:rounded-t-[16px]"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#49454f]" />
                  <span className="text-[#1d1b20] font-medium text-base">다크 모드</span>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${isDarkMode ? 'bg-[#6750a4]' : 'bg-[#d0bcff]'}`}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </div>
              </button>

              <button
                onClick={onOpenSocialLink}
                className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]"
              >
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-[#49454f]" />
                  <span className="text-[#1d1b20] font-medium text-base">소셜 계정 연동</span>
                </div>
                <ChevronRight className="w-5 h-5 text-[#79747e]" />
              </button>

              <button
                onClick={() => setShowTranslationMenu(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-[#49454f]" />
                  <span className="text-[#1d1b20] font-medium text-base">성경 번역본</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#79747e] text-sm">{currentTranslationLabel}</span>
                  <ChevronRight className="w-5 h-5 text-[#79747e]" />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-4">
      {/* Profile Header */}
      <div className="text-center mb-6">
        <div className="relative w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 bg-[#e8def8]">
          <img
            src={profileImageSrc}
            alt={`${nickname} 프로필 이미지`}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 max-w-none"
            onError={() => setIsAvatarError(true)}
          />
        </div>
        <h1 className="text-[#1d1b20] text-2xl font-bold mb-1">{nickname}님</h1>
        <p className="text-[#49454f] text-sm">{email || '이메일 정보 없음'}</p>
      </div>

      {/* Credit Card */}
      <div className="bg-gradient-to-br from-[#6750a4] to-[#7965af] rounded-[20px] p-6 shadow-lg mb-4">
        <div className="flex items-baseline justify-center mb-2">
          <span className="credit-text-primary text-5xl font-bold">{credits.toLocaleString()}</span>
          <span className="credit-text-secondary text-2xl ml-2">C</span>
        </div>
        <p className="credit-text-secondary text-sm text-center mb-4">내 크레딧</p>
        <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
          <TrendingUp className="w-4 h-4 credit-text-primary" />
          <span className="credit-text-primary text-sm font-medium">
            오늘 +{todayEarned}C 획득
          </span>
        </div>
      </div>

      {/* Church Info Card */}
      <div className="bg-white rounded-[16px] p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[#1d1b20] font-semibold text-base mb-1">
              소속 교회
            </h3>
            <p className="text-[#49454f] text-sm">{church || '등록된 교회가 없습니다'}</p>
          </div>
          <button
            onClick={() => setShowChurchRegistration(true)}
            disabled={isSavingChurch}
            className="px-4 py-2 bg-[#e8def8] text-[#6750a4] rounded-full text-sm font-medium hover:bg-[#d0bcff] transition-all active:scale-95 disabled:opacity-60"
          >
            {church ? '관리하기' : '등록하기'}
          </button>
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white rounded-[16px] shadow-sm divide-y divide-[#e7e0ec] mb-4">
        <button
          onClick={() => setShowSettingsMenu(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8] first:rounded-t-[16px]"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#49454f]" />
            <span className="text-[#1d1b20] font-medium text-base">설정</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#79747e]" />
        </button>

        <button
          onClick={() => setShowNoticeMenu(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-[#49454f]" />
            <span className="text-[#1d1b20] font-medium text-base">공지사항</span>
          </div>
          <ChevronRight className="w-5 h-5 text-[#79747e]" />
        </button>

        <button className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8]">
          <div className="flex items-center gap-3">
            <Award className="w-5 h-5 text-[#49454f]" />
            <span className="text-[#1d1b20] font-medium text-base">달란트 마켓</span>
          </div>
          <span className="px-2 py-1 bg-[#ffd600] text-[#1d1b20] text-xs font-bold rounded-full">
            준비중
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-[#f5f5f5] transition-colors active:bg-[#e8e8e8] last:rounded-b-[16px]"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5 text-[#ba1a1a]" />
            <span className="text-[#ba1a1a] font-medium text-base">로그아웃</span>
          </div>
        </button>
      </div>

      {/* AdSense Banner */}
      <div className="mb-4">
        <AdBanner
          slot="your-ad-slot-id-here"
          format="auto"
          responsive={true}
          className="bg-[#f5f5f5] rounded-[16px] overflow-hidden"
        />
      </div>

      {/* Version Info */}
      <p className="text-center text-[#79747e] text-xs">
        버전 1.0.0 · Beta
      </p>
    </div>
  );
}
