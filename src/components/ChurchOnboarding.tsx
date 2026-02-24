import { useEffect, useMemo, useState } from 'react';
import { Church, Users, TrendingUp, Heart, MapPin, Search, List, Map, Plus, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';
import { toast } from 'sonner';

export interface ChurchData {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string;
    phone: string;
    memberCount: number;
    pastor: string;
    denomination: string;
}

interface ChurchOnboardingProps {
    onComplete: (hasChurch: boolean, church?: ChurchData) => void;
}

export default function ChurchOnboarding({ onComplete }: ChurchOnboardingProps) {
    const [hasChurch, setHasChurch] = useState<boolean | null>(null);
    const [searchTab, setSearchTab] = useState<'list' | 'map'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>('전체');
    const [selectedChurch, setSelectedChurch] = useState<ChurchData | null>(null);
    const [showRegistrationOptions, setShowRegistrationOptions] = useState(false);
    const [churches, setChurches] = useState<ChurchData[]>([]);
    const [isLoadingChurches, setIsLoadingChurches] = useState(false);

    const cities = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산'];

    useEffect(() => {
        const loadChurches = async () => {
            try {
                setIsLoadingChurches(true);
                const res = await api.getChurches();
                const mapped: ChurchData[] = (res.churches || []).map((church) => ({
                    id: church.id,
                    name: church.name,
                    address: church.address,
                    city: church.city,
                    district: church.district || '',
                    phone: church.phone || '',
                    memberCount: church.memberCount || 0,
                    pastor: church.pastor || '-',
                    denomination: church.denomination || '-',
                }));
                setChurches(mapped);
            } catch (error) {
                console.error('교회 목록 로드 실패:', error);
                toast.error('교회 목록을 불러오지 못했습니다.');
            } finally {
                setIsLoadingChurches(false);
            }
        };

        loadChurches();
    }, []);

    const filteredChurches = useMemo(() => churches.filter((church) => {
        const matchesSearch = church.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            church.address.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCity = selectedCity === '전체' || church.city === selectedCity;
        return matchesSearch && matchesCity;
    }), [churches, searchQuery, selectedCity]);

    const handleSelectChurch = (church: ChurchData) => {
        setSelectedChurch(church);
    };

    const handleCompleteWithChurch = () => {
        if (selectedChurch) {
            onComplete(true, selectedChurch);
        }
    };

    const handleCompleteWithoutChurch = () => {
        onComplete(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#fef7ff] to-white">
            <div className="max-w-[360px] mx-auto w-full min-h-screen flex flex-col">
                <div className="px-4 pt-12 pb-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#6750a4] to-[#7f67be] rounded-full flex items-center justify-center mx-auto mb-4">
                        <Church className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-[#1d1b20] text-2xl font-bold mb-2">환영합니다!</h1>
                    <p className="text-[#49454f] text-base">현재 다니고 있는 교회가 있나요?</p>
                </div>

                <AnimatePresence mode="wait">
                    {hasChurch === null && (
                        <motion.div
                            key="selection"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col px-4 justify-center"
                        >
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <motion.button
                                    onClick={() => setHasChurch(true)}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-[#6750a4] text-white rounded-[16px] p-6 shadow-lg hover:shadow-xl transition-all"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                            <Church className="w-8 h-8 text-white" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-white font-bold text-xl mb-1">있어요</p>
                                            <p className="text-white/80 text-xs leading-relaxed">교회에 등록하고 함께해요</p>
                                        </div>
                                    </div>
                                </motion.button>

                                <motion.button
                                    onClick={() => setHasChurch(false)}
                                    whileTap={{ scale: 0.98 }}
                                    className="bg-white border-2 border-[#e7e0ec] text-[#1d1b20] rounded-[16px] p-6 shadow-sm hover:border-[#6750a4] hover:shadow-md transition-all"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 bg-[#e8def8] rounded-full flex items-center justify-center">
                                            <Users className="w-8 h-8 text-[#6750a4]" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[#1d1b20] font-bold text-xl mb-1">없어요</p>
                                            <p className="text-[#49454f] text-xs leading-relaxed">혼자서도 시작할 수 있어요</p>
                                        </div>
                                    </div>
                                </motion.button>
                            </div>
                        </motion.div>
                    )}

                    {hasChurch === false && (
                        <motion.div
                            key="no-church"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col px-4"
                        >
                            <div className="space-y-3 mb-6">
                                <div className="bg-white rounded-[16px] p-4 shadow-sm border border-[#e7e0ec]">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <TrendingUp className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-[#1d1b20] font-semibold text-sm mb-1">더 많은 크레딧 한도</h3>
                                            <p className="text-[#49454f] text-xs">교회 등록 시 일일 크레딧 한도가 증가해요</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[16px] p-4 shadow-sm border border-[#e7e0ec]">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <Users className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-[#1d1b20] font-semibold text-sm mb-1">교인들과 함께</h3>
                                            <p className="text-[#49454f] text-xs">같은 교회 교인들의 필사 현황을 보고 함께 성장해요</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[16px] p-4 shadow-sm border border-[#e7e0ec]">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <Heart className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-[#1d1b20] font-semibold text-sm mb-1">교회 소식 받기</h3>
                                            <p className="text-[#49454f] text-xs">교회 공지사항과 예배 정보를 앱으로 받아보세요</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#fff3e0] border border-[#ffb74d] rounded-[12px] p-4 mb-6">
                                <p className="text-[#1d1b20] text-xs leading-relaxed">
                                    ℹ️ <span className="font-medium">나중에도 등록할 수 있어요</span>
                                    <br />
                                    <span className="text-[#49454f] text-xs">지금 건너뛰어도 '내 정보' 메뉴에서 언제든지 교회를 등록할 수 있습니다.</span>
                                </p>
                            </div>

                            <div className="space-y-3 mt-auto mb-6">
                                <button
                                    onClick={handleCompleteWithoutChurch}
                                    className="w-full py-4 bg-[#6750a4] text-white rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:scale-98"
                                >
                                    시작하기
                                </button>
                                <button
                                    onClick={() => setHasChurch(null)}
                                    className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors"
                                >
                                    이전으로
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {hasChurch === true && (
                        <motion.div
                            key="has-church"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            <div className="px-4 pb-4">
                                <div className="bg-[#f5f5f5] rounded-full p-1 flex">
                                    <button
                                        onClick={() => setSearchTab('list')}
                                        className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${searchTab === 'list' ? 'bg-white text-[#1d1b20] shadow-sm' : 'text-[#49454f]'
                                            }`}
                                    >
                                        <List className="w-4 h-4" />
                                        목록으로 찾기
                                    </button>
                                    <button
                                        onClick={() => setSearchTab('map')}
                                        className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-all flex items-center justify-center gap-2 ${searchTab === 'map' ? 'bg-white text-[#1d1b20] shadow-sm' : 'text-[#49454f]'
                                            }`}
                                    >
                                        <Map className="w-4 h-4" />
                                        지도에서 찾기
                                    </button>
                                </div>
                            </div>

                            {searchTab === 'list' && (
                                <>
                                    <div className="px-4 pb-4">
                                        <div className="relative rounded-[14px] border border-[#e7e0ec] bg-white shadow-sm">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#79747e]" />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="교회 이름 또는 주소 검색"
                                                className="w-full pl-11 pr-4 py-3 bg-transparent rounded-[14px] text-[#1d1b20] text-sm placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]/30"
                                            />
                                        </div>
                                    </div>

                                    <div className="px-4 pb-4">
                                        <div className="w-full max-w-full overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                                            <div className="flex w-max min-w-full gap-2 pr-4">
                                                {cities.map((city) => (
                                                    <button
                                                        key={city}
                                                        onClick={() => setSelectedCity(city)}
                                                        className={`w-[60px] h-[40px] rounded-full text-xs font-medium whitespace-nowrap shrink-0 border transition-all flex items-center justify-center ${selectedCity === city ? 'bg-[#6750a4] border-[#6750a4] text-white' : 'bg-white border-[#e7e0ec] text-[#49454f] hover:bg-[#f5f5f5]'
                                                            }`}
                                                    >
                                                        {city}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 pb-4">
                                        <div className="h-[300px] overflow-y-auto pr-1">
                                            {isLoadingChurches ? (
                                                <div className="text-center py-12 text-[#79747e] text-sm">교회 목록 불러오는 중...</div>
                                            ) : filteredChurches.length === 0 ? (
                                                <div className="text-center py-12">
                                                    <div className="w-16 h-16 bg-[#e8def8] rounded-full flex items-center justify-center mx-auto mb-4">
                                                        <Search className="w-8 h-8 text-[#6750a4]" />
                                                    </div>
                                                    <p className="text-[#49454f] text-sm">검색 결과가 없습니다</p>
                                                    <p className="text-[#79747e] text-xs mt-1">다른 검색어를 입력해주세요</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {filteredChurches.map((church) => (
                                                        <motion.button
                                                            key={church.id}
                                                            onClick={() => handleSelectChurch(church)}
                                                            whileTap={{ scale: 0.98 }}
                                                            className={`w-full rounded-[16px] p-4 transition-all text-left ${selectedChurch?.id === church.id
                                                                ? 'bg-[#e8def8] border-2 border-[#6750a4] shadow-md'
                                                                : 'bg-white border border-[#e7e0ec] hover:border-[#6750a4] hover:shadow-sm'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <h3 className="text-[#1d1b20] font-semibold text-base mb-1">{church.name}</h3>
                                                                    <div className="flex items-center gap-1 text-[#49454f] text-xs mb-1">
                                                                        <MapPin className="w-3.5 h-3.5" />
                                                                        <span>{church.address}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3 mt-2">
                                                                        <div className="flex items-center gap-1 text-[#79747e] text-xs">
                                                                            <Users className="w-3.5 h-3.5" />
                                                                            <span>{church.memberCount}명</span>
                                                                        </div>
                                                                        <span className="text-[#79747e] text-xs">{church.pastor}</span>
                                                                    </div>
                                                                </div>
                                                                {selectedChurch?.id === church.id && (
                                                                    <div className="w-6 h-6 bg-[#6750a4] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {searchTab === 'map' && (
                                <div className="flex-1 px-4 pb-4">
                                    <div className="bg-[#e8def8] rounded-[16px] h-[300px] flex items-center justify-center">
                                        <div className="text-center">
                                            <Map className="w-16 h-16 text-[#6750a4] mx-auto mb-4" />
                                            <p className="text-[#1d1b20] font-medium mb-2">지도 기능</p>
                                            <p className="text-[#49454f] text-sm">카카오맵 API 연동 예정</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="border-t border-[#e7e0ec] bg-white">
                                {selectedChurch && (
                                    <div className="px-4 pt-4">
                                        <div className="bg-[#e8def8] rounded-[12px] p-3 mb-3">
                                            <p className="text-[#6750a4] text-xs font-medium mb-1">선택된 교회</p>
                                            <p className="text-[#1d1b20] font-semibold text-sm">{selectedChurch.name}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 space-y-2">
                                    {selectedChurch ? (
                                        <button
                                            onClick={handleCompleteWithChurch}
                                            className="w-full py-4 bg-[#6750a4] text-white rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2"
                                        >
                                            <Church className="w-5 h-5" />
                                            <span>이 교회로 시작하기</span>
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-4 bg-[#e7e0ec] text-[#79747e] rounded-full font-semibold text-base cursor-not-allowed"
                                        >
                                            교회를 선택해주세요
                                        </button>
                                    )}

                                    {!showRegistrationOptions && (
                                        <button
                                            onClick={() => setShowRegistrationOptions(true)}
                                            className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors"
                                        >
                                            우리 교회가 없나요?
                                        </button>
                                    )}

                                    {showRegistrationOptions && (
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => toast.info('직접 등록은 내정보 > 교회 관리에서 제공됩니다.')}
                                                className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Plus className="w-4 h-4" />
                                                직접 등록하기
                                            </button>
                                            <button
                                                onClick={() => toast.info('코드 등록은 내정보 > 교회 관리에서 제공됩니다.')}
                                                className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors flex items-center justify-center gap-2"
                                            >
                                                <KeyRound className="w-4 h-4" />
                                                교회 코드로 등록하기
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => setHasChurch(null)}
                                        className="w-full py-3 text-[#79747e] font-medium text-sm hover:bg-[#f5f5f5] rounded-full transition-colors"
                                    >
                                        이전으로
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
