import React, { useState } from 'react';
import { HighScoreEntry } from '../game/types';
import { Trophy, X, Award, Calendar } from 'lucide-react';

interface ScoreBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingScore?: number | null;
  onSaveScore?: (name: string) => void;
}

export const ScoreBoardModal: React.FC<ScoreBoardModalProps> = ({
  isOpen,
  onClose,
  pendingScore,
  onSaveScore,
}) => {
  const [pilotName, setPilotName] = useState('ACE');

  if (!isOpen) return null;

  // Retrieve scores from localStorage
  const saved = localStorage.getItem('raiden_leaderboard');
  const scores: HighScoreEntry[] = saved
    ? JSON.parse(saved)
    : [
        { name: 'RDN', score: 188500, stage: 2, weapon: 'LASER', date: '2026-10-01' },
        { name: 'TOP', score: 142000, stage: 2, weapon: 'VULCAN', date: '2026-09-28' },
        { name: 'VUL', score: 98000, stage: 1, weapon: 'VULCAN', date: '2026-09-25' },
        { name: 'SKY', score: 72400, stage: 1, weapon: 'LASER', date: '2026-09-20' },
        { name: 'ACE', score: 55000, stage: 1, weapon: 'LASER', date: '2026-09-18' },
      ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSaveScore && pilotName.trim()) {
      onSaveScore(pilotName.trim().toUpperCase().slice(0, 3));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-950 border-2 border-amber-500 rounded-lg shadow-[0_0_30px_rgba(245,158,11,0.3)] p-6 text-white font-mono">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4 border-b border-amber-500/30 pb-3">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-xl font-bold tracking-wider text-amber-400">
            名人堂 (HALL OF FAME)
          </h2>
        </div>

        {/* Submit Pending Score Prompt */}
        {pendingScore !== undefined && pendingScore !== null && onSaveScore && (
          <form onSubmit={handleSave} className="mb-6 p-3 bg-red-950/40 border border-red-500/50 rounded-md">
            <div className="text-xs text-red-300 font-bold mb-1">NEW HIGH SCORE DETECTED!</div>
            <div className="text-2xl font-black text-amber-300 mb-2">
              {pendingScore.toLocaleString()} PTS
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-300">代號 (3 LETTERS):</label>
              <input
                type="text"
                maxLength={3}
                value={pilotName}
                onChange={(e) => setPilotName(e.target.value.toUpperCase())}
                className="w-20 px-2 py-1 bg-black border border-amber-400 text-center font-bold text-lg text-amber-300 rounded focus:outline-none focus:ring-1 focus:ring-amber-300"
              />
              <button
                type="submit"
                className="flex-1 px-3 py-1.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded"
              >
                登記英雄榜
              </button>
            </div>
          </form>
        )}

        {/* Leaderboard Table */}
        <div className="space-y-2 mb-6 max-h-60 overflow-y-auto pr-1">
          {scores.map((entry, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between p-2 rounded text-sm ${
                idx === 0
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                  : idx === 1
                  ? 'bg-slate-800/60 border border-slate-700 text-slate-200'
                  : idx === 2
                  ? 'bg-amber-900/30 border border-amber-800/40 text-amber-400'
                  : 'bg-black/40 text-gray-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold w-5 text-center">
                  {idx === 0 ? '👑' : `${idx + 1}.`}
                </span>
                <span className="font-black text-white tracking-widest">{entry.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                  ST.{entry.stage}
                </span>
              </div>
              <div className="text-right">
                <div className="font-black font-mono text-base">{entry.score.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-gray-300 font-bold text-xs uppercase tracking-wider rounded border border-slate-700 transition-colors"
        >
          關閉返回
        </button>
      </div>
    </div>
  );
};
