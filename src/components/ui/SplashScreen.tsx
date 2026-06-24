import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Elegant, smooth progress bar simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        // Slightly random steps to make it feel natural and responsive
        const step = Math.floor(Math.random() * 12) + 6;
        return Math.min(100, prev + step);
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress === 100) {
      // Small pause at 100% for satisfying visual completion before exit
      const timeout = setTimeout(() => {
        setShow(false);
      }, 350);

      return () => clearTimeout(timeout);
    }
  }, [progress]);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 bg-[#0A0F1E] flex flex-col items-center justify-center z-[9999] select-none"
        >
          {/* Ambient glowing orb in the background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-accent/10 rounded-full blur-[80px] pointer-events-none animate-pulse" />

          <div className="flex flex-col items-center max-w-xs text-center z-10 space-y-8">
            {/* Animated Pulsing Concentric Logo */}
            <div className="relative flex items-center justify-center w-24 h-24">
              {/* Outer wave */}
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.15, 0.4, 0.15],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute inset-0 rounded-full border border-accent/30"
              />
              {/* Middle wave */}
              <motion.div
                animate={{
                  scale: [1, 1.25, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  delay: 0.3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute w-16 h-16 rounded-full border border-accent/40 bg-accent/5"
              />
              {/* Inner core */}
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(0,212,170,0.6)]">
                <Sparkles className="h-5 w-5 text-[#0A0F1E] font-bold" />
              </div>
            </div>

            {/* Title / Tagline */}
            <div className="space-y-2">
              <motion.h1
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="font-syne text-3xl font-extrabold tracking-tight text-white flex items-center gap-1 justify-center"
              >
                PULSR
              </motion.h1>
              <motion.p
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-[10px] uppercase font-mono tracking-widest text-[#00D4AA] font-bold"
              >
                Amplify your social presence
              </motion.p>
            </div>

            {/* High Performance Progress Bar System */}
            <div className="w-full space-y-2 pt-4">
              <div className="h-1 w-full bg-surface/80 rounded-full overflow-hidden border border-border-accent/10">
                <motion.div
                  className="h-full bg-gradient-to-r from-accent to-bright"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'easeOut', duration: 0.1 }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] font-mono text-muted uppercase">
                <span>Initializing System</span>
                <span>{progress}%</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
