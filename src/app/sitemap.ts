import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db/client'
import { getActiveSiteUrl } from '@/lib/seo'

/**
 * Sitemap.
 *
 * Only public, indexable destinations are listed. Portal, admin, registration
 * and sign-in routes are excluded by design — and a database that has not been
 * provisioned yet must not break the build, hence the defensive reads.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getActiveSiteUrl()
  const now = new Date()

  const staticRoutes: { path: string; priority: number; changeFrequency: 'weekly' | 'monthly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'weekly' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/committees', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/schedule', priority: 0.8, changeFrequency: 'weekly' },
    { path: '/delegate-info', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/accessibility', priority: 0.5, changeFrequency: 'monthly' },
  ]

  const [committees, policies] = await Promise.all([
    prisma.committee
      .findMany({ select: { slug: true, updatedAt: true } })
      .catch(() => [] as { slug: string; updatedAt: Date }[]),
    prisma.policy
      .findMany({
        where: { published: true, slug: { not: 'marketing-updates' } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => [] as { slug: string; updatedAt: Date }[]),
  ])

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path === '/' ? '' : route.path}`,
      lastModified: now,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...committees.map((committee) => ({
      url: `${base}/committees/${committee.slug}`,
      lastModified: committee.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
    ...policies.map((policy) => ({
      url: `${base}/policies/${policy.slug}`,
      lastModified: policy.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
  ]
}
