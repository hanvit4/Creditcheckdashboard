import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, MapPin, Phone, Users, ChevronRight, Check, List, Map, X, KeyRound, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as api from '../utils/api';
import { toast } from 'sonner';

export interface Church {
    id: string;
    churchCode?: string;
    name: string;
    address: string;
    city: string;
    district: string;
    phone: string;
    memberCount: number;
    pastor: string;
    denomination: string;
}

interface ChurchMembership {
    id: string;
    isPrimary: boolean;
    status: string;
    joinedAt: string;
    church: Church;
}

interface ChurchRegistrationProps {
    onBack: () => void;
    onComplete: (church: Church) => void;
    currentChurches?: Church[];
}

export default function ChurchRegistration({ onBack, onComplete, currentChurches = [] }: ChurchRegistrationProps) {
    const [step, setStep] = useState<'search' | 'confirm' | 'manual' | 'code'>('search');
    const [searchTab, setSearchTab] = useState<'list' | 'map'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>('전체');
    const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [churchCode, setChurchCode] = useState('');
    const [manualChurchName, setManualChurchName] = useState('');
    const [manualAddress, setManualAddress] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [manualPastor, setManualPastor] = useState('');
    const [manualDenomination, setManualDenomination] = useState('');
    const [churches, setChurches] = useState<Church[]>([]);
    const [memberships, setMemberships] = useState<ChurchMembership[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const cities = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산'];
    const MAX_CHURCHES = 2;
    const effectiveCurrentChurches = memberships.length > 0
        ? memberships.map((m) => m.church)
        : currentChurches;
    const canAddMore = effectiveCurrentChurches.length < MAX_CHURCHES;

    const filteredChurches = useMemo(() => churches.filter((church) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = church.name.toLowerCase().includes(q) || church.address.toLowerCase().includes(q);
        const matchesCity = selectedCity === '전체' || church.city === selectedCity;
        return matchesSearch && matchesCity;
    }), [churches, searchQuery, selectedCity]);

    const loadChurchData = async () => {
        try {
            setIsLoading(true);
            const [churchRes, membershipRes] = await Promise.all([
                api.getChurches(),
                api.getMyChurchMemberships(),
            ]);

            setChurches((churchRes.churches || []).map((church) => ({
                id: church.id,
                churchCode: church.churchCode,
                name: church.name,
                address: church.address,
                city: church.city,
                district: church.district || '',
                phone: church.phone || '',
                memberCount: church.memberCount || 0,
                pastor: church.pastor || '-',
                denomination: church.denomination || '-',
            })));

            setMemberships((membershipRes.memberships || []).map((m) => ({
                id: m.id,
                isPrimary: m.isPrimary,
                status: m.status,
                joinedAt: m.joinedAt,
                church: {
                    id: m.church.id,
                    churchCode: m.church.churchCode,
                    name: m.church.name,
                    address: m.church.address,
                    city: m.church.city,
                    district: m.church.district || '',
                    phone: m.church.phone || '',
                    memberCount: m.church.memberCount || 0,
                    pastor: m.church.pastor || '-',
                    denomination: m.church.denomination || '-',
                },
            })));
        } catch (error) {
            console.error('교회 데이터 조회 실패:', error);
            toast.error('교회 정보를 불러오지 못했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadChurchData();
    }, []);

    const handleSelectChurch = (church: Church) => {
        setSelectedChurch(church);
        setStep('confirm');
    };

    const handleConfirm = () => {
        if (!selectedChurch) return;

        const submit = async () => {
            try {
                setIsSubmitting(true);
                await api.registerMyChurch({ churchId: selectedChurch.id });
                toast.success('교회 등록이 완료되었습니다.');
                await loadChurchData();
                onComplete(selectedChurch);
            } catch (error: any) {
                console.error('교회 등록 실패:', error);
                toast.error(error?.message || '교회 등록에 실패했습니다.');
            } finally {
                setIsSubmitting(false);
            }
        };

        submit();
    };

    const handleManualSubmit = () => {
        if (!manualChurchName.trim() || !manualAddress.trim()) return;

        const submit = async () => {
            try {
                setIsSubmitting(true);
                const res = await api.registerMyChurch({
                    manualChurch: {
                        name: manualChurchName.trim(),
                        address: manualAddress.trim(),
                        city: '기타',
                        district: '-',
                        phone: manualPhone.trim() || undefined,
                        pastor: manualPastor.trim() || undefined,
                        denomination: manualDenomination.trim() || undefined,
                    },
                });

                const createdChurch: Church = {
                    id: res.membership.church.id,
                    churchCode: res.membership.church.churchCode,
                    name: res.membership.church.name,
                    address: res.membership.church.address,
                    city: res.membership.church.city,
                    district: res.membership.church.district || '',
                    phone: res.membership.church.phone || '',
                    memberCount: res.membership.church.memberCount || 0,
                    pastor: res.membership.church.pastor || '-',
                    denomination: res.membership.church.denomination || '-',
                };

                toast.success('교회 등록 신청이 완료되었습니다.');
                await loadChurchData();
                onComplete(createdChurch);
            } catch (error: any) {
                console.error('직접 등록 실패:', error);
                toast.error(error?.message || '직접 등록에 실패했습니다.');
            } finally {
                setIsSubmitting(false);
            }
        };

        submit();
    };

    const handleCodeSubmit = () => {
        if (!churchCode.trim()) return;

        const submit = async () => {
            try {
                setIsSubmitting(true);
                const res = await api.registerMyChurch({ churchCode: churchCode.trim().toUpperCase() });
                const foundChurch: Church = {
                    id: res.membership.church.id,
                    churchCode: res.membership.church.churchCode,
                    name: res.membership.church.name,
                    address: res.membership.church.address,
                    city: res.membership.church.city,
                    district: res.membership.church.district || '',
                    phone: res.membership.church.phone || '',
                    memberCount: res.membership.church.memberCount || 0,
                    pastor: res.membership.church.pastor || '-',
                    denomination: res.membership.church.denomination || '-',
                };

                toast.success('교회 코드 등록이 완료되었습니다.');
                await loadChurchData();
                onComplete(foundChurch);
            } catch (error: any) {
                console.error('코드 등록 실패:', error);
                toast.error(error?.message || '코드 등록에 실패했습니다.');
            } finally {
                setIsSubmitting(false);
            }
        };

        submit();
    };

    const handleRemoveChurch = async (churchId: string) => {
        try {
            const target = memberships.find((m) => m.church.id === churchId);
            if (!target) {
                toast.error('삭제할 교회 소속 정보를 찾지 못했습니다.');
                return;
            }

            await api.removeMyChurchMembership(target.id);
            toast.success('교회 소속이 삭제되었습니다.');
            await loadChurchData();
        } catch (error: any) {
            console.error('교회 소속 삭제 실패:', error);
            toast.error(error?.message || '교회 소속 삭제에 실패했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-[#fef7ff]">
            <div className="max-w-[360px] mx-auto w-full min-h-screen bg-white flex flex-col">
                <div className="sticky top-0 z-10 bg-white border-b border-[#e7e0ec]">
                    <div className="flex items-center px-4 h-14">
                        <button
                            onClick={() => {
                                if (step === 'confirm' || step === 'manual' || step === 'code') {
                                    setStep('search');
                                } else {
                                    onBack();
                                }
                            }}
                            className="p-2 -ml-2 hover:bg-[#f5f5f5] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6 text-[#1d1b20]" />
                        </button>
                        <h1 className="flex-1 text-[#1d1b20] text-lg font-semibold ml-2">
                            {step === 'search' && '소속 교회 관리'}
                            {step === 'confirm' && '교회 정보 확인'}
                            {step === 'manual' && '교회 직접 등록'}
                            {step === 'code' && '코드로 등록'}
                        </h1>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {step === 'search' && (
                        <motion.div
                            key="search"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex-1 flex flex-col"
                        >
                            <div className="p-4 bg-[#fef7ff]">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-[#1d1b20] font-semibold text-base">내 소속 교회</h2>
                                    <span className="text-[#49454f] text-sm">{effectiveCurrentChurches.length} / {MAX_CHURCHES}</span>
                                </div>

                                {effectiveCurrentChurches.length === 0 ? (
                                    <div className="bg-white border-2 border-dashed border-[#e7e0ec] rounded-[16px] p-6 text-center">
                                        <div className="w-12 h-12 bg-[#e8def8] rounded-full flex items-center justify-center mx-auto mb-3">
                                            <MapPin className="w-6 h-6 text-[#6750a4]" />
                                        </div>
                                        <p className="text-[#49454f] text-sm">등록된 교회가 없습니다</p>
                                        <p className="text-[#79747e] text-xs mt-1">아래에서 교회를 등록해주세요</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {effectiveCurrentChurches.map((church, index) => (
                                            <div key={church.id} className="bg-white border border-[#e7e0ec] rounded-[16px] p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {index === 0 && (
                                                                <span className="px-2 py-0.5 bg-[#6750a4] text-white text-xs font-medium rounded-full">주 교회</span>
                                                            )}
                                                            <h3 className="text-[#1d1b20] font-semibold text-base">{church.name}</h3>
                                                        </div>

                                                        <div className="flex items-center gap-1 text-[#49454f] text-xs mb-1">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            <span>{church.address}</span>
                                                        </div>

                                                        <div className="flex items-center gap-3 mt-2">
                                                            <span className="text-[#79747e] text-xs">{church.pastor}</span>
                                                            <span className="text-[#79747e] text-xs">{church.denomination}</span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleRemoveChurch(church.id)}
                                                        className="p-1 hover:bg-[#f5f5f5] rounded-full transition-colors"
                                                    >
                                                        <X className="w-5 h-5 text-[#79747e]" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {canAddMore && (
                                <>
                                    <div className="px-4 py-3 border-b border-[#e7e0ec]">
                                        <h3 className="text-[#1d1b20] font-semibold text-sm flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-[#6750a4]" />
                                            교회 추가하기
                                        </h3>
                                    </div>

                                    <div className="px-4 pt-4">
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
                                            <div className="px-4 pt-4 pb-3">
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
                                                    {isLoading ? (
                                                        <div className="text-center py-10 text-[#79747e] text-sm">교회 목록을 불러오는 중...</div>
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
                                                                    className="w-full bg-white border border-[#e7e0ec] rounded-[16px] p-4 hover:border-[#6750a4] hover:shadow-md transition-all text-left"
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
                                                                        <ChevronRight className="w-5 h-5 text-[#79747e] flex-shrink-0 mt-1" />
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
                                        <div className="flex-1 p-4">
                                            <div className="bg-[#e8def8] rounded-[16px] h-[400px] flex items-center justify-center">
                                                <div className="text-center">
                                                    <Map className="w-16 h-16 text-[#6750a4] mx-auto mb-4" />
                                                    <p className="text-[#1d1b20] font-medium mb-2">지도 기능</p>
                                                    <p className="text-[#49454f] text-sm">카카오맵 API 연동 예정</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 border-t border-[#e7e0ec] space-y-2">
                                        <button
                                            onClick={() => setStep('manual')}
                                            className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            우리 교회가 없나요? 직접 등록하기
                                        </button>
                                        <button
                                            onClick={() => setStep('code')}
                                            className="w-full py-3 text-[#6750a4] font-medium text-sm hover:bg-[#e8def8] rounded-full transition-colors flex items-center justify-center gap-2"
                                        >
                                            <KeyRound className="w-4 h-4" />
                                            교회 코드로 등록하기
                                        </button>
                                    </div>
                                </>
                            )}

                            {!canAddMore && (
                                <div className="p-4">
                                    <div className="bg-[#e8def8] rounded-[12px] p-4 text-center">
                                        <p className="text-[#1d1b20] text-sm font-medium mb-1">최대 등록 가능 개수에 도달했습니다</p>
                                        <p className="text-[#49454f] text-xs">새로운 교회를 등록하려면 기존 교회를 삭제해주세요</p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 'confirm' && selectedChurch && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            <div className="bg-gradient-to-br from-[#6750a4] to-[#7f67be] p-6 text-white">
                                <div className="text-center">
                                    <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                                        <div className="text-3xl">⛪</div>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">{selectedChurch.name}</h2>
                                    <p className="text-white/80 text-sm">{selectedChurch.denomination}</p>
                                </div>
                            </div>

                            <div className="flex-1 p-4 space-y-4">
                                <div className="bg-white border border-[#e7e0ec] rounded-[16px] p-4 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[#79747e] text-xs mb-1">주소</p>
                                            <p className="text-[#1d1b20] text-sm">{selectedChurch.address}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#e7e0ec] pt-4 flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[#79747e] text-xs mb-1">연락처</p>
                                            <p className="text-[#1d1b20] text-sm">{selectedChurch.phone}</p>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#e7e0ec] pt-4 flex items-start gap-3">
                                        <div className="w-10 h-10 bg-[#e8def8] rounded-full flex items-center justify-center flex-shrink-0">
                                            <Users className="w-5 h-5 text-[#6750a4]" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[#79747e] text-xs mb-1">담임 목사</p>
                                            <p className="text-[#1d1b20] text-sm">{selectedChurch.pastor}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-[#e7e0ec]">
                                <button
                                    onClick={handleConfirm}
                                    disabled={isSubmitting}
                                    className="w-full py-4 bg-[#6750a4] text-white rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>등록 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>이 교회로 등록하기</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'manual' && (
                        <motion.div
                            key="manual"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col p-4"
                        >
                            <div className="flex-1">
                                <p className="text-[#49454f] text-sm mb-6">목록에 없는 교회를 직접 등록할 수 있습니다.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[#1d1b20] text-sm font-medium mb-2">교회 이름 *</label>
                                        <input
                                            type="text"
                                            value={manualChurchName}
                                            onChange={(e) => setManualChurchName(e.target.value)}
                                            placeholder="예: 은혜중앙교회"
                                            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#1d1b20] text-sm font-medium mb-2">주소 *</label>
                                        <input
                                            type="text"
                                            value={manualAddress}
                                            onChange={(e) => setManualAddress(e.target.value)}
                                            placeholder="예: 서울시 강남구 테헤란로 123"
                                            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#1d1b20] text-sm font-medium mb-2">연락처</label>
                                        <input
                                            type="tel"
                                            value={manualPhone}
                                            onChange={(e) => setManualPhone(e.target.value)}
                                            placeholder="예: 02-1234-5678"
                                            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#1d1b20] text-sm font-medium mb-2">담임 목사님 성함</label>
                                        <input
                                            type="text"
                                            value={manualPastor}
                                            onChange={(e) => setManualPastor(e.target.value)}
                                            placeholder="예: 김은혜 목사"
                                            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[#1d1b20] text-sm font-medium mb-2">교단</label>
                                        <input
                                            type="text"
                                            value={manualDenomination}
                                            onChange={(e) => setManualDenomination(e.target.value)}
                                            placeholder="예: 예장통합"
                                            className="w-full px-4 py-3 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] placeholder:text-[#79747e] focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-[#e7e0ec] mt-6">
                                <button
                                    onClick={handleManualSubmit}
                                    disabled={!manualChurchName.trim() || !manualAddress.trim() || isSubmitting}
                                    className="w-full py-4 bg-[#6750a4] text-white rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50"
                                >
                                    {isSubmitting ? '등록 중...' : '등록 신청하기'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {step === 'code' && (
                        <motion.div
                            key="code"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex-1 flex flex-col"
                        >
                            <div className="flex-1 p-4">
                                <div className="text-center mb-8">
                                    <div className="w-20 h-20 bg-[#e8def8] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <KeyRound className="w-10 h-10 text-[#6750a4]" />
                                    </div>
                                    <h3 className="text-[#1d1b20] font-semibold text-lg mb-2">교회 코드 입력</h3>
                                    <p className="text-[#49454f] text-sm">교회에서 받은 6자리 코드를 입력해주세요</p>
                                </div>

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={churchCode}
                                        onChange={(e) => setChurchCode(e.target.value.toUpperCase())}
                                        placeholder="예: ABC123"
                                        maxLength={6}
                                        className="w-full px-4 py-4 bg-[#f5f5f5] rounded-[12px] text-[#1d1b20] text-center text-2xl font-bold tracking-widest placeholder:text-[#79747e] placeholder:text-lg placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#6750a4]"
                                    />

                                    <div className="bg-[#e8def8] rounded-[12px] p-4">
                                        <p className="text-[#1d1b20] text-xs leading-relaxed">
                                            💡 <span className="font-medium">코드를 받는 방법</span>
                                            <br />
                                            교회 관리자에게 문의하거나 교회 공지사항에서 확인할 수 있습니다.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-[#e7e0ec]">
                                <button
                                    onClick={handleCodeSubmit}
                                    disabled={churchCode.length !== 6 || isSubmitting}
                                    className="w-full py-4 bg-[#6750a4] text-white rounded-full font-semibold text-base shadow-md hover:shadow-lg transition-all active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>확인 중...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-5 h-5" />
                                            <span>코드 확인</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
