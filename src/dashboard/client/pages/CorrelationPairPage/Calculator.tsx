import { useState } from 'react';
import { useLSState } from '../../shared/localStorage';

const FormInput = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) => {
  return (
    <div>
      <label className="label" htmlFor={label}>
        {label}
      </label>
      <input
        type="number"
        id={label}
        className="input input-sm input-bordered"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export const Calculator = ({
  longLastPrice,
  shortLastPrice,
}: {
  longLastPrice: string;
  shortLastPrice: string;
}) => {
  const [longOpenPrice, setLongOpenPrice] = useLSState<string>('longOpenPrice', '0');
  const [longClosePrice, setLongClosePrice] = useState<string>(longLastPrice);
  const [shortOpenPrice, setShortOpenPrice] = useLSState<string>('shortOpenPrice', '0');
  const [shortClosePrice, setShortClosePrice] = useState<string>(shortLastPrice);

  const longProfit = (Number(longClosePrice) / Number(longOpenPrice) - 1) * 100;
  const shortProfit =
    ((Number(shortOpenPrice) - Number(shortClosePrice)) / Number(shortOpenPrice)) * 100;
  const commission = 0.8;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col gap-2 flex-grow">
        <FormInput label="Long Open Price" value={longOpenPrice} onChange={setLongOpenPrice} />
        <FormInput label="Long Close Price" value={longClosePrice} onChange={setLongClosePrice} />
      </div>
      <div className="flex flex-col gap-2 flex-grow">
        <FormInput label="Short Open Price" value={shortOpenPrice} onChange={setShortOpenPrice} />
        <FormInput
          label="Short Close Price"
          value={shortClosePrice}
          onChange={setShortClosePrice}
        />
      </div>
      <div className="flex flex-col gap-2 self-center flex-grow">
        <div>Long profit: {longProfit.toFixed(2)}%</div>
        <div>Short profit: {shortProfit.toFixed(2)}%</div>
        <div>Total profit: {(longProfit + shortProfit - commission).toFixed(2)}%</div>
      </div>
    </div>
  );
};
