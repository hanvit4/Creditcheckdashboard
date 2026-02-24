import { useState } from 'react';
import { Book, ChevronRight } from 'lucide-react';
import ChapterSelect from './ChapterSelect';
import BibleReader from './BibleReader';
import { BibleTranslation } from '../utils/api';

interface BibleBook {
  id: string;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

const bibleBooks: BibleBook[] = [
  // 구약
  { id: 'genesis', name: '창세기', chapters: 50, testament: 'old' },
  { id: 'exodus', name: '출애굽기', chapters: 40, testament: 'old' },
  { id: 'leviticus', name: '레위기', chapters: 27, testament: 'old' },
  { id: 'numbers', name: '민수기', chapters: 36, testament: 'old' },
  { id: 'deuteronomy', name: '신명기', chapters: 34, testament: 'old' },
  { id: 'joshua', name: '여호수아', chapters: 24, testament: 'old' },
  { id: 'judges', name: '사사기', chapters: 21, testament: 'old' },
  { id: 'ruth', name: '룻기', chapters: 4, testament: 'old' },
  { id: '1samuel', name: '사무엘상', chapters: 31, testament: 'old' },
  { id: '2samuel', name: '사무엘하', chapters: 24, testament: 'old' },
  { id: '1kings', name: '열왕기상', chapters: 22, testament: 'old' },
  { id: '2kings', name: '열왕기하', chapters: 25, testament: 'old' },
  { id: '1chronicles', name: '역대상', chapters: 29, testament: 'old' },
  { id: '2chronicles', name: '역대하', chapters: 36, testament: 'old' },
  { id: 'ezra', name: '에스라', chapters: 10, testament: 'old' },
  { id: 'nehemiah', name: '느헤미야', chapters: 13, testament: 'old' },
  { id: 'esther', name: '에스더', chapters: 10, testament: 'old' },
  { id: 'job', name: '욥기', chapters: 42, testament: 'old' },
  { id: 'psalms', name: '시편', chapters: 150, testament: 'old' },
  { id: 'proverbs', name: '잠언', chapters: 31, testament: 'old' },
  { id: 'ecclesiastes', name: '전도서', chapters: 12, testament: 'old' },
  { id: 'songofsolomon', name: '아가', chapters: 8, testament: 'old' },
  { id: 'isaiah', name: '이사야', chapters: 66, testament: 'old' },
  { id: 'jeremiah', name: '예레미야', chapters: 52, testament: 'old' },
  { id: 'lamentations', name: '예레미야애가', chapters: 5, testament: 'old' },
  { id: 'ezekiel', name: '에스겔', chapters: 48, testament: 'old' },
  { id: 'daniel', name: '다니엘', chapters: 12, testament: 'old' },
  { id: 'hosea', name: '호세아', chapters: 14, testament: 'old' },
  { id: 'joel', name: '요엘', chapters: 3, testament: 'old' },
  { id: 'amos', name: '아모스', chapters: 9, testament: 'old' },
  { id: 'obadiah', name: '오바댜', chapters: 1, testament: 'old' },
  { id: 'jonah', name: '요나', chapters: 4, testament: 'old' },
  { id: 'micah', name: '미가', chapters: 7, testament: 'old' },
  { id: 'nahum', name: '나훔', chapters: 3, testament: 'old' },
  { id: 'habakkuk', name: '하박국', chapters: 3, testament: 'old' },
  { id: 'zephaniah', name: '스바냐', chapters: 3, testament: 'old' },
  { id: 'haggai', name: '학개', chapters: 2, testament: 'old' },
  { id: 'zechariah', name: '스가랴', chapters: 14, testament: 'old' },
  { id: 'malachi', name: '말라기', chapters: 4, testament: 'old' },
  // 신약
  { id: 'matthew', name: '마태복음', chapters: 28, testament: 'new' },
  { id: 'mark', name: '마가복음', chapters: 16, testament: 'new' },
  { id: 'luke', name: '누가복음', chapters: 24, testament: 'new' },
  { id: 'john', name: '요한복음', chapters: 21, testament: 'new' },
  { id: 'acts', name: '사도행전', chapters: 28, testament: 'new' },
  { id: 'romans', name: '로마서', chapters: 16, testament: 'new' },
  { id: '1corinthians', name: '고린도전서', chapters: 16, testament: 'new' },
  { id: '2corinthians', name: '고린도후서', chapters: 13, testament: 'new' },
  { id: 'galatians', name: '갈라디아서', chapters: 6, testament: 'new' },
  { id: 'ephesians', name: '에베소서', chapters: 6, testament: 'new' },
  { id: 'philippians', name: '빌립보서', chapters: 4, testament: 'new' },
  { id: 'colossians', name: '골로새서', chapters: 4, testament: 'new' },
  { id: '1thessalonians', name: '데살로니가전서', chapters: 5, testament: 'new' },
  { id: '2thessalonians', name: '데살로니가후서', chapters: 3, testament: 'new' },
  { id: '1timothy', name: '디모데전서', chapters: 6, testament: 'new' },
  { id: '2timothy', name: '디모데후서', chapters: 4, testament: 'new' },
  { id: 'titus', name: '디도서', chapters: 3, testament: 'new' },
  { id: 'philemon', name: '빌레몬서', chapters: 1, testament: 'new' },
  { id: 'hebrews', name: '히브리서', chapters: 13, testament: 'new' },
  { id: 'james', name: '야고보서', chapters: 5, testament: 'new' },
  { id: '1peter', name: '베드로전서', chapters: 5, testament: 'new' },
  { id: '2peter', name: '베드로후서', chapters: 3, testament: 'new' },
  { id: '1john', name: '요한일서', chapters: 5, testament: 'new' },
  { id: '2john', name: '요한이서', chapters: 1, testament: 'new' },
  { id: '3john', name: '요한삼서', chapters: 1, testament: 'new' },
  { id: 'jude', name: '유다서', chapters: 1, testament: 'new' },
  { id: 'revelation', name: '요한계시록', chapters: 22, testament: 'new' },
];

interface BibleTabProps {
  translation: BibleTranslation;
  onChangeTranslation: (translation: BibleTranslation) => void;
}

export default function BibleTab({ translation, onChangeTranslation }: BibleTabProps) {
  const [activeTestament, setActiveTestament] = useState<'old' | 'new'>('old');
  const [view, setView] = useState<'list' | 'chapters' | 'reader'>('list');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  // Mock progress - 전문가 모드에서 창세기 1장까지 완료했다고 가정
  const completedChapters = new Set(['genesis-1']);

  const filteredBooks = bibleBooks.filter(book => book.testament === activeTestament);

  const translationLabels: Record<BibleTranslation, string> = {
    nkrv: '개역개정',
    krv: '개역한글',
    kor: '새번역',
  };

  const translationOptions: { value: BibleTranslation; label: string }[] = [
    { value: 'nkrv', label: '개역개정' },
    { value: 'krv', label: '개역한글' },
    { value: 'kor', label: '새번역' },
  ];

  // Handle book selection
  const handleSelectBook = (book: BibleBook) => {
    setSelectedBook(book);
    setView('chapters');
  };

  // Handle chapter selection
  const handleSelectChapter = (chapter: number) => {
    setSelectedChapter(chapter);
    setView('reader');
  };

  // Render chapter select view
  if (view === 'chapters' && selectedBook) {
    return (
      <ChapterSelect
        book={selectedBook.id}
        bookName={selectedBook.name}
        totalChapters={selectedBook.chapters}
        onBack={() => setView('list')}
        onSelectChapter={handleSelectChapter}
      />
    );
  }

  // Render reader view
  if (view === 'reader' && selectedBook) {
    return (
      <BibleReader
        book={selectedBook.name}
        chapter={selectedChapter}
        translation={translation}
        onBack={() => setView('chapters')}
      />
    );
  }

  // Render book list view
  return (
    <div className="px-4 pt-12 pb-4">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[#1d1b20] text-2xl font-bold mb-2">성경</h1>
          <p className="text-[#49454f] text-sm">{translationLabels[translation]} 성경을 읽어보세요</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[#49454f]" htmlFor="bible-translation">
            번역본
          </label>
          <select
            id="bible-translation"
            className="rounded-full border border-[#e7e0ec] bg-white px-3 py-2 text-sm text-[#1d1b20] shadow-sm"
            value={translation}
            onChange={(event) => onChangeTranslation(event.target.value as BibleTranslation)}
          >
            {translationOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Testament Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTestament('old')}
          className={`flex-1 py-3 rounded-full font-medium text-sm transition-all ${activeTestament === 'old'
            ? 'bg-[#6750a4] text-white shadow-md'
            : 'bg-white text-[#49454f] border border-[#e7e0ec]'
            }`}
        >
          구약성경
        </button>
        <button
          onClick={() => setActiveTestament('new')}
          className={`flex-1 py-3 rounded-full font-medium text-sm transition-all ${activeTestament === 'new'
            ? 'bg-[#6750a4] text-white shadow-md'
            : 'bg-white text-[#49454f] border border-[#e7e0ec]'
            }`}
        >
          신약성경
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-[#e8def8] rounded-[16px] p-4 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#6750a4] rounded-full flex items-center justify-center">
            <Book className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-[#1d1b20] font-semibold text-base mb-1">
              전문가 모드 진행 상황
            </h3>
            <p className="text-[#49454f] text-sm">
              창세기 1장 진행 중
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6750a4]" />
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {filteredBooks.map((book) => {
          const isInProgress = book.id === 'genesis'; // Mock: 창세기 진행 중
          const completedCount = book.id === 'genesis' ? 1 : 0;
          const progressLabel = `${completedCount}/${book.chapters}`;

          return (
            <button
              key={book.id}
              onClick={() => handleSelectBook(book)}
              className={`w-full rounded-[18px] p-3 shadow-sm transition-all active:scale-98 hover:shadow-md text-center border ${isInProgress
                ? 'border-[#6750a4] bg-[#fef7ff]'
                : 'border-[#e7e0ec] bg-white'
                }`}
            >
              <div className="flex flex-col items-center justify-center gap-1">
                <h3 className="text-[#1d1b20] font-medium text-sm truncate w-full">
                  {book.name}
                </h3>
                <div className="text-[#49454f] text-xs">
                  <span className={`font-semibold ${isInProgress ? 'text-[#6750a4]' : 'text-[#1d1b20]'}`}>
                    {progressLabel}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-4 p-4 bg-white rounded-[12px] border border-[#e7e0ec]">
        <p className="text-[#49454f] text-xs text-center">
          💡 전문가 모드로 필사한 장은 <span className="text-[#6750a4] font-medium">완료 표시</span>가 됩니다
        </p>
      </div>
    </div>
  );
}