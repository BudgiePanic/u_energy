import React, { useState, useEffect, useRef } from "react";
import Slider from "@mui/material/Slider";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";

interface TimelineProps {
  years: number[];
  onYearChange: (year: number) => void;
  rangeChanged: boolean; // new prop
  setRangeChanged: (changed: boolean) => void; // new prop
}

export default function Timeline({ years, onYearChange, rangeChanged, setRangeChanged }: TimelineProps) {
  const [value, setValue] = useState<number>(years[years.length - 1]);
  const [index, setIndex] = useState<number>(years.length - 1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") {
      setValue(newValue);
      onYearChange(newValue);
      const closestYear = years.reduce((prev, curr) =>
        Math.abs(curr - newValue) < Math.abs(prev - newValue)
          ? curr
          : prev
      );
      const newIndex = years.findIndex((d) => d === closestYear);
      if (newIndex !== -1) {
        setIndex(newIndex);
      }
      if (isPlaying) {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }
  };

  const handlePlay = () => {
    if (rangeChanged) {
      setRangeChanged(false); // Reset the flag to false after handling it
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      setIsPlaying(!isPlaying);
      if (!isPlaying) {
        intervalRef.current = setInterval(() => {
          setIndex((prevIndex) => {
            const nextIndex = prevIndex >= years.length - 1 ? 0 : prevIndex + 1;
            return nextIndex;
          });
        }, 1000);
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
    }
  };

  useEffect(() => {
    if (rangeChanged) {
      setRangeChanged(false); // Reset the flag to false after handling it
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [rangeChanged, setRangeChanged]); // add rangeChanged to the dependency array

  useEffect(() => {
    onYearChange(years[index]);
    setValue(years[index]);
  }, [index, onYearChange, years]);

  const totalYears = years[years.length - 1] - years[0];

  return (
    <div className="mt-8 w-full relative">
      <button onClick={handlePlay}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </button>
      <Slider
        value={value}
        onChange={handleChange}
        min={parseInt(years[0].toString())}
        max={parseInt(years[years.length - 1].toString())}
        sx={{
          "& .MuiSlider-thumb": {
            transition: "left 0.3s ease-in-out",
            "&:not(.MuiSlider-active)": {
              transition: "width 0.3s ease-in-out",
            },
          },
        }}
      />
      <div className="flex justify-between text-xs w-full">
        {years.map((year, i) => (
          <button
            className={`hover: ${
              year === value ? "text-blue-500" : ""
            }`}
            onClick={() => {
              setIndex(i);
              setValue(year);
              onYearChange(year);
            }}
            key={year}
            style={{
              position: "absolute",
              left: `${((year - years[0]) / totalYears) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
