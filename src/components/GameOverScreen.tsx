import React from 'react';
import { RotateCcw, Trophy, Award } from 'lucide-react';

interface GameOverScreenProps {
  score: number;
  stage: number;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  stage,
  onRestart,
  onOpenLeaderboard,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/90 font-mono text-white select-none backdrop-blur-sm animate-fade-in text-center">
      <div className="w-full max-w-sm p-6 bg-slate-950/90 border-2 border-red-600 rounded-lg shadow-[0_0_35px_rgba(239,68,68,0.5)]">
        <h2 className="text-4xl font-black italic tracking-widest text-red-500 mb-2 drop-shadow-[0_0_15px_rgba(239,68,68,0.9)] animate-pulse">
          GAME OVER
        </h2>
        <div className="text-xs text-gray-400 mb-6 uppercase tracking-wider">
          作戰結束 / ALL CRAFTS DESTROYED
        </div>

        {/* Score & Stage Breakdown */}
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-md mb-6 space-y-2">
          <div className="text-xs text-gray-400">最終戰績 (FINAL SCORE)</div>
          <div className="text-3xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score.toLocaleString()}
          </div>
          <div className="text-xs text-cyan-400 font-bold">
            抵達作戰區域: SECTOR {stage}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-sm tracking-widest uppercase rounded border border-red-400 flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 再次出擊 (RETRY)
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs tracking-wider uppercase rounded border border-amber-600/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" /> 登記 / 查看名人堂
          </button>
        </div>
      </div>
    </div>
  );
};

interface VictoryScreenProps {
  score: number;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
}

export const VictoryScreen: React.FC<VictoryScreenProps> = ({
  score,
  onRestart,
  onOpenLeaderboard,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/90 font-mono text-white select-none backdrop-blur-sm animate-fade-in text-center">
      <div className="w-full max-w-sm p-6 bg-slate-950/90 border-2 border-amber-400 rounded-lg shadow-[0_0_35px_rgba(245,158,11,0.6)]">
        <div className="text-xs text-amber-400 font-bold uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
          <Award className="w-4 h-4" /> MISSION ACCOMPLISHED
        </div>
        <h2 className="text-3xl font-black italic tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 mb-2 drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]">
          作戰大勝利
        </h2>
        <p className="text-xs text-cyan-300 mb-6">
          成功殲滅敵方鋼鐵巨型要塞！基地防線守護完畢！
        </p>

        {/* Score & Honors */}
        <div className="p-4 bg-slate-900/90 border border-amber-500/30 rounded-md mb-6 space-y-1">
          <div className="text-xs text-gray-400">總結榮譽得分 (TOTAL SCORE)</div>
          <div className="text-3xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score.toLocaleString()}
          </div>
          <div className="text-[11px] text-green-400 font-bold mt-1">
            獲得勳章: 王牌飛行員 (ACE PILOT)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-sm tracking-widest uppercase rounded border border-yellow-300 flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 再次出擊 (NEW MISSION)
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs tracking-wider uppercase rounded border border-amber-600/40 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" /> 銘刻於英雄榜
          </button>
        </div>
      </div>
    </div>
  );
};
