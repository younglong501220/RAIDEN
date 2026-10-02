import React, { useRef, useState, useEffect } from 'react';
import { GameEngine } from '../game/GameEngine';

interface VirtualControlsProps {
  engine: GameEngine | null;
  bombsCount: number;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({ engine, bombsCount }) => {
  const stickBaseRef = useRef<HTMLDivElement>(null);
  const [stickPos, setStickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isStickActive, setIsStickActive] = useState(false);
  const [touchId, setTouchId] = useState<number | null>(null);

  // Handle Joystick touch
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchId !== null) return;
    const touch = e.changedTouches[0];
    setTouchId(touch.identifier);
    setIsStickActive(true);
    updateStick(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isStickActive) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchId) {
        updateStick(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchId) {
        setIsStickActive(false);
        setTouchId(null);
        setStickPos({ x: 0, y: 0 });
        if (engine) {
          engine.touchStick = { x: 0, y: 0, active: false };
        }
        break;
      }
    }
  };

  const updateStick = (clientX: number, clientY: number) => {
    if (!stickBaseRef.current || !engine) return;
    const rect = stickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2;
    const distance = Math.hypot(dx, dy);

    const clampedDist = Math.min(distance, maxRadius);
    const angle = Math.atan2(dy, dx);

    const normX = Math.cos(angle) * (clampedDist / maxRadius);
    const normY = Math.sin(angle) * (clampedDist / maxRadius);

    setStickPos({
      x: Math.cos(angle) * clampedDist,
      y: Math.sin(angle) * clampedDist,
    });

    engine.touchStick = {
      x: normX,
      y: normY,
      active: true,
    };
  };

  const triggerVibrate = (pattern: number = 25) => {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex justify-between items-end p-4 md:hidden select-none">
      {/* Virtual D-pad / Joystick */}
      <div
        ref={stickBaseRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="pointer-events-auto relative w-32 h-32 rounded-full bg-slate-900/60 border-2 border-cyan-500/40 backdrop-blur-sm flex items-center justify-center shadow-lg"
      >
        {/* Stick nub */}
        <div
          style={{
            transform: `translate(${stickPos.x}px, ${stickPos.y}px)`,
          }}
          className={`w-14 h-14 rounded-full transition-transform duration-75 flex items-center justify-center ${
            isStickActive
              ? 'bg-cyan-500/80 shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110'
              : 'bg-cyan-600/50'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-white/60" />
        </div>
      </div>

      {/* Action Buttons: Fire & Bomb */}
      <div className="pointer-events-auto flex items-end gap-3 pb-2">
        {/* Bomb Button (B) */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            triggerVibrate(60);
            if (engine) engine.touchButtons.bomb = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (engine) engine.touchButtons.bomb = false;
          }}
          className={`relative w-16 h-16 rounded-full border-2 border-amber-500 bg-amber-600/70 active:bg-amber-500 active:scale-95 flex flex-col items-center justify-center text-white font-bold shadow-lg shadow-amber-900/50 transition-transform ${
            bombsCount === 0 ? 'opacity-40' : ''
          }`}
        >
          <span className="text-xs text-amber-200 uppercase tracking-tighter">BOMB</span>
          <span className="text-lg leading-none font-mono">💣</span>
          {bombsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {bombsCount}
            </span>
          )}
        </button>

        {/* Rapid Fire Button */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            triggerVibrate(20);
            if (engine) engine.touchButtons.fire = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            if (engine) engine.touchButtons.fire = false;
          }}
          className="w-20 h-20 rounded-full border-2 border-red-500 bg-red-600/80 active:bg-red-500 active:scale-95 flex flex-col items-center justify-center text-white font-black shadow-lg shadow-red-900/60 transition-transform"
        >
          <span className="text-xs tracking-wider text-red-200">FIRE</span>
          <span className="text-xl">⚡</span>
        </button>
      </div>
    </div>
  );
};
