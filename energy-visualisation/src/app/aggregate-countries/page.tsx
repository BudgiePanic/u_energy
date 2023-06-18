"use client";
import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import BarChart from './components/barchart';
import Timeline from './components/timeline';
import { EnergyProductionData } from '../country/interfaces';
import { loadCSVData } from '../country/utils';
import { createCountryData } from '../country/utils';
import CountryRange from './components/country-range';

const productionMethods: string[] = ["Hydro", "Nuclear", "Solar", "Wind", "Other renewables", "Natural gas", "Coal", "Oil"];
const productionColors: string[] = ["#1F77B4", "#FEF502", "#F4BF3A", "#D1F1F9", "#79E381", "#DE2A2A", "#000000", "#6A4848"];

interface Country {
  country: string;
  amount: number;
  id: string;
}

const SimilarCountriesPage = () => {
  const [countryData, setCountryData] = useState<{
    [country: string]: EnergyProductionData[];
  }>({});
  const [countryCount, setCountryCount] = useState<number>(10);
  const [years, setYears] = useState<number[]>([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2020, 2021, 2022]);
  const [selectedYear, setSelectedYear] = useState<number>(2020);
  const [countryList, setCountryList] = useState<string[]>([]);


  const handleYearChange = (year: number) => {
      setSelectedYear(year);
    };

  const handleCountryCountChange = (count: number) => {
      setCountryCount(count);
  };

    useEffect(() => {
    loadCSVData("/data/data.csv")
      .then((data: any[]) => {
        const transformedData = createCountryData(data);
        setCountryData(transformedData);

        // Extract unique country values from the CSV data
        const uniqueCountries = Array.from(
          new Set(data.map((row: { COUNTRY: any; }) => row.COUNTRY))
        );
        setCountryList(uniqueCountries);
      })
      .catch((error: any) => {
        console.error("Failed to load country data", error);
      });
  }, []);

  const maxYValue = Math.max(...countryTotals.slice(0, countryCount).map(d => d.amount));
  const yScale = d3.scaleLinear().domain([0, maxYValue]).range([160, 0]);
  const xScale = d3.scaleBand<string>()
  .domain(countryTotals.slice(0, countryCount).map(d => d.country))
  .range([0, countryCount * 50])
  .padding(0.2);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);

    const yAxis = d3.axisLeft(yScale);
    svg.append('g')
      .attr('transform', 'translate(60, 20)')
      .call(yAxis);
  }, [ref, yScale]);

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="flex-grow flex flex-col justify-center items-center">
    <CountryRange countryCount={countryList.length} onCountryRangeChange={handleCountryRangeChange} />
    <BarChart
      countryData={countryData}
      countryRange={countryRange}
      year={selectedYear}
      setSelectedCountry={() => { }}
    />
  </div>
      <Timeline
        years={years}
        onYearChange={handleYearChange}
      />
    </div>
  );
};

export default SimilarCountriesPage;
