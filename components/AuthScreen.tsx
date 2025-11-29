
import React, { useState } from 'react';
import { User } from '../types';
import { storageService } from '../services/storage';

interface Props {
  onLogin: (user: User) => void;
}

const AuthScreen: React.FC<Props> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    const user: User = { username, password };
    // Simple auth simulation as per requirements
    await storageService.login(user);
    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-pink-500"></div>
        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          MV 디렉터 AI 플랫폼
        </h1>
        <p className="text-center text-slate-400 mb-8 text-sm">Studio SoUL</p>
        
        <div className="flex gap-2 mb-8 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button 
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${isLogin ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsLogin(true)}
          >
            로그인
          </button>
          <button 
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${!isLogin ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            onClick={() => setIsLogin(false)}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">아이디</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700"
              placeholder="아이디를 입력하세요"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">비밀번호</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-700"
              placeholder="비밀번호를 입력하세요"
              required
            />
          </div>
          
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] mt-6"
          >
            {isLogin ? '스튜디오 입장' : '계정 생성'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
