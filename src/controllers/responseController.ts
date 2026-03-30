import { Request, Response as ExpressResponse } from 'express';
import { db } from '../config/firebase';
import type { Response } from '../models/Response';

const COLLECTION = 'responses';

function toISOString(field: unknown): string {
  if (field && typeof field === 'object' && 'toDate' in field) {
    return (field as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof field === 'string') {
    return field;
  }
  return '';
}

export async function getResponses(
  _req: Request,
  res: ExpressResponse
): Promise<void> {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const responses: Response[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: (data.title as string) ?? '',
        location: (data.location as string) ?? '',
        status: (data.status as Response['status']) ?? 'pending',
        priority: (data.priority as Response['priority']) ?? 'medium',
        createdAt: toISOString(data.createdAt),
        updatedAt: toISOString(data.updatedAt),
      };
    });

    res.json({ data: responses, total: responses.length });
  } catch (err) {
    console.error('Failed to fetch responses:', err);
    res.status(500).json({ error: 'Failed to fetch responses' });
  }
}
