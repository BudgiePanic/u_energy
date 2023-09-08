"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { getCode } from 'iso-3166-1-alpha-2';
import { getContinentName } from '@brixtol/country-continent';
import Tooltip from '@mui/material/Tooltip';
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { Help } from '@mui/icons-material';

const productionColorMap: Map<string, string> = new Map([
  ["Hydro", "#1F77B4"],
  ["Nuclear", "#FEF502"],
  ["Solar", "#F4BF3A"],
  ["Wind", "#D1F1F9"],
  ["Other renewables", "#79E381"],
  ["Natural gas", "#DE2A2A"],
  ["Coal", "#000000"],
  ["Oil", "#6A4848"],
]);

const allProductionMethods: string[] = ["Hydro", "Nuclear", "Solar", "Wind", "Other renewables", "Natural gas", "Coal", "Oil"];

const methods: string[] = ["Hydro", "Nuclear", "Solar", "Wind", "Other renewables", "Natural gas", "Coal", "Oil"];
// const continents: string[] = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];
const continents: string[] = ["Asia", "Europe", "North America", "Oceania", "South America"];

const continentToColorMap: Map<string, string> = new Map([
  ["Asia", "#FEF502"], // yellow
  ["Europe", "#F4BF3A"], // orange
  ["North America", "#D1F1F9"], // light blue
  ["Oceania", "#79E381"], // green
  ["South America", "#DE2A2A"], // red
]);

interface CountryNode {
  name: string;
  value: number;
  children: CountryNode[];
}

interface HoverData { // mouse hover event data structure
  name: string;
  value: number;
  method: string;
  isCountry: boolean;
  continent: string;
}

const allNodes: Map<string, Map<string, CountryNode[]>> = new Map();

