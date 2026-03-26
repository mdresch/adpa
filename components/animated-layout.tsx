"use client"

import { motion } from "framer-motion"
import type { ReactNode } from "react"

interface AnimatedLayoutProps {
  children: ReactNode
  className?: string
}

export function AnimatedLayout({ children, className }: AnimatedLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{
        type: "tween",
        ease: "easeInOut",
        duration: 0.4,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedCard({ children, className, delay = 0 }: AnimatedLayoutProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        type: "tween",
        ease: "easeOut",
        duration: 0.4,
        delay,
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedGrid({ children, className }: AnimatedLayoutProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedGridItem({ children, className }: AnimatedLayoutProps) {
  return (
    <motion.div
      variants={{
        initial: {
          opacity: 0,
          y: 20,
        },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            type: "tween",
            ease: "easeOut",
            duration: 0.4,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
