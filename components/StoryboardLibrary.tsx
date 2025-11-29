
import React, { useState } from 'react';
import { SavedProject } from '../types';

interface Props {
  projects: SavedProject[];
}

const StoryboardLibrary: React.FC<Props> = ({ projects }) => {
  const [filter, setFilter] = useState<'all' | 'concept' | 'storyboard'>('all');

  // Flatten scenes from all projects
  const allScenes = projects.flatMap(p => 
    (p.storyboardData?.scenes || []).map(s => ({ ...s, projectName: p.name, projectId: p.id }))
  );

  const images = allScenes.filter(s => s.generatedImageUrl || s.storyboardImageUrl);

  const handleDownloadImage = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
           <h2 className="text-xl font-bold text-white">갤러리</h2>
           <p className="text-slate-500 text-xs mt-0.5">생성된 장면과 스토리보드 모음</p>
        </div>
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['all', 'concept', 'storyboard'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              {f === 'all' ? '전체' : (f === 'concept' ? '컨셉' : '스토리보드')}
            </button>
          ))}
        </div>
      </div>

      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 2xl:columns-6 gap-3">
        {images.map((scene, idx) => (
          <React.Fragment key={`${scene.projectId}-${scene.id}-${idx}`}>
            {(filter === 'all' || filter === 'concept') && scene.generatedImageUrl && (
              <div className="break-inside-avoid bg-slate-900 rounded-lg border border-slate-800 overflow-hidden group mb-3 hover:border-cyan-500/50 transition-colors shadow-lg shadow-black/50">
                <div className="relative">
                    <img src={scene.generatedImageUrl} alt="Concept" className="w-full object-cover" loading="lazy" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-cyan-400 border border-cyan-500/30">컨셉</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                           onClick={() => handleDownloadImage(scene.generatedImageUrl!, `${scene.projectName}_concept_${scene.id}.png`)}
                           className="bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75v10.5m0 0L7.5 15.75M12 20.25l4.5-4.5M3 16.5V2.25" />
                            </svg>
                         </button>
                    </div>
                </div>
                <div className="p-2">
                  <div className="font-bold text-xs text-white truncate">{scene.projectName}</div>
                  <div className="text-[10px] text-slate-500 line-clamp-2">{scene.visualDescription}</div>
                </div>
              </div>
            )}

            {(filter === 'all' || filter === 'storyboard') && scene.storyboardImageUrl && (
              <div className="break-inside-avoid bg-slate-900 rounded-lg border border-slate-800 overflow-hidden group mb-3 hover:border-pink-500/50 transition-colors shadow-lg shadow-black/50">
                 <div className="relative">
                    <img src={scene.storyboardImageUrl} alt="Storyboard" className="w-full object-cover" loading="lazy" />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-[9px] text-pink-400 border border-pink-500/30">스토리보드</div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                           onClick={() => handleDownloadImage(scene.storyboardImageUrl!, `${scene.projectName}_storyboard_${scene.id}.png`)}
                           className="bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80"
                         >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75v10.5m0 0L7.5 15.75M12 20.25l4.5-4.5M3 16.5V2.25" />
                            </svg>
                         </button>
                    </div>
                </div>
                <div className="p-2">
                  <div className="font-bold text-xs text-white truncate">{scene.projectName}</div>
                  <div className="text-[10px] text-slate-500">Scene {scene.id}</div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {images.length === 0 && (
         <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
           <p>생성된 이미지가 아직 없습니다.</p>
           <p className="text-sm mt-2">프로젝트를 생성하고 장면을 만들어보세요!</p>
         </div>
      )}
    </div>
  );
};

export default StoryboardLibrary;
