import React from 'react';
import { WeaponType } from '../game/types';
import { Shield, Zap, Sparkles, Bomb } from 'lucide-react';

interface GameHUDProps {
  score: number;
  hiScore: number;
  lives: number;
  bombs: number;
  weapon: WeaponType;
  power: number;
  stage: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  score,
  hiScore,
  lives,
  bombs,
  weapon,
  power,
  stage,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-3 select-none">
      {/* Top Banner: Scores & Stage */}
      <div className="flex items-start justify-between bg-black/40 backdrop-blur-[2px] p-2 rounded border border-white/10 text-white font-mono">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">1P SCORE</div>
          <div className="text-xl md:text-2xl font-black text-amber-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {score.toLocaleString()}
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/80 text-white tracking-widest uppercase border border-red-400">
            STAGE {stage}
          </span>
          <div className="text-[10px] text-gray-300 mt-0.5">
            {stage === 1 ? 'AIRBASE' : 'FORTRESS'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-red-400 font-bold">HI-SCORE</div>
          <div className="text-xl md:text-2xl font-black text-red-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {hiScore.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Bottom Status: Weapon, Power Gauge, Lives & Bombs */}
      <div className="flex items-end justify-between bg-black/45 backdrop-blur-[2px] p-2 rounded border border-white/10">
        {/* Lives Counter & Silhouette */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">LIVES</div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(0, lives) }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 flex items-center justify-center bg-red-600/80 rounded-sm border border-red-400 shadow-sm"
                title={`Extra Life ${i + 1}`}
              >
                <span className="text-white text-xs">✈</span>
              </div>
            ))}
            {lives <= 0 && <span className="text-red-500 font-mono text-xs font-bold">WARNING! LAST CRAFT</span>}
          </div>
        </div>

        {/* Current Active Weapon & Power Level */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900/80 border border-white/15">
            {weapon === 'LASER' ? (
              <>
                <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-xs font-bold text-cyan-300 tracking-wide font-mono">
                  質子雷射 (LASER)
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 tracking-wide font-mono">
                  火神機砲 (VULCAN)
                </span>
              </>
            )}
            <span className="text-xs bg-white/20 text-white font-mono px-1 rounded">
              Lv.{power}
            </span>
          </div>

          {/* Power Level Dots */}
          <div className="flex gap-1 mt-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <div
                key={lvl}
                className={`w-3 h-1 rounded-full transition-all ${
                  lvl <= power
                    ? weapon === 'LASER'
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]'
                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                    : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bombs Counter */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">BOMBS</div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.max(0, bombs) }).map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 flex items-center justify-center bg-amber-500/90 rounded-full border border-amber-300 shadow-sm"
                title={`Thermonuclear Bomb ${i + 1}`}
              >
                <span className="text-black font-black text-[10px] font-mono">B</span>
              </div>
            ))}
            {bombs === 0 && <span className="text-gray-500 font-mono text-xs">NONE</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
