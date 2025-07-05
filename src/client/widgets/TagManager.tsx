import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { TMRReportTag } from '../../shared/types';
import { http } from '../shared/utils/http';
import { Loader } from '../shared/ui/Loader';

type TagForm = {
  id?: number;
  code: string;
  description: string;
};

export const TagManager = () => {
  const queryClient = useQueryClient();
  const [editingTag, setEditingTag] = useState<TagForm | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTag, setNewTag] = useState<TagForm>({ code: '', description: '' });

  const { data: tags, isLoading } = useQuery<TMRReportTag[]>({
    queryKey: ['tags'],
    queryFn: () => http.get('/api/tag').then((response) => response.data),
  });

  const { mutate: createTag, isPending: isCreatePending } = useMutation({
    mutationFn: (tag: Omit<TagForm, 'id'>) => http.post('/api/tag', tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setNewTag({ code: '', description: '' });
      setIsCreating(false);
    },
  });

  const { mutate: updateTag, isPending: isUpdatePending } = useMutation({
    mutationFn: ({ id, ...data }: TagForm) => http.put(`/api/tag/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      setEditingTag(null);
    },
  });

  const { mutate: deleteTag, isPending: isDeletePending } = useMutation({
    mutationFn: (id: number) => http.delete(`/api/tag/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });

  const handleCreateTag = () => {
    if (newTag.code.trim() && newTag.description.trim()) {
      createTag(newTag);
    }
  };

  const handleUpdateTag = () => {
    if (editingTag && editingTag.code.trim() && editingTag.description.trim()) {
      updateTag(editingTag);
    }
  };

  const handleDeleteTag = (id: number) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      deleteTag(id);
    }
  };

  const startEditing = (tag: TMRReportTag) => {
    setEditingTag({
      id: tag.id,
      code: tag.code,
      description: tag.description,
    });
    setIsCreating(false);
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setIsCreating(false);
  };

  return (
    <div className="bg-base-200 rounded-lg p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">MR Report Tags</h2>
        <button
          className="btn btn-primary"
          onClick={() => setIsCreating(true)}
          disabled={isCreating || editingTag !== null}
        >
          Add Tag
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Loader />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th className="text-left text-sm">Code</th>
                <th className="text-left text-sm">Description</th>
                <th className="text-right text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isCreating && (
                <tr className="bg-base-300">
                  <td>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Tag code"
                      value={newTag.code}
                      onChange={(e) => setNewTag({ ...newTag, code: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="Tag description"
                      value={newTag.description}
                      onChange={(e) => setNewTag({ ...newTag, description: e.target.value })}
                    />
                  </td>
                  <td className="text-right">
                    <div className="flex gap-2 justify-center">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={handleCreateTag}
                        disabled={isCreatePending}
                      >
                        {isCreatePending ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={cancelEditing}
                        disabled={isCreatePending}
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {tags?.map((tag) => (
                <tr key={tag.id}>
                  <td>
                    {editingTag?.id === tag.id ? (
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={editingTag.code}
                        onChange={(e) => setEditingTag({ ...editingTag, code: e.target.value })}
                      />
                    ) : (
                      <span className="font-mono text-sm">{tag.code}</span>
                    )}
                  </td>
                  <td>
                    {editingTag?.id === tag.id ? (
                      <input
                        type="text"
                        className="input input-bordered w-full"
                        value={editingTag.description}
                        onChange={(e) =>
                          setEditingTag({ ...editingTag, description: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-sm">{tag.description}</span>
                    )}
                  </td>
                  <td className="text-center">
                    {editingTag?.id === tag.id ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          className="btn btn-sm btn-success"
                          onClick={handleUpdateTag}
                          disabled={isUpdatePending}
                        >
                          {isUpdatePending ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={cancelEditing}
                          disabled={isUpdatePending}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-end">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => startEditing(tag)}
                          disabled={editingTag !== null || isCreating}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-error"
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={isDeletePending || editingTag !== null || isCreating}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tags?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No tags found. Create your first tag!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
