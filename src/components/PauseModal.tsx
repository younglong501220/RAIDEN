import React from 'react';
import { Play, RotateCcw, Volume2, Sliders, Keyboard } from 'lucide-react';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  onResume,
  onRestart,
  onOpenSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in font-mono text-white select-none">
      <div className="w-full max-w-sm bg-slate-950 border-2 border-red-500 rounded-lg p-6 shadow-[0_0_30px_rgba(239,68,68,0.4)] text-center">
        <h2 className="text-3xl font-black tracking-widest text-red-500 mb-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
          PAUSED
        </h2>
        <p className="text-xs text-gray-400 mb-5">任務暫停中 / MISSION SUSPENDED</p>

        {/* Quick Controls Cheat Sheet */}
        <div className="mb-6 p-3 bg-slate-900/80 rounded border border-slate-800 text-left text-xs space-y-1.5">
          <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1">
            <Keyboard className="w-3.5 h-3.5" /> 快捷鍵位指令 (CONTROLS):
          </div>
          <div className="flex justify-between text-gray-300">
            <span>移動戰機</span>
            <span className="text-cyan-300">W A S D / 方向鍵</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>主武器射擊</span>
            <span className="text-cyan-300">J / Z / 空白鍵 (支援連射)</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>保命毀滅核彈</span>
            <span className="text-amber-400">K / X</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>暫停 / 繼續</span>
            <span className="text-gray-400">P / ESC</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm tracking-wider uppercase rounded border border-red-400 flex items-center justify-center gap-2 shadow-lg"
          >
            <Play className="w-4 h-4 fill-white" /> 繼續出擊 (RESUME)
          </button>

          <button
            onClick={onOpenSettings}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs tracking-wider uppercase rounded border border-slate-700 flex items-center justify-center gap-2"
          >
            <Sliders className="w-3.5 h-3.5" /> 系統設定 (SETTINGS)
          </button>

          <button
            onClick={onRestart}
            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white font-bold text-xs tracking-wider uppercase rounded border border-slate-800 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 重新開始任務 (RESTART)
          </button>
        </div>
      </div>
    </div>
  );
};
