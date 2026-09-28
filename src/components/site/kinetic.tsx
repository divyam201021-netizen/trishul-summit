'use client'

import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import { useInView } from './motion'

/**
 * Kinetic type: each word rises out of its own clipping mask, once, when the
 * line enters the viewport.
 *
 * This replaces the "whole block fades up" default that every template uses.
 * Words stagger at display sizes and tighten as the delay accumulates, so a
 * long headline reads as anything from a single gesture to a short typed
 * sequence. Reduced motion resolves to the finished line immediately.
 */
function Words({
  text,
  linePerWord,
  underlineLast,
  delay,
  stagger,
  wordClassName,
}: {
  text: string
  linePerWord: boolean
  underlineLast: boolean
  delay: number
  stagger: number
  wordClassName?: string
}) {
  const words = text.trim().split(/\s+/)
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {index > 0 && !linePerWord ? ' ' : null}
          <span className={cn('kinetic-mask', linePerWord && 'block')}>
            <span
              className={cn(
                'kinetic-word',
                wordClassName,
                underlineLast && index === words.length - 1 ? 'underline-brass' : undefined,
              )}
              style={{ transitionDelay: `${delay + index * stagger}ms` }}
            >
              {word}
            </span>
          </span>
        </Fragment>
      ))}
    </>
  )
}

/** Inline kinetic text — safe to drop inside an existing heading element. */
export function KineticText({
  text,
  className,
  delay = 0,
  stagger = 62,
}: {
  text: string
  className?: string
  delay?: number
  stagger?: number
}) {
  const ref = useInView<HTMLSpanElement>()
  return (
    <span ref={ref} className={cn('kinetic', className)} data-visible="false">
      <Words text={text} linePerWord={false} underlineLast={false} delay={delay} stagger={stagger} />
    </span>
  )
}

/** Full kinetic heading, one line per word where the display size demands it. */
export function KineticHeading({
  text,
  as: As = 'h2',
  className,
  delay = 0,
  stagger = 78,
  linePerWord = false,
  underlineLast = false,
  wordClassName,
}: {
  text: string
  as?: 'h1' | 'h2' | 'h3' | 'p'
  className?: string
  delay?: number
  stagger?: number
  linePerWord?: boolean
  underlineLast?: boolean
  wordClassName?: string
}) {
  const ref = useInView<HTMLHeadingElement>()
  return (
    <As ref={ref} className={cn('kinetic', className)} data-visible="false">
      <Words
        text={text}
        linePerWord={linePerWord}
        underlineLast={underlineLast}
        delay={delay}
        stagger={stagger}
        wordClassName={wordClassName}
      />
    </As>
  )
}