export default function TreeMap(){
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState<number>(2022);
  // a number state called depth
  const [depth, setDepth] = useState<number>(0);
  const [hoveredChild, setHoveredChild] = useState<string | null>(null);

  const [hover, setHover] = useState<HoverData>(null as any); // Mouse hover event state variable
  //const [isParentView, setIsParentView] = useState(true);

  useEffect(() => {
    d3.csv("data/data.csv").then((data) => {
      console.log(data);
      const dataFromYear = data.filter((d) => d.YEAR === year.toString()).filter((d) => d.PRODUCT !== "Other renewables");

      methods.forEach((method) => {
        const methodMap: Map<string, CountryNode[]> = new Map();
        continents.forEach((continent) => {
          methodMap.set(continent, []);
        });
        allNodes.set(method, methodMap);
      });

      methods.forEach((method) => {
        const dataFromMethod = dataFromYear.filter((d) => d.PRODUCT === method);
        continents.forEach((continent) => {
          const instancesFromThisContinent: any[] = [];
          dataFromMethod.forEach((d) => {
            const countryName = String(d.COUNTRY);
            const countryCode = getCode(countryName);
            if (countryCode !== null) {
              const countryContinent = getContinentName(countryCode);
              if (countryContinent === continent) {
                instancesFromThisContinent.push(d);
              }
            }
          });
          const countries: any[] = instancesFromThisContinent
            .map((d: any) => d.COUNTRY)
            .filter((value: any, index: any, self: any) => self.indexOf(value) === index) || [];

          countries.forEach((country) => {
            const countryInstances = instancesFromThisContinent.filter((d: any) => d.COUNTRY === country);
            const energyProduced: number = countryInstances.reduce((a: number, b: any) => a + Number(b.VALUE), 0);
            const countryNode: CountryNode = {
              name: country,
              value: energyProduced,
              children: [] as CountryNode[],
            };
            const methodMap = allNodes.get(method);
            if (methodMap !== undefined) {
              const continentMap = methodMap.get(continent);
              if (continentMap !== undefined) {
                continentMap.push(countryNode);
              }
            }
          });
        });
      });

      var years: string[] = [];
      data.forEach((d) => {
        if (!years.includes(String(d.YEAR))) {
          years.push(String(d.YEAR));
        }
      });
      setYears(years);


      const hierarchyData = convertMapToGraph(allNodes);

      var width = 1300;
      var height = 800;

      const treemap = d3
        .treemap()
        .size([width, height])
        .padding(1)
        .round(true)
        .tile(d3.treemapSquarify); // we like this one :)

      /* Copy Stu code starts */

      // delete the old tree map if it exists
      d3.select("#treemap").select("*").remove();

      const zoom = d3.zoom().scaleExtent([1, 10]).translateExtent([
        [0, 0],
        [width, height],
      ]).on('zoom', (event) => {
        svg.attr('transform', event.transform);
        svg.selectAll("text").attr('font-size', (d) => isParentView ? 16 / event.transform.k + "px" : 10 / event.transform.k + "px");
      });

      var svg = d3.select("#treemap").
        append("svg").
        attr("width", width).
        attr("height", height).
        on("click", switchView).
        // @ts-ignore
        call(zoom).
        append("g");


      function sumByValue(d: any) {
        return d.value;
      }

      var isParentView = true;

      var root = d3.hierarchy(hierarchyData).sum(sumByValue);
      // @ts-ignore
      treemap(root);
      update(root.children);

      /**
       * This function just goes back and forth between root node and layer 1 nodes
       * We can probably figure something out to make it go deeper.
       * We don't know which cell you clicked in so we can't tell which node to traverse down to.
       */
      function switchView() {
        svg.selectAll(".node").remove();
        isParentView ? update(root.children) : update(root.leaves());
        isParentView = !isParentView;
      }

      function update(node: any) {

        console.log("root in update function: ");
        console.log(node);

        var cell = svg.selectAll(".node")
          .data(node)
          .enter().append("g")
          .attr("class", "node")
          .attr("transform", function (d: any) { return "translate(" + d.x0 + "," + d.y0 + ")"; });
        cell.append("clipPath")
          // @ts-ignore
          .attr("id", function (d) { return "clip-" + d.data.name })
          .append("rect")
          // @ts-ignore
          .attr("width", function (d) { return d.x1 - d.x0; })
          // @ts-ignore
          .attr("height", function (d) { return d.y1 - d.y0; });
        cell.append("rect")
          // @ts-ignore
          .attr("id", function (d) { return d.data.name; })
          // @ts-ignore
          .attr("width", function (d) { return d.x1 - d.x0; })
          // @ts-ignore
          .attr("height", function (d) { return d.y1 - d.y0; })
          .style("stroke", function (d) { return isParentView ? "black" : "none"; }) // add stroke color
          .style("stroke-width", function (d) { return isParentView ? "2px" : "0px"; }) // add stroke width

          // @ts-ignore
          .attr("fill", function (d) {
            if (!isParentView) {
              console.log("d in update function: ");
              console.log(d);
              // @ts-ignore
              var continent = String(d.parent.data.name);
              var color = String(continentToColorMap.get(continent));
            } else {
              // @ts-ignore
              var type = d.data.name;
              var color = String(productionColorMap.get(type));
              return color;
            }
            return color;
          })
          .on("mouseenter", function (d) {
            // Respond to mouse hover events
            // console.log("d in mouseenter function: ");
            // console.log(d); // d is the mouse event object
            const data = d.target.__data__;
            const name = data.data.name;
            const value = data.value;
            const isCountry = data.children === undefined;
            if (isCountry) {
              const continent = data.parent.data.name;
              const method = data.parent.parent.data.name;
              // console.log("name: " + name + " GWh produced: " + value + " isCountry: " + isCountry + " continent: " + continent + " method: " + method);
              setHover({ name: name, value: value, isCountry: isCountry, continent: continent, method: method });
            } else {
              // console.log("name: " + name + " GWh produced: " + value + " isCountry: " + isCountry);
              setHover({ name: name, value: value, isCountry: isCountry, continent: "", method: "" });
            }
            d3.select(this).style("fill-opacity", 0.5);
          })
          .on("mouseleave", function (d) {
            d3.select(this).style("fill-opacity", 1); // make the rectangle fully opaque again
          });

        cell.append("text")
          .attr("class", "node-text")
          // @ts-ignore
          .attr("clip-path", function (d) { return "url(#clip-" + d.data.name + ")"; })
          .selectAll("tspan")
          //@ts-ignore
          .data(function (d) { return [d.data.name]; }) // Use the name directly, no split
          .enter().append("tspan")
          //Set the text of the child nodes to be smaller, but make the zoom functionality still work

          // @ts-ignore
          .attr("font-size", function (d) { return isParentView ? "16px" : "6px"; })
          // @ts-ignore

          //.attr("font-size"," 8px")
          // @ts-ignore
          .attr("fill", function (d) { return isParentView && d === "Coal" ? "white" : "black"; })
          .attr("x", 4)
          .attr("y", 20) // Fixed position for the name
          .text(function (d) { return d; })
          .style("opacity", (d) => { return !isParentView || d === "Other renewables" ? "0" : "1"; });
      }

      /* Copy stu code ends */
    });
  }, [year]);


  //Write a function to convert the map to a hierarchy data structure that d3 can use
  // Create the node for each continent

  // Create the root node
  /**
   * Converts map data structure into recursive graph data structure.
   * @param allNodes 
   * @returns 
   */
  function convertMapToGraph(allNodes: Map<string, Map<string, CountryNode[]>>): any {
    // Create the node for each production method
    var methodsList: any[] = [];

    methods.forEach((method) => {

      var continentList: any[] = [];

      // Add countries to the continent nodes
      continents.forEach((continent) => {
        // @ts-ignore
        const countries: any[] = allNodes.get(method)?.get(continent)?.map((country) => {
          return {
            name: country.name,
            value: country.value,
          };
        });

        // log an error if countries is undefined and continue
        if (countries === undefined || countries === null) {
          console.log("Error: countries is undefined");
          return;
        }
        // make the contient node
        const continentNode = {
          name: continent,
          children: countries,
        };
        // add the continent node to the continent list
        continentList.push(continentNode);
      });
      const methodNode = {
        name: method,
        children: continentList,
      };
      methodsList.push(methodNode);
    });
    // make the root node
    const rootNode = {
      name: "All",
      children: methodsList,
    };
    return rootNode;

  }

  var width = 960;
  var height = 600;

  return (
    <div className=" flex flex-row pt-44 h-screen px-2 w-full items-center">
      <div className="flex flex-col w-[90%] items-center h-full space-y-3">


        <div className="flex flex-col fixed right-0 w-[200px] space-y-6">
          <div id="detailsProvider" className="flex flex-col flex-grow space-y-1 p-5 min-h-[100px] shadow-md rounded">
            {(hover === undefined || hover === null) ? null : (
              <div className="flex flex-row h-full">
                <div className="flex flex-col h-full">
                  <h1 className="text-2xl font-bold">Details</h1>
                  <h3 className="text-xl">
                    {hover?.isCountry ? <a target="blank" className="hover:underline text-blue-500" href={`/country/${hover?.name}?initYear=${year}`}>{hover?.name}</a> : hover?.name}{hover?.isCountry ? ", " + hover?.continent : ": " + hover?.value.toFixed(0) + " GWh"}
                  </h3>
                  {hover?.isCountry ? <h3 className="text-xl">{hover?.method + ": " + hover?.value.toFixed(0) + " GWh"}</h3> : null}
                </div>
              </div>
            )}
          </div>
          <div className="colorlegend ">
            <h2>Continent Color Key</h2>
            {Array.from(continentToColorMap.entries()).map(([continent, color], index) => (
              <div key={index} className="flex items-center mt-2">
                <div style={{ backgroundColor: color, width: 20, height: 20 }}></div>
                <div className="ml-2">{continent}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center pb-16 w-[75%] space-y-3">

          <h1 className="text-4xl font-bold z-10">Production Hierachy{" "}
            <Tooltip placement={"right"} arrow={true} title={`Click tree map to traverse. Zoom in and pan for closer detail.`} className={"cursor-pointer"}>
              <HelpOutlineIcon />
            </Tooltip>
          </h1>

          <div>
            {years.length > 0 && (
              <div className="years-list w-full">
                <div
                  id="year-list"
                  className="flex mb-4 flex-row p-2 rounded-full border shadow-lg"
                >
                  {years.map((y: string) => {
                    return (
                      <div key={y} className="year-list-entry">
                        <div
                          className={`year-list-year p-4 font-medium rounded opacity-90 hover:opacity-100 cursor-pointer hover:underline  ${
                            y === String(year) ? " text-blue-500 underline " : " "
                            } `}
                          onClick={() => {
                            //@ts-ignore
                            setYear(y);
                          }}
                        >
                          {y}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div id="treemap" className="border p-2 rounded shadow-md"></div>
        </div>
      </div>
    </div>
  );
};
