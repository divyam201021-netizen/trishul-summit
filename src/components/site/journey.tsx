import { Reveal } from './reveal'

export interface JourneyStep {
  index: string
  title: string
  body: React.ReactNode
}

/** The journey from discovery to participation, with connectors that survive
 *  reflow into a single mobile column. */
export function Journey({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="relative grid gap-8 lg:grid-cols-5 lg:gap-6">
      <span
        aria-hidden="true"
        className="absolute top-5 right-4 left-4 hidden h-px bg-gradient-to-r from-ink-200 via-ink-300 to-ink-200 lg:block"
      />
      {steps.map((step, index) => (
        <Reveal as="li" key={step.index} delay={index * 70} className="relative">
          <div className="flex items-start gap-4 lg:flex-col lg:gap-5">
            <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-ink-300 bg-paper font-mono text-xs tabular-nums text-ink-800">
              {step.index}
            </span>
            <div className="space-y-2">
              <h3 className="font-display text-lg text-ink-900">{step.title}</h3>
              <div className="text-sm leading-relaxed text-ink-600">{step.body}</div>
            </div>
          </div>
          {index < steps.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-10 left-5 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-ink-200 to-transparent lg:hidden"
            />
          ) : null}
        </Reveal>
      ))}
    </ol>
  )
}
