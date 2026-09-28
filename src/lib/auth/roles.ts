import { prisma } from '@/lib/db/client'
import { parseJson, stringifyJson } from '@/lib/db/client'
import { ROLE_PRESETS, type Permission } from './permissions'

export function parsePermissions(raw: string | null | undefined): Permission[] {
  const list = parseJson<string[]>(raw, [])
  return Array.isArray(list) ? (list.filter((item) => typeof item === 'string') as Permission[]) : []
}

/** Ensures the built-in role presets exist. Safe to call on every boot/seed. */
export async function ensureRolePresets() {
  for (const preset of ROLE_PRESETS) {
    await prisma.adminRole.upsert({
      where: { key: preset.key },
      create: {
        key: preset.key,
        name: preset.name,
        description: preset.description,
        permissions: stringifyJson(preset.permissions),
        isSystem: true,
      },
      update: { name: preset.name, description: preset.description },
    })
  }
}

export async function roleByKey(key: string) {
  return prisma.adminRole.findUnique({ where: { key } })
}
