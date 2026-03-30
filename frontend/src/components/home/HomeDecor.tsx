import { motion, useReducedMotion } from 'framer-motion';

/** Floating accent orbs — disabled when user prefers reduced motion */
export function HomeDecor() {
  const reduce = useReducedMotion();

  if (reduce) return null;

  return (
    <div className="home-decor" aria-hidden>
      <motion.div
        className="home-orb home-orb-a"
        animate={{ y: [0, -12, 0], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="home-orb home-orb-b"
        animate={{ y: [0, 10, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
    </div>
  );
}
