import React, { useEffect, useState } from 'react';
// @ts-ignore
import RangeSlider from 'react-range-slider-input';
import './styles.css';
import 'react-range-slider-input/dist/style.css';


interface CountryRangeProps {
  countryCount: number;
  onCountryRangeChange: (range: [number, number]) => void;
}

export default function CountryRange({ countryCount, onCountryRangeChange }: CountryRangeProps) {
  const [start, setStart] = useState<number>(1);
  const [end, setEnd] = useState<number>(10);

  const handleChange = (values: [number, number]) => {
    const valuesDiff = values[1] - values[0];
    const [newStart, newEnd] = values;

    if (valuesDiff >= 1) {
      onCountryRangeChange(values);
      setStart(newStart);
      setEnd(newEnd);
    }
  };

  useEffect(() => {
    setStart(1);
    setEnd(10);
  }, [countryCount]);

  return (
    <>
      <RangeSlider id="range-slider" min={1} max={countryCount} step={1} value={[start, end]} onInput={handleChange} className="margin-lg"></RangeSlider>
    </>
  );
}
