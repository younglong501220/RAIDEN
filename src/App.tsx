/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameSettings, GameState, HighScoreEntry, WeaponType } from './game/types';
import { GameHUD } from './components/GameHUD';
import { VirtualControls } from './components/VirtualControls';
import { TitleScreen } from './components/TitleScreen';
import { GameOverScreen, VictoryScreen } from './components/GameOverScreen';
import { PauseModal } from './components/PauseModal';
import { SettingsModal } from './components/SettingsModal';
import { ScoreBoardModal } from './components/ScoreBoardModal';
import { ArcadeCabinetFrame } from './components/ArcadeCabinetFrame';

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  sfxVolume: 0.75,
  musicVolume: 0.45,
  scanlines: true,
  crtCurvature: true,
  autoFire: true,
  difficulty: 'NORMAL',
  arcadeBezel: true,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Settings State with LocalStorage
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('raiden_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Game UI States
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [score, setScore] = useState(0);
  const [hiScore, setHiScore] = useState(100000);
  const [lives, setLives] = useState(3);
  const [bombs, setBombs] = useState(3);
  const [weapon, setWeapon] = useState<WeaponType>('LASER');
  const [power, setPower] = useState(1);
  const [stage, setStage] = useState(1);
  const [stageName, setStageName] = useState('STAGE 1: 基地突擊');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [pendingScore, setPendingScore] = useState<number | null>(null);

  // Save settings when changed
  const handleUpdateSettings = (newSettings: GameSettings) => {
    setSettings(newSettings);
    localStorage.setItem('raiden_settings', JSON.stringify(newSettings));
    if (engineRef.current) {
      engineRef.current.updateSettings(newSettings);
    }
  };

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, settings, {
      onScoreUpdate: (newScore, newHi) => {
        setScore(newScore);
        setHiScore(newHi);
      },
      onLivesUpdate: (newLives) => {
        setLives(newLives);
      },
      onBombsUpdate: (newBombs) => {
        setBombs(newBombs);
      },
      onWeaponUpdate: (newWeapon, newPower) => {
        setWeapon(newWeapon);
        setPower(newPower);
      },
      onGameOver: (finalScore, finalStage) => {
        setGameState('GAMEOVER');
        setPendingScore(finalScore);
      },
      onVictory: (finalScore) => {
        setGameState('VICTORY');
        setPendingScore(finalScore);
      },
      onStageChange: (newStage, name) => {
        setStage(newStage);
        setStageName(name);
      },
      onBossWarning: () => {
        // Handled in canvas engine
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync settings updates to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Game control handlers
  const handleStartGame = () => {
    if (!engineRef.current) return;
    setGameState('PLAYING');
    setPendingScore(null);
    engineRef.current.start();
  };

  const handleRestartGame = () => {
    if (!engineRef.current) return;
    setGameState('PLAYING');
    setPendingScore(null);
    engineRef.current.reset();
    engineRef.current.start();
  };

  const handleTogglePause = () => {
    if (gameState === 'PLAYING') {
      if (engineRef.current) engineRef.current.togglePause();
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      if (engineRef.current) engineRef.current.togglePause();
      setGameState('PLAYING');
    }
  };

  const handleResume = () => {
    if (engineRef.current && gameState === 'PAUSED') {
      engineRef.current.togglePause();
      setGameState('PLAYING');
    }
  };

  const handleSaveScore = (name: string) => {
    if (pendingScore === null) return;
    const entry: HighScoreEntry = {
      name,
      score: pendingScore,
      stage,
      weapon,
      date: new Date().toISOString().split('T')[0],
    };

    const saved = localStorage.getItem('raiden_leaderboard');
    let list: HighScoreEntry[] = saved ? JSON.parse(saved) : [];
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    list = list.slice(0, 10);
    localStorage.setItem('raiden_leaderboard', JSON.stringify(list));
    setPendingScore(null);
    setIsLeaderboardOpen(true);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen bg-[#07090e] text-white flex flex-col items-center justify-center overflow-hidden font-sans select-none"
    >
      <ArcadeCabinetFrame
        showBezel={settings.arcadeBezel}
        score={score}
        hiScore={hiScore}
        stageName={stageName}
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTogglePause={handleTogglePause}
        onToggleFullscreen={handleToggleFullscreen}
      >
        {/* Game Monitor Box */}
        <div className="relative w-[340px] sm:w-[420px] md:w-[480px] h-[520px] sm:h-[580px] md:h-[640px] bg-black rounded-lg overflow-hidden border-4 border-slate-800 shadow-[0_0_35px_rgba(0,180,255,0.25)] flex items-center justify-center">
          {/* Main 2D Canvas */}
          <canvas
            ref={canvasRef}
            className="w-full h-full block bg-black object-contain image-rendering-pixelated"
          />

          {/* CRT Scanline Filter Overlay */}
          {settings.scanlines && (
            <div className="absolute inset-0 pointer-events-none crt-scanlines z-15 opacity-70" />
          )}

          {/* CRT Screen Edge Curvature & Vignette */}
          {settings.crtCurvature && (
            <div className="absolute inset-0 pointer-events-none crt-screen z-16" />
          )}

          {/* In-Game HUD (Visible during gameplay and pause) */}
          {(gameState === 'PLAYING' || gameState === 'PAUSED') && (
            <GameHUD
              score={score}
              hiScore={hiScore}
              lives={lives}
              bombs={bombs}
              weapon={weapon}
              power={power}
              stage={stage}
            />
          )}

          {/* Mobile Virtual Joystick & Touch Fire / Bomb Buttons */}
          {gameState === 'PLAYING' && (
            <VirtualControls engine={engineRef.current} bombsCount={bombs} />
          )}

          {/* Title Screen Overlay */}
          {gameState === 'TITLE' && (
            <TitleScreen
              onStart={handleStartGame}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              settings={settings}
              onSelectDifficulty={(diff) => handleUpdateSettings({ ...settings, difficulty: diff })}
            />
          )}

          {/* Pause Modal */}
          {gameState === 'PAUSED' && (
            <PauseModal
              isOpen={gameState === 'PAUSED'}
              onResume={handleResume}
              onRestart={handleRestartGame}
              onOpenSettings={() => setIsSettingsOpen(true)}
            />
          )}

          {/* Game Over Screen */}
          {gameState === 'GAMEOVER' && (
            <GameOverScreen
              score={score}
              stage={stage}
              onRestart={handleRestartGame}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            />
          )}

          {/* Victory Screen */}
          {gameState === 'VICTORY' && (
            <VictoryScreen
              score={score}
              onRestart={handleRestartGame}
              onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
            />
          )}
        </div>
      </ArcadeCabinetFrame>

      {/* Hall of Fame / Leaderboard Modal */}
      <ScoreBoardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        pendingScore={pendingScore}
        onSaveScore={handleSaveScore}
      />

      {/* System Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />
    </div>
  );
}
