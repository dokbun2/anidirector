
import React, { useState, useEffect } from 'react';
import { Character, StoryConfig } from '../types';
import { generateCharacterDesign } from '../services/geminiService';

interface Props {
  config: StoryConfig;
  existingCharacters: Character[];
  onAssign: (character: Character) => void;
}

const CharacterAssignment: React.FC<Props> = ({ config, existingCharacters, onAssign }) => {
  const [characterTargets, setCharacterTargets] = useState<{ tempId: string, name: string, description: string, role: string }[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    const targets = [
        { tempId: 'main', name: config.mainCharacterName, description: config.mainCharacterDescription, role: '주인공' }
    ];
    // 구해야 할 대상 추가
    if (config.targetToSave) {
        targets.push({
            tempId: 'target',
            name: config.targetToSave,
            description: config.targetToSaveDescription || '',
            role: '구조 대상'
        });
    }
    if (config.additionalCharacters) {
        config.additionalCharacters.forEach((char, idx) => {
            targets.push({
                tempId: `add_${idx}`,
                name: char.name,
                description: char.description,
                role: '조연'
            });
        });
    }
    if (config.humanCharacter) {
        targets.push({ tempId: 'human', name: '관찰자(인간)', description: config.humanCharacter, role: '관찰자' });
    }
    setCharacterTargets(targets);

    // Pre-populate images from existing characters
    const existingImages: Record<string, string> = {};
    targets.forEach(target => {
      const existing = existingCharacters.find(c => c.name === target.name);
      if (existing?.imageUrl) {
        existingImages[target.tempId] = existing.imageUrl;
      }
    });
    if (Object.keys(existingImages).length > 0) {
      setImages(existingImages);
    }
  }, [config, existingCharacters]);

  const handleImageUpload = (tempId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => ({ ...prev, [tempId]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async (tempId: string, name: string, description: string) => {
    setGeneratingId(tempId);
    try {
      const url = await generateCharacterDesign(name, description);
      setImages(prev => ({ ...prev, [tempId]: url }));
    } catch (e: any) {
      alert("캐릭터 생성 실패: " + e.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const handleConfirmAll = () => {
    characterTargets.forEach(target => {
        const img = images[target.tempId];
        if (img) {
             const newChar: Character = {
                id: Date.now().toString() + Math.random().toString(),
                name: target.name,
                description: target.description,
                imageUrl: img
            };
            onAssign(newChar);
        }
    });
  };

  const handleRemoveImage = (tempId: string) => {
    setImages(prev => {
      const newImages = { ...prev };
      delete newImages[tempId];
      return newImages;
    });
  };

  const completedCount = Object.keys(images).length;
  const totalCount = characterTargets.length;

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Top Bar */}
      <div className="bg-slate-900/95 backdrop-blur border-b border-slate-700 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            캐릭터 디렉터
            <span className="text-xs bg-cyan-900/50 border border-cyan-500/30 px-2 py-0.5 rounded text-cyan-300">
              {completedCount}/{totalCount} 완료
            </span>
          </h2>
          <p className="text-xs text-slate-500">각 등장인물의 이미지를 생성하거나 업로드하세요</p>
        </div>
        <button
          onClick={handleConfirmAll}
          disabled={completedCount === 0}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-all flex items-center gap-2"
        >
          확인 및 큐시트 생성
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* Character Cards Grid */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {characterTargets.map((char) => {
            const hasImage = images[char.tempId];
            const isGenerating = generatingId === char.tempId;

            return (
              <div
                key={char.tempId}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg hover:border-slate-600 transition-colors"
              >
                {/* Character Header */}
                <div className="bg-slate-800/50 px-4 py-2 border-b border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      char.role === '주인공'
                        ? 'bg-pink-600 text-white'
                        : char.role === '구조 대상'
                          ? 'bg-amber-600 text-white'
                          : char.role === '조연'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-600 text-white'
                    }`}>
                      {char.role}
                    </span>
                    <span className="font-bold text-white text-sm">{char.name}</span>
                  </div>
                  {hasImage && (
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  )}
                </div>

                {/* Image Area - Upload/Preview Combined */}
                <div className="relative aspect-square bg-black">
                  {hasImage ? (
                    <>
                      <img
                        src={images[char.tempId]}
                        alt={char.name}
                        className="w-full h-full object-contain"
                      />
                      {/* Overlay buttons on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors">
                          변경
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(char.tempId, e)}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => handleRemoveImage(char.tempId)}
                          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                      {isGenerating ? (
                        <div className="text-center">
                          <svg className="animate-spin h-8 w-8 text-pink-500 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <p className="text-slate-400 text-sm">캐릭터 생성 중...</p>
                        </div>
                      ) : (
                        <>
                          {/* Upload Zone */}
                          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer border-2 border-dashed border-slate-700 rounded-xl hover:border-cyan-500 transition-colors group">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-slate-600 group-hover:text-cyan-500 transition-colors mb-2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                            </svg>
                            <p className="text-slate-500 text-sm font-medium group-hover:text-cyan-400 transition-colors">이미지 업로드</p>
                            <p className="text-slate-600 text-xs mt-1">클릭하여 파일 선택</p>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageUpload(char.tempId, e)}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Character Info & AI Generate */}
                <div className="p-3 border-t border-slate-800">
                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{char.description || '외모 설명 없음'}</p>

                  {!hasImage && !isGenerating && (
                    <button
                      onClick={() => handleAiGenerate(char.tempId, char.name, char.description)}
                      className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                      </svg>
                      AI로 캐릭터 생성
                    </button>
                  )}

                  {hasImage && (
                    <button
                      onClick={() => handleAiGenerate(char.tempId, char.name, char.description)}
                      disabled={isGenerating}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      AI로 다시 생성
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CharacterAssignment;
