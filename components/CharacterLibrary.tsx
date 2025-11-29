
import React, { useState } from 'react';
import { Character, SavedProject } from '../types';

interface Props {
  characters: Character[];
  setCharacters: (chars: Character[]) => void;
  projects: SavedProject[];
}

const CharacterLibrary: React.FC<Props> = ({ characters, setCharacters, projects }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingChar, setEditingChar] = useState<Partial<Character>>({});

  const handleSave = () => {
    if (!editingChar.name) return;
    
    if (editingChar.id) {
      setCharacters(characters.map(c => c.id === editingChar.id ? { ...c, ...editingChar } as Character : c));
    } else {
      const newChar: Character = {
        id: Date.now().toString(),
        name: editingChar.name!,
        description: editingChar.description || '',
        imageUrl: editingChar.imageUrl || null
      };
      setCharacters([...characters, newChar]);
    }
    setIsEditing(false);
    setEditingChar({});
  };

  const handleDelete = (id: string) => {
    const usedInProjects = projects.filter(p => p.characters.some(c => c.id === id));
    if (usedInProjects.length > 0) {
      const confirm = window.confirm(`이 캐릭터는 다음 프로젝트에 사용 중입니다: ${usedInProjects.map(p => p.name).join(', ')}. 정말 삭제하시겠습니까?`);
      if (!confirm) return;
    }
    setCharacters(characters.filter(c => c.id !== id));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditingChar(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Character Library</h2>
        <button 
          onClick={() => { setEditingChar({}); setIsEditing(true); }}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg"
        >
          + 캐릭터 등록
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {characters.map(char => (
          <div key={char.id} className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 relative group">
            <div className="aspect-square bg-slate-900 relative">
              {char.imageUrl ? (
                <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-600">No Image</div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => { setEditingChar(char); setIsEditing(true); }} className="bg-blue-600 text-white px-3 py-1 rounded">수정</button>
                <button onClick={() => handleDelete(char.id)} className="bg-red-600 text-white px-3 py-1 rounded">삭제</button>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-white">{char.name}</h3>
              <p className="text-slate-400 text-sm line-clamp-2">{char.description}</p>
            </div>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-2xl w-full max-w-md border border-slate-700">
            <h3 className="text-xl font-bold mb-4">{editingChar.id ? '캐릭터 수정' : '새 캐릭터'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">이름</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                  value={editingChar.name || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">외모 및 특징</label>
                <textarea 
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white h-24"
                  value={editingChar.description || ''}
                  onChange={e => setEditingChar(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">프로필 이미지</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-slate-400" />
                {editingChar.imageUrl && (
                  <img src={editingChar.imageUrl} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded-full border-2 border-slate-600" />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-slate-400 hover:text-white">취소</button>
              <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CharacterLibrary;
