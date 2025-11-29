
import React from 'react';
import { SavedProject } from '../types';

interface Props {
   onNewProject: () => void;
   onLoadProject: (p: SavedProject) => void;
   projects: SavedProject[];
}

const Dashboard: React.FC<Props> = ({ onNewProject, onLoadProject, projects }) => {
   return (
      <div className="space-y-6">
         <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">프로젝트 라이브러리</h2>
            <button onClick={onNewProject} className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg">
               + NEW 프로젝트
            </button>
         </div>

         {projects.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 rounded-xl border border-slate-800 text-slate-500">
               프로젝트가 없습니다. 첫 번째 애니메이션 스토리를 만들어보세요!
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {projects.map(p => (
                  <div key={p.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-pink-500 transition-all group relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-10">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-24 h-24 text-white">
                           <path d="M19.5 4.5h-15a1.5 1.5 0 00-1.5 1.5v12a1.5 1.5 0 001.5 1.5h15a1.5 1.5 0 001.5-1.5v-12a1.5 1.5 0 00-1.5-1.5zm-15 1.5h15v12h-15v-12zM8 11.5l6 4-6 4v-8z" />
                        </svg>
                     </div>
                     <div className="flex justify-between mb-2 relative z-10">
                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                        <span className="text-xs text-slate-500">{new Date(p.updatedAt).toLocaleDateString()}</span>
                     </div>
                     <div className="text-sm text-slate-400 mb-4 space-y-1 relative z-10">
                        <p><span className="text-slate-500">구조 대상:</span> {p.storyConfig?.targetToSave}</p>
                        <p><span className="text-slate-500">위협 요소:</span> {p.storyConfig?.dangerThreat}</p>
                     </div>
                     <div className="flex justify-between items-center relative z-10 pt-2 border-t border-slate-700/50">
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300 flex items-center gap-1">
                           주인공: {p.characters.length > 0 ? p.characters[0].name : '미정'}
                           {p.characters.length > 1 && ` 외 ${p.characters.length - 1}명`}
                        </span>
                        <button onClick={() => onLoadProject(p)} className="text-pink-400 hover:text-white font-medium text-sm flex items-center gap-1">
                           스튜디오 열기 &rarr;
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

export default Dashboard;
