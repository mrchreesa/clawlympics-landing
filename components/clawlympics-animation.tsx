"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";

export function ClawlympicsAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate random positions for energy particles
  const energyParticles = useMemo(() => 
    [...Array(20)].map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
      color: ['#ff5c35', '#ff8a65', '#ffa726', '#ffcc02', '#fff'][Math.floor(Math.random() * 5)]
    })), []
  );

  // Orbiting agents data - sea creatures
  const orbitingAgents = useMemo(() => [
    { icon: '🦞', color: '#ff5c35', delay: 0, duration: 8, radius: 135, direction: 1 },
    { icon: '🦀', color: '#eab308', delay: 2, duration: 10, radius: 145, direction: -1 },
    { icon: '🐙', color: '#a855f7', delay: 1, duration: 12, radius: 125, direction: 1 },
    { icon: '🦐', color: '#f97316', delay: 3, duration: 6, radius: 155, direction: -1 },
  ], []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
      {/* Radial gradient background glow */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 50% 50%, rgba(255, 92, 53, 0.2) 0%, transparent 70%),
              radial-gradient(ellipse 80% 60% at 50% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Hexagonal grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <pattern id="hexGrid" width="56" height="100" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
              <path 
                d="M28 0L56 16.67V50L28 66.67L0 50V16.67L28 0ZM28 100L56 83.33V116.67L28 133.33L0 116.67V83.33L28 100Z" 
                fill="none" 
                stroke="rgba(255, 92, 53, 0.3)" 
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexGrid)" style={{ animation: 'gridFloat 20s linear infinite' }} />
        </svg>
      </div>

      {/* Main Battle Arena */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Left Side - Lobster Claw */}
        <div 
          className="absolute z-20 left-[5%] md:left-[10%] top-1/2 -translate-y-1/2 w-32 md:w-40 lg:w-48"
          style={{ animation: 'lobsterAttack 3s ease-in-out infinite' }}
        >
          <div className="relative">
            {/* Glow effect behind lobster */}
            <div 
              className="absolute inset-0 blur-xl opacity-60"
              style={{
                background: 'radial-gradient(circle, rgba(255, 92, 53, 0.8) 0%, transparent 70%)',
                transform: 'scale(1.5)'
              }}
            />
            <Image
              src="/lobster-claw1.png"
              alt="Lobster Claw"
              width={200}
              height={200}
              className="relative z-10 drop-shadow-[0_0_20px_rgba(255,92,53,0.8)]"
              style={{ 
                filter: 'drop-shadow(0 0 10px rgba(255, 92, 53, 0.6))',
                // transform: 'scaleX(-1)' // Mirror to face right (toward center)
              }}
            />
           
          </div>
        </div>

        {/* Right Side - Crab Claw */}
        <div 
          className="absolute z-20 right-[5%] md:right-[10%] top-1/2 -translate-y-1/2 w-32 md:w-40 lg:w-48"
          style={{ animation: 'crabAttack 3s ease-in-out infinite' }}
        >
          <div className="relative">
            {/* Glow effect behind crab */}
            <div 
              className="absolute inset-0 blur-xl opacity-60"
              style={{
                background: 'radial-gradient(circle, rgba(234, 179, 8, 0.8) 0%, transparent 70%)',
                transform: 'scale(1.5)'
              }}
            />
            <Image
              src="/crab-claw1.png"
              alt="Crab Claw"
              width={200}
              height={200}
              className="relative z-10 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]"
              style={{ 
                filter: 'drop-shadow(0 0 10px rgba(234, 179, 8, 0.6))'
                // No mirror needed - already faces left (toward center)
              }}
            />
           
          </div>
        </div>

        {/* Center VS Badge and Effects */}
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full max-w-md max-h-md"
            style={{ filter: 'drop-shadow(0 0 30px rgba(255, 92, 53, 0.2))' }}
          >
            <defs>
              {/* Glowing gradients */}
              <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255, 92, 53, 0.4)" />
                <stop offset="50%" stopColor="rgba(255, 92, 53, 0.1)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>

              <filter id="agentGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Energy ring gradient */}
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff5c35" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ff8a65" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ff5c35" stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Center glow effect */}
            <circle cx="200" cy="200" r="80" fill="url(#centerGlow)" style={{ animation: 'pulseGlow 3s ease-in-out infinite' }} />

            {/* Rotating energy rings */}
            <g style={{ transformOrigin: '200px 200px', animation: 'rotateRing 15s linear infinite' }}>
              <circle cx="200" cy="200" r="70" fill="none" stroke="url(#ringGradient)" strokeWidth="1" strokeDasharray="10 20" opacity="0.6" />
            </g>
            <g style={{ transformOrigin: '200px 200px', animation: 'rotateRingReverse 20s linear infinite' }}>
              <circle cx="200" cy="200" r="90" fill="none" stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="5 15" opacity="0.4" />
            </g>
            <g style={{ transformOrigin: '200px 200px', animation: 'rotateRing 25s linear infinite' }}>
              <circle cx="200" cy="200" r="110" fill="none" stroke="#22c55e" strokeWidth="0.5" strokeDasharray="3 12" opacity="0.3" />
            </g>

            {/* Center clash effect */}
            <g style={{ animation: 'clashPulse 3s ease-in-out infinite' }}>
              <circle cx="200" cy="200" r="20" fill="rgba(255, 92, 53, 0.3)" />
              <circle cx="200" cy="200" r="12" fill="rgba(255, 255, 255, 0.2)" />
              <circle cx="200" cy="200" r="6" fill="rgba(255, 255, 255, 0.5)" />
            </g>

            {/* Orbiting AI Agents */}
            {orbitingAgents.map((agent, index) => (
              <g 
                key={index}
                style={{ 
                  transformOrigin: '200px 200px',
                  animation: `${agent.direction === 1 ? 'orbitAgent' : 'orbitAgentReverse'} ${agent.duration}s linear infinite`,
                  animationDelay: `${agent.delay}s`,
                  zIndex: 0
                }}
                filter="url(#agentGlow)"
              >
                {/* Agent glow circle */}
                <circle 
                  cx={200 + agent.radius} 
                  cy="200" 
                  r="16" 
                  fill={agent.color}
                  opacity="0.02"
                />
                {/* Agent icon */}
                <text 
                  x={200 + agent.radius} 
                  y="206" 
                  textAnchor="middle" 
                  fontSize="18" 
                  style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.8))' }}
                >
                  {agent.icon}
                </text>
              </g>
            ))}

            {/* VS Badge */}
            <g style={{ animation: 'vsPulse 2s ease-in-out infinite' }}>
              <rect x="170" y="180" width="60" height="40" rx="20" fill="rgba(0, 0, 0, 0.6)" stroke="#ff5c35" strokeWidth="2" />
              <text
                x="200"
                y="208"
                textAnchor="middle"
                fill="#ff5c35"
                fontSize="20"
                fontWeight="bold"
                style={{ textShadow: '0 0 15px rgba(255, 92, 53, 1)' }}
              >
                VS
              </text>
            </g>

            {/* Energy lightning bolts */}
            <g opacity="0.5" style={{ animation: 'lightningFlash 4s ease-in-out infinite' }}>
              <path d="M 130 200 L 150 185 L 145 195 L 165 180" stroke="#ff5c35" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 270 200 L 250 185 L 255 195 L 235 180" stroke="#eab308" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
            <g opacity="0.5" style={{ animation: 'lightningFlash 4s ease-in-out infinite 2s' }}>
              <path d="M 130 200 L 150 215 L 145 205 L 165 220" stroke="#ff5c35" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M 270 200 L 250 215 L 255 205 L 235 220" stroke="#eab308" strokeWidth="2" fill="none" strokeLinecap="round" />
            </g>
          </svg>
        </div>
      </div>

      {/* Floating Energy Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {energyParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `radial-gradient(circle, ${particle.color} 0%, transparent 70%)`,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animation: `floatParticle ${particle.duration}s ease-in-out infinite`,
              animationDelay: `${particle.delay}s`,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`
            }}
          />
        ))}
      </div>

      {/* Corner accent lines */}
      <div className="absolute top-4 left-4 w-16 h-16 opacity-40">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#ff5c35] to-transparent" />
        <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-[#ff5c35] to-transparent" />
      </div>
      <div className="absolute top-4 right-4 w-16 h-16 opacity-40">
        <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#eab308] to-transparent" />
        <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-[#eab308] to-transparent" />
      </div>
      <div className="absolute bottom-4 left-4 w-16 h-16 opacity-40">
        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#ff5c35] to-transparent" />
        <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-[#ff5c35] to-transparent" />
      </div>
      <div className="absolute bottom-4 right-4 w-16 h-16 opacity-40">
        <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-[#eab308] to-transparent" />
        <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-[#eab308] to-transparent" />
      </div>

      <style jsx>{`
        @keyframes gridFloat {
          0% { transform: translate(0, 0); }
          100% { transform: translate(28px, 50px); }
        }

        @keyframes lobsterAttack {
          0%, 100% { transform: translateY(-50%) translateX(0) rotate(0deg); }
          25% { transform: translateY(-50%) translateX(15px) rotate(3deg); }
          50% { transform: translateY(-50%) translateX(25px) rotate(5deg); }
          75% { transform: translateY(-50%) translateX(15px) rotate(3deg); }
        }

        @keyframes crabAttack {
          0%, 100% { transform: translateY(-50%) translateX(0) rotate(0deg); }
          25% { transform: translateY(-50%) translateX(-15px) rotate(-3deg); }
          50% { transform: translateY(-50%) translateX(-25px) rotate(-5deg); }
          75% { transform: translateY(-50%) translateX(-15px) rotate(-3deg); }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.15); }
        }

        @keyframes rotateRing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateRingReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes clashPulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.8); }
        }

        @keyframes orbitAgent {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes orbitAgentReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes vsPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        @keyframes lightningFlash {
          0%, 45%, 55%, 100% { opacity: 0; }
          48%, 52% { opacity: 0.8; }
        }

        @keyframes floatParticle {
          0%, 100% { 
            transform: translateY(0) translateX(0) scale(1);
            opacity: 0;
          }
          10% { opacity: 0.8; }
          50% { 
            transform: translateY(-30px) translateX(10px) scale(1.2);
            opacity: 0.6;
          }
          90% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
