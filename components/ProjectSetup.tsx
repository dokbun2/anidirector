
import React, { useState } from 'react';
import { StoryConfig, AspectRatio } from '../types';
import { generateStoryIdea } from '../services/geminiService';

interface Props {
  config: StoryConfig;
  setConfig: (c: StoryConfig) => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

const AspectRatioIcon = ({ ratio }: { ratio: string }) => {
  let w = 16, h = 9;
  if (ratio === '4:3') { w = 12; h = 9; }
  if (ratio === '9:16') { w = 9; h = 16; }

  return (
    <div className="border border-current bg-white/10 rounded-sm transition-all" style={{ width: `${w * 1.2}px`, height: `${h * 1.2}px` }}></div>
  );
}

const ProjectSetup: React.FC<Props> = ({ config, setConfig, onGenerate, isGenerating }) => {
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      const idea: any = await generateStoryIdea();

      setConfig({
        ...config,
        title: idea.title || config.title,
        mainCharacterName: idea.mainCharacterName || config.mainCharacterName,
        mainCharacterDescription: idea.mainCharacterDescription || config.mainCharacterDescription,
        additionalCharacters: idea.additionalCharacterName ? [{
          name: idea.additionalCharacterName,
          description: idea.additionalCharacterDescription || ''
        }] : config.additionalCharacters,
        targetToSave: idea.targetToSave || config.targetToSave,
        targetToSaveDescription: idea.targetToSaveDescription || config.targetToSaveDescription || '',
        dangerThreat: idea.dangerThreat || config.dangerThreat,
        dangerTool: idea.dangerTool || config.dangerTool,
        dangerLocation: idea.dangerLocation || config.dangerLocation,
        backgroundSetting: idea.backgroundSetting || config.backgroundSetting,
        humanCharacter: ''
      });
    } catch (e) {
      console.error(e);
      alert("아이디어 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsAutoFilling(false);
    }
  };

  const addCharacter = () => {
    setConfig({
      ...config,
      additionalCharacters: [...(config.additionalCharacters || []), { name: '', description: '' }]
    });
  };

  const removeCharacter = (index: number) => {
    const newChars = [...(config.additionalCharacters || [])];
    newChars.splice(index, 1);
    setConfig({ ...config, additionalCharacters: newChars });
  };

  const updateCharacter = (index: number, field: 'name' | 'description', value: string) => {
    const newChars = [...(config.additionalCharacters || [])];
    newChars[index] = { ...newChars[index], [field]: value };
    setConfig({ ...config, additionalCharacters: newChars });
  };

  const isFormValid = config.title && config.mainCharacterName && config.targetToSave;

