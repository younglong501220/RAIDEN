import React from 'react';
import { Play, Trophy, Sliders, Shield, Zap, Sparkles, Bomb } from 'lucide-react';
import { GameSettings } from '../game/types';

interface TitleScreenProps {
  onStart: () => void;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  settings: GameSettings;
  onSelectDifficulty: (diff: 'EASY' | 'NORMAL' | 'HARD') => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  onOpenLeaderboard,
  onOpenSettings,
  settings,
  onSelectDifficulty,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-black/90 via-slate-950/85 to-black/95 font-mono text-white select-none backdrop-blur-[2px]">
      {/* Top Banner */}
      <div className="text-center pt-2">
        <div className="inline-block px-3 py-1 rounded-full bg-red-600/30 border border-red-500/50 text-[11px] font-bold text-red-300 tracking-widest uppercase mb-2 animate-pulse">
          ★ 經典街機 100% 網頁重製版 ★
        </div>

        {/* Raiden Retro Arcade Title */}
        <h1 className="text-4xl md:text-5xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-600 to-amber-500 drop-shadow-[0_4px_16px_rgba(239,68,68,0.9)]">
          雷電 RAIDEN
        </h1>
        <p className="text-xs md:text-sm text-cyan-400 font-bold tracking-wider mt-1">
          PLASMA LASER & VULCAN SPECIAL ASSAULT
        </p>
      </div>

      {/* Feature Highlights Card */}
      <div className="w-full max-w-sm bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-xs space-y-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span><b>藍色彎曲質子雷射 (L)</b>：電漿電鞭自動索敵切割</span>
        </div>
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span><b>火神擴散機砲 (P)</b>：扇形多重火網，大面積清兵</span>
        </div>
        <div className="flex items-center gap-2 text-red-300">
          <Bomb className="w-4 h-4 text-red-400 shrink-0" />
          <span><b>全螢幕毀滅核彈 (B)</b>：消滅全場敵彈並重創巨型 Boss</span>
        </div>
      </div>

      {/* Controls Briefing */}
      <div className="text-center text-[11px] text-gray-400 space-y-1">
        <div>移動：<span className="text-cyan-300 font-bold">W A S D</span> / <span className="text-cyan-300 font-bold">方向鍵</span></div>
        <div>射擊：<span className="text-amber-300 font-bold">J / Z / 空白鍵</span> (支援自動連射)</div>
        <div>投彈：<span className="text-red-400 font-bold">K / X</span> ｜ 行動裝置支援螢幕虛擬搖桿</div>
      </div>

      {/* Difficulty Quick Select */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">難度:</span>
        {(['EASY', 'NORMAL', 'HARD'] as const).map((diff) => (
          <button
            key={diff}
            onClick={() => onSelectDifficulty(diff)}
            className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
              settings.difficulty === diff
                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                : 'bg-slate-900 border-slate-700 text-gray-400 hover:text-white'
            }`}
          >
            {diff === 'EASY' ? '輕鬆' : diff === 'NORMAL' ? '街機標準' : '地獄狂暴'}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-2.5">
        <button
          onClick={onStart}
          className="w-full py-3 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-black text-lg tracking-widest uppercase rounded border-2 border-amber-300 shadow-[0_0_25px_rgba(239,68,68,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-white" /> 出擊 START
        </button>

        <div className="flex gap-2">
          <button
            onClick={onOpenLeaderboard}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-amber-300 font-bold text-xs uppercase tracking-wider rounded border border-amber-600/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" /> 英雄榜
          </button>
          <button
            onClick={onOpenSettings}
            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded border border-cyan-600/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" /> 設定
          </button>
        </div>
      </div>

      {/* Credit Footer */}
      <div className="text-[10px] text-gray-500 tracking-wider">
        INSERT COIN • 100% STANDALONE WEB AUDIO SYNTHESIS
      </div>
    </div>
  );
};
