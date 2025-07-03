import React, { forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { enUS } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import classNames from 'classnames';

// Регистрируем русскую локаль
registerLocale('en', enUS);

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

export interface CalendarProps {
  /** Выбранная дата или диапазон дат */
  value?: Date | DateRange | null;
  /** Коллбэк при изменении даты */
  onChange: (date: Date | DateRange | null) => void;
  /** Режим выбора диапазона */
  selectsRange?: boolean;
  /** Показывать выбор времени */
  showTimeSelect?: boolean;
  /** Формат времени */
  timeFormat?: string;
  /** Интервал времени в минутах */
  timeIntervals?: number;
  /** Формат даты */
  dateFormat?: string;
  /** Плейсхолдер */
  placeholder?: string;
  /** Отключить ввод */
  disabled?: boolean;
  /** Минимальная дата */
  minDate?: Date;
  /** Максимальная дата */
  maxDate?: Date;
  /** Дополнительные CSS классы */
  className?: string;
  /** Инлайн календарь (всегда открыт) */
  inline?: boolean;
  /** Показывать кнопки "Сегодня", "Очистить" */
  todayButton?: string;
  /** Показывать номера недель */
  showWeekNumbers?: boolean;
  /** Исключенные даты */
  excludeDates?: Date[];
  /** Включенные даты (только эти даты доступны) */
  includeDates?: Date[];
  /** Исключенные временные интервалы */
  excludeTimes?: Date[];
}

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder, disabled, className }, ref) => (
    <input
      ref={ref}
      value={value}
      onClick={onClick}
      placeholder={placeholder}
      readOnly
      disabled={disabled}
      className={classNames(
        'input input-bordered w-full',
        {
          'input-disabled': disabled,
        },
        className,
      )}
    />
  ),
);

CustomInput.displayName = 'CustomInput';

export const Calendar: React.FC<CalendarProps> = ({
  value,
  onChange,
  selectsRange = false,
  showTimeSelect = false,
  timeFormat = 'HH:mm',
  timeIntervals = 15,
  dateFormat,
  placeholder = 'Выберите дату',
  disabled = false,
  minDate,
  maxDate,
  className,
  inline = false,
  todayButton,
  showWeekNumbers = false,
  excludeDates,
  includeDates,
  excludeTimes,
}) => {
  const finalDateFormat =
    dateFormat || selectsRange
      ? showTimeSelect
        ? 'dd.MM.yyyy HH:mm'
        : 'dd.MM.yyyy'
      : showTimeSelect
        ? 'dd.MM.yyyy HH:mm'
        : 'dd.MM.yyyy';

  const commonProps = {
    showTimeSelect,
    timeFormat,
    timeIntervals,
    dateFormat: finalDateFormat,
    placeholderText: placeholder,
    disabled,
    minDate,
    maxDate,
    locale: 'en' as const,
    inline,
    todayButton,
    showWeekNumbers,
    excludeDates,
    includeDates,
    excludeTimes,
    customInput: !inline ? <CustomInput className={className} /> : undefined,
    className: inline ? 'w-full' : undefined,
    calendarClassName: 'shadow-lg border border-base-300 rounded-lg bg-base-100',
    dayClassName: () => classNames('hover:bg-primary hover:text-primary-content rounded'),
  };

  if (selectsRange) {
    const rangeValue = value as DateRange;

    return (
      <div className={classNames('w-full', className)}>
        <DatePicker
          selected={rangeValue?.startDate}
          onChange={(dates) => {
            const [start, end] = dates as [Date | null, Date | null];
            onChange({ startDate: start, endDate: end });
          }}
          startDate={rangeValue?.startDate}
          endDate={rangeValue?.endDate}
          selectsRange
          {...commonProps}
        />
      </div>
    );
  }

  return (
    <div className={classNames('w-full', className)}>
      <DatePicker selected={value as Date} onChange={(date) => onChange(date)} {...commonProps} />
    </div>
  );
};

export const DateTimePicker: React.FC<Omit<CalendarProps, 'showTimeSelect'>> = (props) => (
  <Calendar {...props} showTimeSelect={true} />
);

export const DateRangePicker: React.FC<Omit<CalendarProps, 'selectsRange'>> = (props) => (
  <Calendar {...props} selectsRange={true} />
);

export const DateTimeRangePicker: React.FC<
  Omit<CalendarProps, 'selectsRange' | 'showTimeSelect'>
> = (props) => <Calendar {...props} selectsRange={true} showTimeSelect={true} />;
