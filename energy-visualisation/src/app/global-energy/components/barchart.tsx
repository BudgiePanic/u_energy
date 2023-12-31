"use client";

import React, { useRef, useEffect, useState, useContext } from 'react';
import * as d3 from 'd3';
import { EnergyProductionData } from '@/app/country/interfaces';
import * as d3Tip from "d3-tip";
import Tooltip from '@mui/material/Tooltip';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { transition } from 'd3';
import { ThemeContext } from '@/app/contexts/theme-context';

interface BarChartProps {
  countryData: {
    [country: string]: EnergyProductionData[];
  };
  countryRange: [number, number];
  year: number;
  setCountryCount: React.Dispatch<React.SetStateAction<number>>;
}

const BarChart: React.FC<BarChartProps> = ({ countryData, countryRange, year, setCountryCount }) => {
  const ref = useRef<SVGSVGElement | null>(null);

  const countries = Object.keys(countryData);
  const excludedCountries = ["IEA Total", "OECD Americas", "OECD Europe", "OECD Asia Oceania"];
  const filteredCountries = countries.filter((country) => !excludedCountries.includes(country));
  const [tooltipData, setTooltipData] = useState<{ id: string; amount: number; } | null>(null);
  const { push } = useRouter();
  const { theme } = useContext(ThemeContext);

  let colourMap: { [country: string]: string } = {};
  filteredCountries.forEach((country, i) => {
    const hue = Math.round((i / countries.length) * 360);
    colourMap[country] = `hsl(${hue}, 100%, 50%)`;
  });

  let totals = filteredCountries.map((country) => {
    const countryYearData = countryData[country].find((data) => data.year == year);
    let totalWatts = 0;
    if (countryYearData) {
      totalWatts = countryYearData.production.reduce((total, source) => total + Number(source.watts), 0);
    }
    return { amount: totalWatts, id: country };
  }).filter((total) => total.amount !== 0);
  
  setCountryCount(totals.length);
  totals.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);
  totals = totals.slice(countryRange[0], countryRange[1]);

  const maxYValue = Math.max(...totals.map((d: { amount: any }) => d.amount));
  const yScale = d3.scaleLinear().domain([0, maxYValue]).range([160, 0]);
  const xScale = d3.scaleBand<string>()
    .domain(totals.map((d: { id: any }) => d.id))
    .range([0, (countryRange[1] - countryRange[0]) * 50])
    .padding(0.2);

    useEffect(() => {
      if (!ref.current) return;
      const svg = d3.select(ref.current);
      
      // Remove old Y-axis and X-axis
      svg.select('.y-axis').remove();
      svg.select('.x-axis').remove();
      svg.selectAll('text').remove();
    
      // Create axes
      const yAxis = d3.axisLeft(yScale);
      const xAxis = d3.axisBottom(xScale);
    
      // Y-axis
      svg.append('g')
        .attr('class', 'y-axis')
        .attr('transform', 'translate(60, 20)')
        .call(yAxis);
    
      // X-axis
      const xAxisG = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(60, ${yScale(0) + 20})`)
        .call(xAxis);

        const textColor = theme === "dark" ? "white" : "black";

        svg.append("text")             
        .attr("transform",
              "translate(" + (25) + " ," + 
                             (200) + ")")
        .style("text-anchor", "middle")
        .text(year)
        .attr("font-size", "12px")
        .attr("fill", textColor);
        
      svg.append("text")
        .attr("y", -10)
        .attr("x", 100)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("Total Watts Produced (GWh)")
        .attr("font-size", "12px")
        .attr("fill", textColor);
    
      xAxisG
        .selectAll(".tick")
        .data(totals, (total: any) => total.id)
        .transition().duration(750)
        .attr("transform", (d: { id: any }) => `translate(${xScale(d.id)},0)`);
    
      xAxisG.selectAll("text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end");

      // Select bars
      const bars = svg.select('g').selectAll('.bar')
        .data(totals, (total: any) => total.id);
      
      // Enter selection
      bars.enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', (total) => xScale(total.id)!)
        .attr('y', yScale(0))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', (total) => colourMap[total.id])
        .attr('fill-opacity', 0.5)
        .attr('stroke', (total) => colourMap[total.id])
        .on('mouseover', function (event, total) {
          d3.select(this).attr('fill-opacity', 0.7);
          d3.select(this).attr('cursor', 'pointer');
          setTooltipData(total);
        })
        .on('mouseout', function (event, total) {
          d3.select(this).attr('fill-opacity', 0.5);
          setTooltipData(null);
        })
        .on('click', function (event, total) {
          event.stopPropagation();
          push(`/country/${total.id}?initYear=${year}`);
        })
        .transition()
        .duration(750)
        .attr('y', (total) => yScale(total.amount))
        .attr('height', (total) => 160 - yScale(total.amount));

      // Update selection
      bars
        .transition()
        .duration(750)
        .attr('x', (total) => xScale(total.id)!)
        .attr('y', (total) => yScale(total.amount))
        .attr('width', xScale.bandwidth())
        .attr('height', (total) => 160 - yScale(total.amount));

      // Exit selection
      bars.exit()
        .transition()
        .duration(750)
        .attr('y', yScale(0))
        .attr('height', 0)
        .remove();

    }, [ref, yScale, xScale, totals, colourMap]);

  return (
    <Tooltip 
      open={!!tooltipData}
      title={
        <Box>
          {tooltipData && <Typography>Country: {tooltipData.id}</Typography>}
          {tooltipData && <Typography>Total Energy Produced: {tooltipData.amount} GWh</Typography>}
        </Box>
      }
      placement="left"
    >
      <svg ref={ref} className="w-3/4 h-3/4 overflow-visible" viewBox={`0 0 ${(countryRange[1] - countryRange[0]) * 50 + 80} 200`}>
        <g transform="translate(60, 20)">
          {/* X-axis */}
          <line x1="0" y1="160" x2={(countryRange[1] - countryRange[0]) * 50} y2="160" stroke="black" />
        </g>
      </svg>
    </Tooltip>
  );
};

export default BarChart;
