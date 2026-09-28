import { CircleAlert } from 'lucide-react'
import { CONFIG_GROUPS, type ConfigField, type ConfigGroup } from '@/lib/config/registry'
import type { EventConfig } from '@/lib/config'
import { saveEventSettings } from '@/lib/admin/actions'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/primitives'
import { Field, Input, NativeSelect, Textarea } from '@/components/ui/form'
import { ActionForm } from '@/components/ui/action-form'
import { Tbd } from '@/components/ui/placeholder'

/**
 * Registry-driven settings editor.
 *
 * Every field is generated from `src/lib/config/registry.ts`, so adding a new
 * event fact requires one entry there and nothing else — no new page, no new
 * form, no redesign. A field with a `ph` label is unknown by default and shows
 * its `[LABEL — TBD]` placeholder right here in the editor, so an organizer can
 * see exactly what participants currently see.
 *
 * List fields post to `<path>.__list` (newline separated) and booleans to
 * `<path>.__boolean`, which is the contract `saveEventSettings` expects.
 */
export function SettingsEditor({
  config,
  groupKeys,
  title,
  description,
}: {
  config: EventConfig
  groupKeys: string[]
  title?: string
  description?: string
}) {
  const groups = CONFIG_GROUPS.filter((group) => groupKeys.includes(group.key))
  const setCount = groups
    .flatMap((group) => group.fields)
    .filter((field) => config.isSet(field.path)).length
  const totalCount = groups.flatMap((group) => group.fields).length

  return (
    <div className="space-y-6">
      {title ? (
        <div className="rounded-lg border border-ink-200 bg-paper p-4">
          <p className="eyebrow meta">{title}</p>
          {description ? <p className="mt-2 text-sm leading-relaxed text-ink-600">{description}</p> : null}
          <p className="mt-3 text-xs meta">
            {setCount} of {totalCount} fields configured. Values left empty publish as{' '}
            <span className="font-mono">[LABEL — TBD]</span> on every public page — which is the honest default.
          </p>
        </div>
      ) : null}

      <ActionForm
        action={saveEventSettings}
        submitLabel="Save all settings"
        submitVariant="brand"
        className="space-y-6"
      >
        {groups.map((group) => (
          <Section key={group.key} group={group} config={config} />
        ))}
      </ActionForm>
    </div>
  )
}

function Section({ group, config }: { group: ConfigGroup; config: EventConfig }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{group.title}</CardTitle>
        <p className="text-sm leading-relaxed text-ink-600">{group.description}</p>
      </CardHeader>
      <CardBody className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {group.fields.map((field) => (
          <SettingField key={field.path} field={field} config={config} />
        ))}
      </CardBody>
    </Card>
  )
}

function SettingField({ field, config }: { field: ConfigField; config: EventConfig }) {
  const raw = config.value(field.path)
  const isSet = config.isSet(field.path)
  const wide = field.type === 'textarea' || field.type === 'longtext' || field.type === 'list'
  const placeholderLabel = config.tbd(field.path)

  const hint = (
    <>
      {field.help ? <span className="block">{field.help}</span> : null}
      <span className="mt-1 block">
        Current public value:{' '}
        {isSet ? (
          <span className="font-medium text-ink-700">{displayValue(raw)}</span>
        ) : (
          <Tbd label={placeholderLabel.replace(/^\[/, '').replace(/ — TBD\]$/, '')} />
        )}
      </span>
    </>
  )

  if (field.type === 'boolean') {
    return (
      <Field label={field.label} hint={hint} className={wide ? 'md:col-span-2' : undefined}>
        <div className="flex items-center gap-3">
          {/* Unchecked checkboxes send nothing, so pair it with a hidden false. */}
          <input type="hidden" name={`cfg.${field.path}.__boolean`} value="false" />
          <input
            type="checkbox"
            id={`cfg-${field.path}`}
            name={`cfg.${field.path}.__boolean`}
            value="true"
            defaultChecked={config.bool(field.path)}
            className="size-4 rounded border-ink-400"
          />
          <label htmlFor={`cfg-${field.path}`} className="text-sm text-ink-700">
            Enabled
          </label>
        </div>
      </Field>
    )
  }

  if (field.type === 'select') {
    const value = raw === null || raw === undefined ? '' : String(raw)
    return (
      <Field label={field.label} hint={hint} className={wide ? 'md:col-span-2' : undefined}>
        <NativeSelect name={`cfg.${field.path}`} defaultValue={value}>
          <option value="">Not published yet</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  if (field.type === 'list') {
    const value = Array.isArray(raw) ? raw.join('\n') : typeof raw === 'string' ? raw : ''
    return (
      <Field
        label={field.label}
        hint={
          <>
            {field.help ? <span className="block">{field.help}</span> : null}
            <span className="mt-1 block">One entry per line. Leave empty to show the placeholder.</span>
          </>
        }
        className="md:col-span-2"
      >
        <Textarea name={`cfg.${field.path}.__list`} defaultValue={value} rows={5} />
      </Field>
    )
  }

  if (field.type === 'textarea' || field.type === 'longtext') {
    return (
      <Field label={field.label} hint={hint} className="md:col-span-2">
        <Textarea
          name={`cfg.${field.path}`}
          defaultValue={typeof raw === 'string' ? raw : ''}
          rows={field.type === 'longtext' ? 6 : 3}
        />
      </Field>
    )
  }

  const inputType =
    field.type === 'email'
      ? 'email'
      : field.type === 'url'
        ? 'url'
        : field.type === 'date'
          ? 'date'
          : field.type === 'time'
            ? 'time'
            : field.type === 'number'
              ? 'number'
              : 'text'

  if (field.type === 'color') {
    const value = typeof raw === 'string' ? raw : ''
    return (
      <Field
        label={field.label}
        hint={
          <>
            {field.help ? <span className="block">{field.help}</span> : null}
            <span className="mt-1 block">
              {value ? (
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block size-3.5 rounded-full border border-ink-300"
                    style={{ backgroundColor: value }}
                  />
                  <span className="font-mono text-xs">{value}</span>
                </span>
              ) : (
                <Tbd label="PRIMARY BRAND COLOR" />
              )}
            </span>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <Input
            name={`cfg.${field.path}`}
            defaultValue={value}
            placeholder="#3746A6"
            maxLength={7}
            className="font-mono"
          />
          <span
            aria-hidden="true"
            className="size-10 shrink-0 rounded border border-ink-300"
            style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value) ? value : 'transparent' }}
          />
        </div>
      </Field>
    )
  }

  return (
    <Field label={field.label} hint={hint} className={wide ? 'md:col-span-2' : undefined}>
      <Input
        name={`cfg.${field.path}`}
        type={inputType}
        defaultValue={raw === null || raw === undefined ? '' : String(raw)}
        step={field.type === 'number' ? 'any' : undefined}
      />
    </Field>
  )
}

function displayValue(raw: string | number | boolean | string[] | null | undefined) {
  if (raw === null || raw === undefined) return '—'
  if (Array.isArray(raw)) return raw.join(', ')
  if (typeof raw === 'boolean') return raw ? 'Yes' : 'No'
  return String(raw)
}

export function SettingsPlaceholderNotice() {
  return (
    <div className="flex gap-3 rounded-lg border border-dashed border-warning-500/50 bg-warning-50 p-4 text-sm text-warning-700">
      <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p>
        Anything you leave empty stays visible as a placeholder. The platform will never fill a gap with a plausible
        guess: a participant seeing <span className="font-mono text-xs">[EVENT DATE — TBD]</span> understands the date is
        unpublished, whereas a wrong date cannot be taken back.
      </p>
    </div>
  )
}
