import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  perPage: z.coerce.number().int().min(1).max(100).optional().default(15),
  sort: z.string().optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(100).optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export function buildMeta(page: number, perPage: number, total: number) {
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };
}

export function buildSkip(page: number, perPage: number) {
  return (page - 1) * perPage;
}

export function buildSort(sort: string, order: 'asc' | 'desc') {
  return { [sort]: order };
}
