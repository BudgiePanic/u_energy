"use client";

import React, { useRef, useEffect, useState, useContext } from 'react';
import * as d3 from 'd3';
import Tooltip from '@mui/material/Tooltip';
import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { RenewableDataContainer } from '../interfaces';
import { ThemeContext } from "../../contexts/theme-context";

interface SustainabilityBarChartProps {
  sustainabilityData: {
    [country: string]: RenewableDataContainer[];
  };
  countryRange: [number, number];
  year: number;
  setCountryCount: React.Dispatch<React.SetStateAction<number>>;
}

const SustainabilityBarChart: React.FC<SustainabilityBarChartProps> = ({
  sustainabilityData,
  countryRange,
  year,
  setCountryCount,
}) => {
  const ref = useRef<SVGSVGElement | null>(null);
  const [tooltipData, setTooltipData] = useState<{
    id: string;
    renewable: number;
    nonRenewable: number;
  } | null>(null);
  const { push } = useRouter();
  const { theme } = useContext(ThemeContext);

  let percentages = Object.keys(sustainabilityData).map((country) => {
    const countryYearData = sustainabilityData[country].find((data) => data.year == year);
    let renewablePercentage = 0;
    let nonRenewablePercentage = 0;
    if (countryYearData) {
      const totalEnergy = countryYearData.renewableTWh + countryYearData.nonRenewableTWh;
      renewablePercentage = (countryYearData.renewableTWh / totalEnergy) * 100;
      nonRenewablePercentage = (countryYearData.nonRenewableTWh / totalEnergy) * 100;
    }
    return { renewablePercentage, nonRenewablePercentage, id: country };
  });

  setCountryCount(percentages.length);
  percentages.sort((a: { renewablePercentage: number }, b: { renewablePercentage: number }) => b.renewablePercentage - a.renewablePercentage);
  // percentages = percentages.slice(countryRange[0], countryRange[1]);

  useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);

    // Remove old Y-axis and X-axis
    svg.select('.y-axis').remove();
    svg.select('.x-axis').remove();
    svg.selectAll('text').remove();

    // Create axes
    const yScale = d3.scaleLinear().range([160, 0]);
    const xScale = d3.scaleBand<string>().range([0, (countryRange[1] - countryRange[0]) * 50]).padding(0.2);

    // Y-axis
    svg.append('g').attr('class', 'y-axis').attr('transform', 'translate(60, 20)');

    // X-axis
    svg.append('g').attr('class', 'x-axis').attr('transform', `translate(60, ${yScale(0) + 20})`);

    const updateAxes = () => {
      const yAxis = d3.axisLeft(yScale);
      const xAxis = d3.axisBottom(xScale);

      // @ts-ignore
      svg.select('.y-axis').call(yAxis);
      // @ts-ignore
      svg.select('.x-axis').call(xAxis);

      svg.select('.x-axis')
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');
    };

    
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
    .text("Renewable Energy (%)")
    .attr("font-size", "12px")
    .attr("fill", textColor);

    // Slicing the data based on the range
    const data = percentages.slice(countryRange[0], countryRange[1]).map((d) => ({
      id: d.id,
      renewable: d.renewablePercentage,
      nonRenewable: d.nonRenewablePercentage,
    }));

    yScale.domain([0, 100]);
    xScale.domain(data.map((d) => d.id));

    updateAxes();

    // Select split bars
    // @ts-ignore
    const bars = svg.select('g').selectAll('.bar-group').data(data, d => d.id);

    // Enter selection
    const enterBars = bars.enter().append('g').attr('class', 'bar-group');

    enterBars
      .append('rect')
      .attr('class', 'bar renewable')
      .attr('x', (d) => xScale(d.id)!)
      .attr('y', (d) => yScale(d.renewable))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => yScale(0) - yScale(d.renewable))
      .attr('fill', 'green')
      .attr('fill-opacity', 0.5)
      .attr('stroke', 'green')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.7);
        d3.select(this).attr('cursor', 'pointer');
        setTooltipData({ id: d.id, renewable: d.renewable, nonRenewable: d.nonRenewable });
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.5);
        setTooltipData(null);
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        push(`/country/${d.id}?initYear=${year}`);
      });

    enterBars
      .append('rect')
      .attr('class', 'bar non-renewable')
      .attr('x', (d) => xScale(d.id)!)
      .attr('y', (d) => yScale(d.renewable + d.nonRenewable))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => yScale(0) - yScale(d.nonRenewable))
      .attr('fill', 'red')
      .attr('fill-opacity', 0.5)
      .attr('stroke', 'red')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.7);
        d3.select(this).attr('cursor', 'pointer');
        setTooltipData({ id: d.id, renewable: d.renewable, nonRenewable: d.nonRenewable });
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('fill-opacity', 0.5);
        setTooltipData(null);
      })
      .on('click', function (event, d) {
        event.stopPropagation();
        push(`/country/${d.id}?initYear=${year}`);
      });

    // Update selection
    bars
      .selectAll('rect.renewable')
      .data((d) => [d])
      .attr('x', (d) => xScale(d.id)!)
      .attr('y', (d) => yScale(d.renewable))
      .attr('height', (d) => yScale(0) - yScale(d.renewable));

    bars
      .selectAll('rect.non-renewable')
      .data((d) => [d])
      .attr('x', (d) => xScale(d.id)!)
      .attr('y', (d) => yScale(d.renewable + d.nonRenewable))
      .attr('height', (d) => yScale(0) - yScale(d.nonRenewable));

    // Exit selection
    bars.exit().remove();
  }, [ref, sustainabilityData, countryRange, year, push, theme]);

  
  

  return (
    <Tooltip
      open={!!tooltipData}
      title={
        <Box>
          {tooltipData && <Typography>Country: {tooltipData.id}</Typography>}
          {tooltipData && (
            <>
              <Typography>Renewable Energy: {tooltipData.renewable.toFixed(2)}%</Typography>
              <Typography>Non-Renewable Energy: {tooltipData.nonRenewable.toFixed(2)}%</Typography>
            </>
          )}
        </Box>
      }
      placement="left"
    >
      <svg
        ref={ref}
        className="w-3/4 h-3/4 overflow-visible"
        viewBox={`0 0 ${(countryRange[1] - countryRange[0]) * 50 + 80} 200`}
      >
        <g transform="translate(60, 20)">
          {/* X-axis */}
          <line x1="0" y1="160" x2={(countryRange[1] - countryRange[0]) * 50} y2="160" stroke="black" />
        </g>
      </svg>
    </Tooltip>
  );
};

export default SustainabilityBarChart;
