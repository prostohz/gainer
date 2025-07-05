import express, { Request, Response } from 'express';

import {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  getTagByCode,
} from '../services/tagService';
import { asyncHandler, sendResponse, validateParams } from '../utils/apiHandler';

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tags = await getAllTags();
    sendResponse(res, tags);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const tag = await getTagById(id);

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    sendResponse(res, tag);
  }),
);

router.post(
  '/',
  validateParams(['code', 'description']),
  asyncHandler(async (req: Request, res: Response) => {
    const { code, description } = req.body;

    // Проверяем, что тег с таким кодом не существует
    const existingTag = await getTagByCode(code);
    if (existingTag) {
      res.status(400).json({ error: 'Tag with this code already exists' });
      return;
    }

    const tag = await createTag({ code, description });
    sendResponse(res, tag);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { code, description } = req.body;

    // Если обновляется код, проверяем уникальность
    if (code) {
      const existingTag = await getTagByCode(code);
      if (existingTag && existingTag.id !== id) {
        res.status(400).json({ error: 'Tag with this code already exists' });
        return;
      }
    }

    const tag = await updateTag(id, { code, description });

    if (!tag) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    sendResponse(res, tag);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const deleted = await deleteTag(id);

    if (!deleted) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    sendResponse(res, { message: 'Tag deleted successfully' });
  }),
);

export default router;
