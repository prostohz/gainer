import { MRReportTag } from '../models/MRReport';
import { TMRReportTag } from '../../shared/types';

export const getAllTags = async (): Promise<TMRReportTag[]> => {
  const tags = await MRReportTag.findAll({
    order: [['code', 'ASC']],
  });

  return tags.map((tag) => ({
    id: tag.id,
    code: tag.code,
    description: tag.description,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  }));
};

export const getTagById = async (id: number): Promise<TMRReportTag | null> => {
  const tag = await MRReportTag.findByPk(id);

  if (!tag) {
    return null;
  }

  return {
    id: tag.id,
    code: tag.code,
    description: tag.description,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
};

export const createTag = async (data: {
  code: string;
  description: string;
}): Promise<TMRReportTag> => {
  const tag = await MRReportTag.create(data);

  return {
    id: tag.id,
    code: tag.code,
    description: tag.description,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
};

export const updateTag = async (
  id: number,
  data: {
    code?: string;
    description?: string;
  },
): Promise<TMRReportTag | null> => {
  const tag = await MRReportTag.findByPk(id);

  if (!tag) {
    return null;
  }

  if (data.code !== undefined) {
    tag.code = data.code;
  }
  if (data.description !== undefined) {
    tag.description = data.description;
  }

  await tag.save();

  return {
    id: tag.id,
    code: tag.code,
    description: tag.description,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
};

export const deleteTag = async (id: number): Promise<boolean> => {
  const tag = await MRReportTag.findByPk(id);

  if (!tag) {
    return false;
  }

  await tag.destroy();
  return true;
};

export const getTagByCode = async (code: string): Promise<TMRReportTag | null> => {
  const tag = await MRReportTag.findOne({
    where: { code },
  });

  if (!tag) {
    return null;
  }

  return {
    id: tag.id,
    code: tag.code,
    description: tag.description,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
};
