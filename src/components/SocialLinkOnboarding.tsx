import LinkedProviders from './LinkedProviders';

interface SocialLinkOnboardingProps {
    mode?: 'onboarding' | 'manage';
    onNext: () => void;
    onBack?: () => void;
}

export default function SocialLinkOnboarding({ mode = 'onboarding', onNext, onBack }: SocialLinkOnboardingProps) {
    const isOnboarding = mode === 'onboarding';

    return (
        <div className="min-h-screen bg-[#fef7ff] flex items-center justify-center px-4">
            <div className="max-w-[360px] w-full">
                <div className="text-center mb-6">
                    <h1 className="text-[#1d1b20] text-2xl font-bold mb-2">
                        {isOnboarding ? '소셜 계정 연동' : '소셜 계정 연동 관리'}
                    </h1>
                    <p className="text-[#49454f] text-sm">
                        {isOnboarding
                            ? '추가 연동은 선택 사항입니다. 필요하면 지금 연동하고, 아니면 건너뛰어도 됩니다.'
                            : '연동된 소셜 계정을 추가/해제할 수 있습니다.'}
                    </p>
                </div>

                <div className="mb-4">
                    <LinkedProviders />
                </div>

                <button
                    onClick={onNext}
                    className="w-full py-3 bg-[#6750a4] text-white rounded-full font-medium text-base hover:bg-[#5d4595] transition-all"
                >
                    {isOnboarding ? '다음 단계 (건너뛰기 가능)' : '내 정보로 돌아가기'}
                </button>

                {!isOnboarding && onBack && (
                    <button
                        onClick={onBack}
                        className="w-full mt-2 py-3 text-[#6750a4] rounded-full font-medium text-sm hover:bg-[#e8def8] transition-all"
                    >
                        취소
                    </button>
                )}
            </div>
        </div>
    );
}
