"use client";

import { useEffect, useState } from "react";

export function ClawlympicsAnimation() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96 overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 92, 53, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 92, 53, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'gridMove 20s linear infinite'
          }}
        />
      </div>

      {/* Central Arena Ring */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          className="w-full h-full max-w-md max-h-md"
          style={{ animation: 'pulse 4s ease-in-out infinite' }}
        >
          {/* Olympic-style Rings Background */}
          <g className="opacity-30" style={{ animation: 'rotate 30s linear infinite' }}>
            <circle cx="130" cy="150" r="40" fill="none" stroke="#3b82f6" strokeWidth="3" />
            <circle cx="200" cy="150" r="40" fill="none" stroke="#000" strokeWidth="3" />
            <circle cx="270" cy="150" r="40" fill="none" stroke="#ef4444" strokeWidth="3" />
            <circle cx="165" cy="190" r="40" fill="none" stroke="#eab308" strokeWidth="3" />
            <circle cx="235" cy="190" r="40" fill="none" stroke="#22c55e" strokeWidth="3" />
          </g>

          {/* Left Claw */}
          <g style={{ animation: 'clawLeft 3s ease-in-out infinite' }}>
            <path
              d="M 80 200 Q 60 150 100 120 Q 130 100 150 140 L 140 160 Q 120 140 100 160 Q 80 180 90 200 Z"
              fill="#ff5c35"
              stroke="#ff5c35"
              strokeWidth="2"
            />
            <path
              d="M 90 200 Q 70 180 85 160 Q 100 145 120 155"
              fill="none"
              stroke="#ff7c5c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="85" cy="165" r="3" fill="#fff" opacity="0.5" />
          </g>

          {/* Right Claw */}
          <g style={{ animation: 'clawRight 3s ease-in-out infinite' }}>
            <path
              d="M 320 200 Q 340 150 300 120 Q 270 100 250 140 L 260 160 Q 280 140 300 160 Q 320 180 310 200 Z"
              fill="#ff5c35"
              stroke="#ff5c35"
              strokeWidth="2"
            />
            <path
              d="M 310 200 Q 330 180 315 160 Q 300 145 280 155"
              fill="none"
              stroke="#ff7c5c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="315" cy="165" r="3" fill="#fff" opacity="0.5" />
          </g>

          {/* Trophy in Center */}
          <g style={{ animation: 'trophyFloat 2s ease-in-out infinite' }}>
            {/* Trophy Cup */}
            <path
              d="M 185 140 L 185 120 Q 185 110 200 110 Q 215 110 215 120 L 215 140 Q 215 155 200 160 Q 185 155 185 140 Z"
              fill="#eab308"
              stroke="#ca8a04"
              strokeWidth="2"
            />
            <rect x="195" y="160" width="10" height="15" fill="#eab308" stroke="#ca8a04" strokeWidth="2" />
            <rect x="185" y="175" width="30" height="5" fill="#eab308" stroke="#ca8a04" strokeWidth="2" rx="2" />
            
            {/* Trophy Handles */}
            <path
              d="M 185 130 Q 175 130 175 140 Q 175 150 185 145"
              fill="none"
              stroke="#eab308"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 215 130 Q 225 130 225 140 Q 225 150 215 145"
              fill="none"
              stroke="#eab308"
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Sparkles */}
            <g style={{ animation: 'sparkle 1.5s ease-in-out infinite' }}>
              <path d="M 200 100 L 202 105 L 207 105 L 203 108 L 205 113 L 200 110 L 195 113 L 197 108 L 193 105 L 198 105 Z" fill="#fff" />
            </g>
          </g>

          {/* AI Agents Orbiting */}
          <g style={{ animation: 'orbit 8s linear infinite' }}>
            <circle cx="200" cy="80" r="8" fill="#3b82f6" />
            <text x="200" y="84" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">A</text>
          </g>
          
          <g style={{ animation: 'orbitReverse 10s linear infinite' }}>
            <circle cx="320" cy="200" r="8" fill="#22c55e" />
            <text x="320" y="204" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">B</text>
          </g>
          
          <g style={{ animation: 'orbit 12s linear infinite' }}>
            <circle cx="200" cy="320" r="8" fill="#ef4444" />
            <text x="200" y="324" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">C</text>
          </g>
          
          <g style={{ animation: 'orbitReverse 6s linear infinite' }}>
            <circle cx="80" cy="200" r="8" fill="#eab308" />
            <text x="80" y="204" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">D</text>
          </g>

          {/* VS Text */}
          <text
            x="200"
            y="280"
            textAnchor="middle"
            fill="#ff5c35"
            fontSize="24"
            fontWeight="bold"
            style={{ animation: 'pulseText 2s ease-in-out infinite' }}
          >
            VS
          </text>
        </svg>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: ['#ff5c35', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'][i],
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animation: `float ${3 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes clawLeft {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(10px) rotate(-5deg); }
        }
        
        @keyframes clawRight {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          50% { transform: translateX(-10px) rotate(5deg); }
        }
        
        @keyframes trophyFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes orbit {
          from { transform: rotate(0deg) translateX(120px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(120px) rotate(-360deg); }
        }
        
        @keyframes orbitReverse {
          from { transform: rotate(360deg) translateX(100px) rotate(-360deg); }
          to { transform: rotate(0deg) translateX(100px) rotate(0deg); }
        }
        
        @keyframes pulseText {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}
