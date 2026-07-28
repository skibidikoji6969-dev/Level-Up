import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: 'blue' | 'purple' | 'green' | 'none';
  delay?: number;
  as?: 'div';
}

const glowClass: Record<string, string> = {
  blue: 'hover:shadow-glow-blue hover:border-electric/30',
  purple: 'hover:shadow-glow-purple hover:border-violet/30',
  green: 'hover:shadow-glow-green hover:border-neon/30',
  none: '',
};

export default function GlassCard({ children, className = '', glow = 'none', delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`glass-card p-5 ${glowClass[glow]} ${className}`}
    >
      {children}
    </motion.div>
  );
}
