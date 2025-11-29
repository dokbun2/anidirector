
import React, { useState, useEffect, useRef } from 'react';
import { AppStep, Character, SavedProject, Scene, StoryConfig, StoryboardData, User, ViewMode } from './types';
import CharacterLibrary from './components/CharacterLibrary'; // Kept for viewing library
import ProjectSetup from './components/ProjectSetup';
import CharacterAssignment from './components/CharacterAssignment';
import CueSheet from './components/CueSheet';
import AuthScreen from './components/AuthScreen';
import Dashboard from './components/Dashboard';
import StoryboardLibrary from './components/StoryboardLibrary';
import ApiKeySetup, { getStoredApiKey, clearStoredApiKey } from './components/ApiKeySetup';
import { generateStoryboardPlan } from './services/geminiService';
import { storageService } from './services/storage';

interface BackupData {
  version: string;
  exportDate: string;
  storyConfig: StoryConfig;
  characters: Character[];
  storyboard: StoryboardData;
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.SETUP_STORY);
  const [viewMode, setViewMode] = useState<ViewMode>('wizard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Global State
  const [characters, setCharacters] = useState<Character[]>([]); 
  const [projects, setProjects] = useState<SavedProject[]>([]);

  // Current Project State
  const [storyConfig, setStoryConfig] = useState<StoryConfig>({
    title: '',
    mainCharacterName: '',
    mainCharacterDescription: '',
    mainCharacterId: null,
    additionalCharacters: [],
    targetToSave: '',
    targetToSaveDescription: '',
    dangerThreat: '',
    dangerTool: '',
    dangerLocation: '',
    backgroundSetting: '',
    humanCharacter: '',
    aspectRatio: '16:9'
  });
  const [storyboardData, setStoryboardData] = useState<StoryboardData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const checkApiKey = () => {
    const hasKey = !!getStoredApiKey();
    setHasApiKey(hasKey);
    return hasKey;
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const currentUser = await storageService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          checkApiKey();

          const savedChars = await storageService.getCharacters();
          setCharacters(savedChars);
          const savedProjects = await storageService.getProjects();
          setProjects(savedProjects);
        } else {
          // Check API key even without user (for guest mode)
          checkApiKey();
        }
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    if (user) storageService.saveCharacters(characters);
  }, [characters, user]);

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);
    checkApiKey();
    const savedChars = await storageService.getCharacters();
    setCharacters(savedChars);
    const savedProjects = await storageService.getProjects();
    setProjects(savedProjects);
    setViewMode('wizard');
  };

  const handleLogout = () => {
    storageService.logout();
    clearStoredApiKey();
    setUser(null);
    setHasApiKey(false);
    handleReset();
  };

  const handleResetApiKey = () => {
    clearStoredApiKey();
    setHasApiKey(false);
  };

  const handleApiKeySelected = () => {
    setHasApiKey(true);
  };

  const saveProject = async (currentScenes?: Scene[], silent: boolean = false, dataOverride?: StoryboardData) => {
      let projectId = currentProjectId;
      if (!projectId) {
          projectId = Date.now().toString();
          setCurrentProjectId(projectId);
      }

      let updatedStoryboardData = dataOverride || storyboardData;
      
      if (currentScenes && updatedStoryboardData) {
          updatedStoryboardData = { ...updatedStoryboardData, scenes: currentScenes };
          if (!dataOverride) {
              setStoryboardData(updatedStoryboardData);
          }
      }

      // Snapshot characters used in project
      // For now, we take all global characters that match names in config
      // But better is to track them. 
      // Simplified: Just save all current characters related to this project flow.
      const projectChars = characters.filter(c =>
          c.name === storyConfig.mainCharacterName ||
          c.name === storyConfig.targetToSave ||
          storyConfig.additionalCharacters?.some(ac => ac.name === c.name) ||
          c.name === storyConfig.humanCharacter
      );

      const projectToSave: SavedProject = {
          id: projectId,
          name: storyConfig.title || '제목 없음',
          updatedAt: new Date().toISOString(),
          characters: projectChars, 
          storyConfig,
          storyboardData: updatedStoryboardData,
          step: updatedStoryboardData ? AppStep.STORYBOARD : AppStep.SETUP_STORY
      };
      
      try {
          await storageService.saveProject(projectToSave);
          
          const updatedProjects = await storageService.getProjects();
          setProjects(updatedProjects);
      } catch (e: any) {
          if (!silent) alert(`저장 실패: ${e.message}`);
      }
  };

  const handleGenerateStoryPlan = async () => {
    setIsGenerating(true);
    try {
      // 1. Generate text-based storyboard
      const data = await generateStoryboardPlan(storyConfig);
      setStoryboardData(data);
      
      // 2. Move to Casting Step
      setCurrentStep(AppStep.ASSIGN_CHARACTERS);
      
      // Save interim state
      await saveProject(undefined, true, data);
      
    } catch (error) {
      console.error(error);
      alert("스토리보드 생성에 실패했습니다. API 키나 입력값을 확인해주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCharacterAssigned = (newChar: Character) => {
    // 1. Add new char to library (avoid duplicates by ID or name update)
    // We append or update
    const existingIndex = characters.findIndex(c => c.name === newChar.name); // Simple check by name for this flow
    let updatedChars = [...characters];
    
    if (existingIndex >= 0) {
        // Update existing if re-generating
        updatedChars[existingIndex] = { ...updatedChars[existingIndex], ...newChar };
    } else {
        updatedChars.push(newChar);
    }
    
    setCharacters(updatedChars);
    storageService.saveCharacters(updatedChars);

    // 2. Update config with ID if it's main character
    if (newChar.name === storyConfig.mainCharacterName) {
         setStoryConfig(prev => ({ ...prev, mainCharacterId: newChar.id }));
    }
    
    // 3. Move to Final Step if this was triggered as "Confirm All"
    // Since we changed CharacterAssignment to trigger for each char or all, 
    // let's assume we move to step 3 after this batch update.
    setCurrentStep(AppStep.STORYBOARD);
    
    // Save project
    setTimeout(() => {
        saveProject(); // Save with updated characters state
    }, 100);
  };

  const handleReset = () => {
    setCurrentStep(AppStep.SETUP_STORY);
    setStoryboardData(null);
    setStoryConfig({
      title: '',
      mainCharacterName: '',
      mainCharacterDescription: '',
      mainCharacterId: null,
      additionalCharacters: [],
      targetToSave: '',
      targetToSaveDescription: '',
      dangerThreat: '',
      dangerTool: '',
      dangerLocation: '',
      backgroundSetting: '',
      humanCharacter: '',
      aspectRatio: '16:9'
    });
    setCurrentProjectId(null);
    setViewMode('wizard');
  };

  const startNewProject = () => {
    handleReset();
    setCurrentStep(AppStep.SETUP_STORY);
    setCurrentProjectId(Date.now().toString());
  };

  const loadProject = (project: SavedProject) => {
    setCurrentProjectId(project.id);
    setStoryConfig(project.storyConfig);
    setStoryboardData(project.storyboardData);
    setCurrentStep(project.step);
    setViewMode('wizard');
  };

  // Restore from JSON backup
  const handleRestoreBackup = async (backup: {
    storyConfig: StoryConfig;
    characters: Character[];
    storyboard: StoryboardData;
  }) => {
    // Restore story config
    setStoryConfig(backup.storyConfig);

    // Restore characters (merge with existing)
    const restoredChars = backup.characters;
    const mergedChars = [...characters];

    restoredChars.forEach(rc => {
      const existingIdx = mergedChars.findIndex(c => c.name === rc.name);
      if (existingIdx >= 0) {
        mergedChars[existingIdx] = rc; // Update existing
      } else {
        mergedChars.push(rc); // Add new
      }
    });

    setCharacters(mergedChars);
    storageService.saveCharacters(mergedChars);

    // Restore storyboard
    setStoryboardData(backup.storyboard);

    // Set to storyboard step
    setCurrentStep(AppStep.STORYBOARD);
    setViewMode('wizard');

    // Create new project ID for this restored project
    const newProjectId = Date.now().toString();
    setCurrentProjectId(newProjectId);

    // Save project to storage so it appears in Projects/Gallery
    const projectToSave: SavedProject = {
      id: newProjectId,
      name: backup.storyConfig.title || '복원된 프로젝트',
      updatedAt: new Date().toISOString(),
      characters: restoredChars,
      storyConfig: backup.storyConfig,
      storyboardData: backup.storyboard,
      step: AppStep.STORYBOARD
    };

    try {
      await storageService.saveProject(projectToSave);
      const updatedProjects = await storageService.getProjects();
      setProjects(updatedProjects);
    } catch (e: any) {
      console.error('프로젝트 저장 실패:', e);
    }

    alert('백업이 성공적으로 복원되었습니다!');
  };

  // Handle backup file upload from header
  const handleBackupFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string) as BackupData;

        // Validate backup structure
        if (!backupData.storyConfig || !backupData.characters || !backupData.storyboard) {
          throw new Error('유효하지 않은 백업 파일입니다.');
        }

        if (confirm(`"${backupData.storyConfig.title}" 프로젝트를 복원하시겠습니까?\n(현재 작업 내용이 덮어씌워집니다)`)) {
          handleRestoreBackup(backupData);
        }
      } catch (err: any) {
        alert('백업 파일을 읽는데 실패했습니다: ' + err.message);
      }
    };
    reader.readAsText(file);

    // Reset input
    if (backupFileInputRef.current) {
      backupFileInputRef.current.value = '';
    }
  };

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">로딩 중...</div>;
  if (!user) return <AuthScreen onLogin={handleLogin} />;
  if (!hasApiKey) return <ApiKeySetup onKeySelected={handleApiKeySelected} />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 fixed left-0 top-0 h-full z-50`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-pink-500/20 group-hover:scale-110 transition-transform flex-shrink-0">3D</div>
            {sidebarOpen && <h1 className="font-bold tracking-tight text-sm whitespace-nowrap">Ani-Director</h1>}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          <button
            onClick={() => { setViewMode('wizard'); handleReset(); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${viewMode === 'wizard' ? 'bg-gradient-to-r from-pink-600/20 to-purple-600/20 text-white border border-pink-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {sidebarOpen && <span className="text-sm font-medium">새 프로젝트</span>}
          </button>

          <button
            onClick={() => setViewMode('projects')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${viewMode === 'projects' ? 'bg-cyan-600/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
            </svg>
            {sidebarOpen && <span className="text-sm font-medium">프로젝트</span>}
          </button>

          <button
            onClick={() => setViewMode('storyboards')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${viewMode === 'storyboards' ? 'bg-pink-600/20 text-pink-400 border border-pink-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
            {sidebarOpen && <span className="text-sm font-medium">갤러리</span>}
          </button>
        </nav>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-slate-800 space-y-1">
          <button
            onClick={handleResetApiKey}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-all"
            title="API Key 변경"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
            {sidebarOpen && <span className="text-sm">API Key</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
            </svg>
            {sidebarOpen && <span className="text-sm">로그아웃</span>}
          </button>

          {/* Sidebar Toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 ${sidebarOpen ? 'ml-56' : 'ml-16'} transition-all duration-300`}>
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-40 shadow-md shadow-black/20">
          <div className="px-6 h-14 flex items-center justify-between">
            {viewMode === 'wizard' && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep(AppStep.SETUP_STORY)}
                  className={`px-3 py-1 rounded-full transition-all text-sm cursor-pointer hover:scale-105 ${
                    currentStep === AppStep.SETUP_STORY
                      ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-500/30'
                      : storyConfig.title
                        ? 'text-cyan-400/70 hover:bg-cyan-900/30 hover:text-cyan-300'
                        : 'text-slate-500'
                  }`}
                >
                  1. 스토리 설정
                  {storyConfig.title && currentStep !== AppStep.SETUP_STORY && (
                    <span className="ml-1 text-green-400">✓</span>
                  )}
                </button>
                <button
                  onClick={() => storyboardData && setCurrentStep(AppStep.ASSIGN_CHARACTERS)}
                  disabled={!storyboardData}
                  className={`px-3 py-1 rounded-full transition-all text-sm ${
                    currentStep === AppStep.ASSIGN_CHARACTERS
                      ? 'bg-pink-900/50 text-pink-300 border border-pink-500/30'
                      : storyboardData
                        ? characters.length > 0
                          ? 'text-pink-400/70 hover:bg-pink-900/30 hover:text-pink-300 cursor-pointer hover:scale-105'
                          : 'text-pink-400/70 hover:bg-pink-900/30 hover:text-pink-300 cursor-pointer hover:scale-105'
                        : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  2. 캐릭터 캐스팅
                  {characters.length > 0 && currentStep !== AppStep.ASSIGN_CHARACTERS && (
                    <span className="ml-1 text-green-400">✓</span>
                  )}
                </button>
                <button
                  onClick={() => storyboardData && characters.length > 0 && setCurrentStep(AppStep.STORYBOARD)}
                  disabled={!storyboardData || characters.length === 0}
                  className={`px-3 py-1 rounded-full transition-all text-sm ${
                    currentStep === AppStep.STORYBOARD
                      ? 'bg-purple-900/50 text-purple-300 border border-purple-500/30'
                      : storyboardData && characters.length > 0
                        ? 'text-purple-400/70 hover:bg-purple-900/30 hover:text-purple-300 cursor-pointer hover:scale-105'
                        : 'text-slate-600 cursor-not-allowed'
                  }`}
                >
                  3. 큐시트
                </button>
              </div>
            )}
            {viewMode === 'projects' && (
              <h2 className="text-lg font-bold text-white">프로젝트 목록</h2>
            )}
            {viewMode === 'storyboards' && (
              <h2 className="text-lg font-bold text-white">스토리보드 갤러리</h2>
            )}
            {/* Right Side Actions */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Portal target for CueSheet header actions */}
              <div id="header-actions" className="flex items-center gap-2"></div>

              {/* Global Backup Upload Button */}
              <input
                ref={backupFileInputRef}
                type="file"
                accept=".json"
                onChange={handleBackupFileUpload}
                className="hidden"
              />
              <button
                onClick={() => backupFileInputRef.current?.click()}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-md text-xs border border-slate-700 flex items-center gap-1.5 transition-colors"
                title="백업 파일 복원"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                복원
              </button>
              <div className="h-4 w-px bg-slate-700"></div>
              <div className="text-xs text-slate-500">
                {user?.email}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full">
          {viewMode === 'projects' && (
            <div className="p-6 animate-fade-in">
              <Dashboard onNewProject={startNewProject} onLoadProject={loadProject} projects={projects} />
            </div>
          )}

          {viewMode === 'storyboards' && (
            <div className="w-full bg-slate-950 min-h-[calc(100vh-56px)] animate-fade-in">
              <StoryboardLibrary projects={projects} />
            </div>
          )}

          {viewMode === 'wizard' && (
            <div className="p-3 sm:p-4 animate-fade-in h-[calc(100vh-56px)] overflow-auto">
              {/* Step 1: Story Setup */}
              {currentStep === AppStep.SETUP_STORY && (
                <ProjectSetup
                  config={storyConfig}
                  setConfig={setStoryConfig}
                  onGenerate={handleGenerateStoryPlan}
                  isGenerating={isGenerating}
                />
              )}

              {/* Step 2: Casting */}
              {currentStep === AppStep.ASSIGN_CHARACTERS && (
                <CharacterAssignment
                  config={storyConfig}
                  existingCharacters={characters}
                  onAssign={handleCharacterAssigned}
                />
              )}

              {/* Step 3: Visualization */}
              {currentStep === AppStep.STORYBOARD && storyboardData && (
                <CueSheet
                  data={storyboardData}
                  characters={characters}
                  songConfig={storyConfig}
                  onReset={handleReset}
                  onSave={(scenes) => saveProject(scenes)}
                  onRestore={handleRestoreBackup}
                />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
