import React from 'react';
import { Zap, Sparkles, Bomb, Award, Gamepad2, Volume2, Trophy, Sliders, Maximize2, Pause } from 'lucide-react';

interface ArcadeCabinetFrameProps {
  children: React.ReactNode;
  showBezel: boolean;
  score: number;
  hiScore: number;
  stageName: string;
  onOpenLeaderboard: () => void;
  onOpenSettings: () => void;
  onTogglePause: () => void;
  onToggleFullscreen: () => void;
}

export const ArcadeCabinetFrame: React.FC<ArcadeCabinetFrameProps> = ({
  children,
  showBezel,
  score,
  hiScore,
  stageName,
  onOpenLeaderboard,
  onOpenSettings,
  onTogglePause,
  onToggleFullscreen,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Top Header Marquee (Arcade Style) */}
      <header className="w-full max-w-5xl py-2 px-4 flex items-center justify-between z-30 font-mono border-b border-red-950/60 bg-gradient-to-r from-black via-red-950/30 to-black">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-black italic tracking-widest text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">
              雷電 RAIDEN
            </span>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded bg-red-600/30 text-red-300 font-bold border border-red-500/40">
              ARCADE TRIBUTE
            </span>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-gray-300 hover:text-white hover:border-slate-500 text-xs flex items-center gap-1 transition-colors"
            title="暫停遊戲 (P)"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden md:inline">暫停</span>
          </button>

          <button
            onClick={onOpenLeaderboard}
            className="p-1.5 rounded bg-slate-900 border border-amber-600/50 text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 transition-colors"
            title="名人堂排行榜"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span className="hidden md:inline">英雄榜</span>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded bg-slate-900 border border-cyan-600/50 text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1 transition-colors"
            title="系統設定"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden md:inline">設定</span>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded bg-slate-900 border border-slate-700 text-gray-300 hover:text-white text-xs transition-colors"
            title="全螢幕切換"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area: Left Bezel Wing + Center Canvas + Right Bezel Wing */}
      <div className="flex-1 w-full flex items-center justify-center p-1 md:p-3 relative z-10 max-h-[calc(100vh-45px)]">
        {/* Left Arcade Bezel Panel (Desktop Only) */}
        {showBezel && (
          <aside className="hidden lg:flex flex-col justify-between w-56 h-[640px] bg-gradient-to-b from-slate-950 via-red-950/20 to-slate-950 border-y-2 border-l-2 border-red-900/60 rounded-l-xl p-4 font-mono text-xs shadow-2xl mr-1">
            {/* Top Weapon Instruction */}
            <div>
              <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2 border-b border-red-900/40 pb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> 武裝系統 (WEAPONS)
              </div>
              <div className="space-y-3">
                <div className="p-2 rounded bg-red-950/30 border border-red-800/40">
                  <div className="flex items-center gap-1.5 font-bold text-red-400 mb-0.5">
                    <span className="w-4 h-4 bg-red-600 text-white rounded text-[10px] flex items-center justify-center">P</span>
                    火神重砲 (VULCAN)
                  </div>
                  <p className="text-[11px] text-gray-300">
                    拾取紅色晶體。隨等級升級擴展為 7-9 重超廣角扇形彈幕，適合大範圍清掃群聚戰機。
                  </p>
                </div>

                <div className="p-2 rounded bg-cyan-950/30 border border-cyan-800/40">
                  <div className="flex items-center gap-1.5 font-bold text-cyan-400 mb-0.5">
                    <span className="w-4 h-4 bg-cyan-600 text-white rounded text-[10px] flex items-center justify-center">L</span>
                    質子彎曲雷射 (LASER)
                  </div>
                  <p className="text-[11px] text-gray-300">
                    拾取藍色晶體。雷電傳奇電漿電鞭！如鞭子般靈動彎曲自動鎖定切割敵機與巨型戰壘。
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-weapons & Medals */}
            <div className="space-y-2">
              <div className="p-2 rounded bg-amber-950/30 border border-amber-800/40">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 mb-0.5">
                  <Award className="w-3.5 h-3.5" /> 黃金勳章 (+3000P)
                </div>
                <p className="text-[10px] text-gray-400">
                  擊毀敵方坦克或基地防禦工事時機率掉落，收集可大幅提升總分！
                </p>
              </div>

              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] text-gray-400">
                <span className="text-gray-300 font-bold">晶體變色秘技：</span> 道具會在紅色與藍色之間定期循環翻轉，算準時機拾取需要的武器！
              </div>
            </div>

            {/* Bottom Brand */}
            <div className="text-[10px] text-gray-500 text-center border-t border-slate-800 pt-2">
              SEIBU KAIHATSU TRIBUTE © 2026
            </div>
          </aside>
        )}

        {/* Center Canvas Game Frame */}
        <div className="relative flex items-center justify-center">
          {children}
        </div>

        {/* Right Arcade Bezel Panel (Desktop Only) */}
        {showBezel && (
          <aside className="hidden lg:flex flex-col justify-between w-56 h-[640px] bg-gradient-to-b from-slate-950 via-cyan-950/20 to-slate-950 border-y-2 border-r-2 border-cyan-900/60 rounded-r-xl p-4 font-mono text-xs shadow-2xl ml-1">
            {/* Top Mission Briefing */}
            <div>
              <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider mb-2 border-b border-cyan-900/40 pb-1 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" /> 操作說明 (CONTROLS)
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-gray-400">戰機導航:</span>
                  <span className="text-cyan-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    WASD / 方向鍵
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-gray-400">發射主砲:</span>
                  <span className="text-amber-300 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    J / Z / 空白鍵
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-800">
                  <span className="text-gray-400">保命核爆:</span>
                  <span className="text-red-400 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    K / X
                  </span>
                </div>
              </div>

              {/* Bomb feature highlight */}
              <div className="mt-4 p-2.5 rounded bg-amber-950/40 border border-amber-500/50">
                <div className="flex items-center gap-1 text-amber-400 font-bold mb-1">
                  <Bomb className="w-4 h-4" /> 毀滅性全屏炸彈 (BOMBER)
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">
                  施放後產生超震撼擴散射線火球！<b>消除全螢幕所有敵方子彈</b>並重創 Boss 核心，危急時切記果斷保命！
                </p>
              </div>
            </div>

            {/* Stage Info */}
            <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800 text-[11px]">
              <div className="text-gray-400 mb-1">CURRENT SECTOR</div>
              <div className="text-white font-bold text-xs truncate text-cyan-300">{stageName}</div>
              <div className="mt-2 text-[10px] text-gray-400">
                提示: 擊毀巨型戰壘即可晉級下一作戰區域！
              </div>
            </div>

            {/* Bottom Telemetry */}
            <div className="text-[10px] text-gray-500 text-center border-t border-slate-800 pt-2">
              INSERT COIN (1 CREDIT)
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
