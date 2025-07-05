import { useQuery } from '@tanstack/react-query';

import { TMRReportTag } from '../../shared/types';
import { http } from '../shared/utils/http';

export const TagSelector = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (tagId: number) => void;
}) => {
  const { data: tags } = useQuery<TMRReportTag[]>({
    queryKey: ['tags'],
    queryFn: () => http.get('/api/tag').then((res) => res.data),
  });

  return (
    <select
      className="select select-bordered"
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      <option value="">Select tag</option>
      {tags?.map((tag) => (
        <option key={tag.id} value={tag.id}>
          {tag.code}
        </option>
      ))}
    </select>
  );
};
