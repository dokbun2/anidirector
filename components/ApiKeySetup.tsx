
import React, { useState } from 'react';

interface Props {
  onKeySelected: () => void;
}

export const GEMINI_API_KEY_STORAGE = 'gemini_api_key';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE);
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, key);
};

export const clearStoredApiKey = (): void => {
  localStorage.removeItem(GEMINI_API_KEY_STORAGE);
};

const ApiKeySetup: React.FC<Props> = ({ onKeySelected }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSaveKey = async () => {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      setError('API 키를 입력해주세요.');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Validate the API key by making a simple request
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${trimmedKey}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'API 키가 유효하지 않습니다.');
      }

      // Save the valid key
      setStoredApiKey(trimmedKey);
      onKeySelected();
    } catch (e: any) {
      console.error('API key validation error:', e);
      setError(e.message || 'API 키 검증에 실패했습니다.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isValidating) {
      validateAndSaveKey();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 animate-fade-in">
      <div className="w-full max-w-md bg-slate-900 rounded-2xl p-8 border border-slate-800 shadow-2xl text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-amber-600"></div>

        <div className="w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl mx-auto mb-6 flex items-center justify-center text-yellow-500 text-3xl font-bold shadow-lg border border-slate-700">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
            </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">Gemini API Key 설정</h2>
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Ani-Director를 사용하기 위해서는 Gemini API Key가 필요합니다.<br/>
          API Key를 입력해주세요.
        </p>

        <div className="mb-4">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Gemini API Key 입력"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            disabled={isValidating}
          />
          {error && (
            <p className="mt-2 text-red-400 text-sm text-left">{error}</p>
          )}
        </div>

        <button
          onClick={validateAndSaveKey}
          disabled={isValidating}
          className="w-full bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-amber-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] mb-6 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isValidating ? '검증 중...' : 'API Key 저장하기'}
        </button>

        <div className="bg-slate-950/50 rounded-lg p-4 text-xs text-slate-500 border border-slate-800/50">
          <p className="mb-2 font-semibold text-slate-400">API Key가 없으신가요?</p>
          <div className="flex flex-col gap-2">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-cyan-500 hover:underline hover:text-cyan-400 transition-colors">
              <span>Google AI Studio에서 키 발급받기</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-slate-500 hover:text-slate-300 transition-colors">
              <span>Billing 및 요금제 안내</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetup;
