import { useState } from 'react';
import dayjs from 'dayjs';

import { DateTimePicker } from '../../shared/ui/Calendar';

type BacktestPaneProps = {
  symbolA: string | null;
  symbolB: string | null;
};

export const BacktestPane = ({ symbolA, symbolB }: BacktestPaneProps) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  return (
    <div className="bg-base-200 rounded-lg p-4">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <DateTimePicker
              value={startDate}
              onChange={(date) => setStartDate(date as Date)}
              placeholder="Start time"
              timeIntervals={15}
            />
            <p className="text-sm text-gray-500 mt-1">
              Выбрано: {startDate ? startDate.toLocaleString('ru-RU') : 'Не выбрано'}
            </p>
          </div>

          <div>
            <DateTimePicker
              value={endDate}
              minDate={startDate ?? new Date()}
              onChange={(date) => {
                const selectedDate = date as Date;
                if (startDate && dayjs(selectedDate).isBefore(startDate)) {
                  setEndDate(startDate);
                } else {
                  setEndDate(selectedDate);
                }
              }}
              placeholder="End time"
              timeIntervals={15}
            />
            <p className="text-sm text-gray-500 mt-1">
              Выбрано: {endDate ? endDate.toLocaleString('ru-RU') : 'Не выбрано'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
