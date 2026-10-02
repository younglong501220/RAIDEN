import React from 'react';
import { GameSettings } from '../game/types';
import { Volume2, VolumeX, Music, Tv, Shield, X, Sliders } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-mono text-white">
      <div className="relative w-full max-w-md bg-slate-950 border-2 border-cyan-500 rounded-lg shadow-[0_0_30px_rgba(6,182,212,0.3)] p-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-5 border-b border-cyan-500/30 pb-3">
          <Sliders className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-bold tracking-wider text-cyan-400">
            遊戲設定 (SYSTEM CONFIG)
          </h2>
        </div>

        <div className="space-y-4 text-sm">
          {/* Audio Section */}
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-3">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" /> 音效與配樂 (AUDIO)
            </div>

            {/* SFX Volume */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>音效音量 (SFX)</span>
                <span>{Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => handleChange('sfxVolume', parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* BGM Toggle & Volume */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="flex items-center gap-1">
                  <Music className="w-3.5 h-3.5 text-cyan-400" /> 80s 街機晶片配樂 (BGM)
                </span>
                <span>{settings.musicEnabled ? `${Math.round(settings.musicVolume * 100)}%` : '關閉'}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={!settings.musicEnabled}
                  value={settings.musicVolume}
                  onChange={(e) => handleChange('musicVolume', parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer disabled:opacity-30"
                />
                <button
                  type="button"
                  onClick={() => handleChange('musicEnabled', !settings.musicEnabled)}
                  className={`px-2.5 py-1 text-xs rounded font-bold border transition-colors ${
                    settings.musicEnabled
                      ? 'bg-cyan-600/30 border-cyan-400 text-cyan-300'
                      : 'bg-slate-800 border-slate-700 text-gray-400'
                  }`}
                >
                  {settings.musicEnabled ? '開' : '關'}
                </button>
              </div>
            </div>
          </div>

          {/* Video & Display Section */}
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800 space-y-3">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Tv className="w-4 h-4" /> 復古街機顯示 (DISPLAY)
            </div>

            {/* Scanlines Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-200">CRT 掃描線濾鏡 (Scanlines)</div>
                <div className="text-[11px] text-gray-400">重現 90 年代街機顯像管質感</div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('scanlines', !settings.scanlines)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.scanlines ? 'bg-cyan-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.scanlines ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Cabinet Bezel Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-200">街機機台邊框 (Arcade Bezel)</div>
                <div className="text-[11px] text-gray-400">顯示復古街機框體與兩側操作貼紙</div>
              </div>
              <button
                type="button"
                onClick={() => handleChange('arcadeBezel', !settings.arcadeBezel)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.arcadeBezel ? 'bg-cyan-600' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full transition-transform ${
                    settings.arcadeBezel ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Difficulty Section */}
          <div className="p-3 bg-slate-900/60 rounded border border-slate-800">
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> 挑戰難度 (DIFFICULTY)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['EASY', 'NORMAL', 'HARD'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleChange('difficulty', diff)}
                  className={`py-1.5 text-xs font-bold rounded border transition-colors ${
                    settings.difficulty === diff
                      ? 'bg-red-600 border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      : 'bg-slate-800/80 border-slate-700 text-gray-400 hover:bg-slate-800'
                  }`}
                >
                  {diff === 'EASY' ? '輕鬆 (EASY)' : diff === 'NORMAL' ? '標準 (ARCADE)' : '瘋狂 (HELL)'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Done Button */}
        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded border border-cyan-400 transition-all shadow-lg"
        >
          儲存並返回
        </button>
      </div>
    </div>
  );
};