  return (
    <div className="animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">스토리 설정</h2>
          <p className="text-slate-500 text-xs mt-0.5">60초 애니메이션의 스토리와 등장인물을 설정하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoFill}
            disabled={isAutoFilling}
            className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-pink-500/20 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {isAutoFilling ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>AI 생성중...</span>
              </>
            ) : (
              <>✨ 매직 필</>
            )}
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating || !isFormValid}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>생성중...</span>
              </>
            ) : (
              <>
                <span>스토리생성</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4-Section Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">

        {/* Section 1: 스토리기획 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
            <span className="bg-cyan-500/20 w-6 h-6 rounded-full flex items-center justify-center text-cyan-400 text-xs">1</span>
            스토리기획
          </h3>
          <div className="space-y-3 flex-1">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">프로젝트 제목 *</label>
              <input type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder="예: 기찻길의 기적"
                value={config.title}
                onChange={e => setConfig({ ...config, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">배경/환경</label>
              <input type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                placeholder="예: 노을이 지는 산속"
                value={config.backgroundSetting}
                onChange={e => setConfig({ ...config, backgroundSetting: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Section 2: 등장인물 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-pink-400 mb-3 flex items-center gap-2">
            <span className="bg-pink-500/20 w-6 h-6 rounded-full flex items-center justify-center text-pink-400 text-xs">2</span>
            등장인물
          </h3>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {/* 주인공 */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <div className="text-xs font-bold text-cyan-400 mb-2">주인공 (Hero) *</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                  placeholder="이름 (예: 토끼 티코)"
                  value={config.mainCharacterName}
                  onChange={e => setConfig({ ...config, mainCharacterName: e.target.value })}
                />
                <input type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-cyan-500 outline-none"
                  placeholder="외모 (예: 흰 털, 빨간 스카프)"
                  value={config.mainCharacterDescription}
                  onChange={e => setConfig({ ...config, mainCharacterDescription: e.target.value })}
                />
              </div>
            </div>

            {/* 구해야 할 대상 */}
            <div className="bg-slate-800/50 rounded-lg p-3 border border-amber-700/30">
              <div className="text-xs font-bold text-amber-400 mb-2">구해야 할 대상 *</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="이름 (예: 아기 고양이)"
                  value={config.targetToSave}
                  onChange={e => setConfig({ ...config, targetToSave: e.target.value })}
                />
                <input type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                  placeholder="외모 (예: 작고 하얀 털, 파란 눈)"
                  value={config.targetToSaveDescription || ''}
                  onChange={e => setConfig({ ...config, targetToSaveDescription: e.target.value })}
                />
              </div>
            </div>

            {/* 조연 */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">조연/기타 등장인물</span>
              <button onClick={addCharacter} className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition-colors">
                + 추가
              </button>
            </div>
            {config.additionalCharacters?.map((char, idx) => (
              <div key={idx} className="bg-slate-800/30 rounded-lg p-2 border border-slate-700/30 flex gap-2 items-center">
                <input type="text"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none"
                  placeholder="이름"
                  value={char.name}
                  onChange={(e) => updateCharacter(idx, 'name', e.target.value)}
                />
                <input type="text"
                  className="flex-[2] bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-xs outline-none"
                  placeholder="외모 묘사"
                  value={char.description}
                  onChange={(e) => updateCharacter(idx, 'description', e.target.value)}
                />
                <button onClick={() => removeCharacter(idx)} className="text-red-500 hover:text-red-400 p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {(!config.additionalCharacters || config.additionalCharacters.length === 0) && (
              <p className="text-xs text-slate-600 text-center py-2">조연이 없습니다</p>
            )}
          </div>
        </section>

        {/* Section 3: 스토리 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
            <span className="bg-purple-500/20 w-6 h-6 rounded-full flex items-center justify-center text-purple-400 text-xs">3</span>
            스토리
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">다가오는 위협</label>
              <input type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                placeholder="예: 과속 기차"
                value={config.dangerThreat}
                onChange={e => setConfig({ ...config, dangerThreat: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">사용할 도구</label>
              <input type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                placeholder="예: 큰 돌덩이"
                value={config.dangerTool}
                onChange={e => setConfig({ ...config, dangerTool: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">위험 장소</label>
              <input type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                placeholder="예: 기찻길 선로"
                value={config.dangerLocation}
                onChange={e => setConfig({ ...config, dangerLocation: e.target.value })}
              />
            </div>
          </div>
        </section>

        {/* Section 4: 영상포맷 */}
        <section className="bg-slate-900 rounded-xl border border-slate-800 p-4 flex flex-col">
          <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
            <span className="bg-amber-500/20 w-6 h-6 rounded-full flex items-center justify-center text-amber-400 text-xs">4</span>
            영상포맷
          </h3>
          <div className="flex-1 flex items-center">
            <div className="flex gap-3 w-full">
              {['16:9', '9:16', '4:3'].map((ratio) => (
                <button key={ratio}
                  onClick={() => setConfig({ ...config, aspectRatio: ratio as AspectRatio })}
                  className={`flex-1 flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${config.aspectRatio === ratio
                      ? 'bg-amber-900/30 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'
                    }`}
                >
                  <AspectRatioIcon ratio={ratio} />
                  <span className="text-xs font-bold">{ratio}</span>
                  <span className="text-[10px] text-slate-500">
                    {ratio === '16:9' ? '가로형' : ratio === '9:16' ? '세로형' : '정방형'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProjectSetup;
