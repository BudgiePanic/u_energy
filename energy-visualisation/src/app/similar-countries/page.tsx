/**
 * @packageDocumentation
 * @module SimilarCountriesPage
 * Contains the SimilarCountriesPage component
 *
 * To start the app run the following command
 * "npm run dev"
 *
 * The website will be available at http://localhost:3000/similar-countries
 *
 * @author Benjamin Sanson
 */
// This statement causes our code to run in the client web browser instead of the server. Console log messages appear in the web browser.
"use client";

// import the react library
import React, { use, useEffect, useState } from "react";
import * as d3 from "d3";
import { Tooltip } from "@mui/material";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { saveAs } from "file-saver";

/**
 * An array of strings that represent the different energy production methods
 */
const productionMethods: string[] = [
  "Hydro",
  "Nuclear",
  "Solar",
  "Wind",
  "Other renewables",
  "Natural gas",
  "Coal",
  "Oil",
];

/**
 * An array of colors that represent the different energy production methods
 */
const productionColors: string[] = [
  "#1F77B4",
  "#FEF502",
  "#F4BF3A",
  "#D1F1F9",
  "#79E381",
  "#DE2A2A",
  "#000000",
  "#6A4848",
];

/**
 * A mapping from energy production method to color array index
 */
const productionColorMap: Map<string, number> = new Map([
  ["Hydro", 0],
  ["Nuclear", 1],
  ["Solar", 2],
  ["Wind", 3],
  ["Other renewables", 4],
  ["Natural gas", 5],
  ["Coal", 6],
  ["Oil", 7],
]);

interface Country {
  country: string;
  largestMethod: string;
  amount: number;
  color: string;
  id: string;
  group: number;
  energyTotal: number;
}

// export a component that has a div with header inside that says countries
export default function SimilarCountriesPage() {
  const [selectedCountry, setSelectedCountry] = useState<Country>(null as any);
  const [years, setYears] = useState<string[]>([]);
  const [year, setYear] = useState<string>("2022");
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(0.86); // The closer to 1, the more similar the countries are
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [exportableCountries, setExportableCountries] = useState<Object[]>([]);
  const [exportableEdges, setExportableEdges] = useState<Object[]>([]);

  const maxThreshold: number = 1;
  const minThreshold: number = -1;
  const incrementAmount: number = 0.02;

  // This log message currently appears in both the web browser console and the server console
  console.log("Hello from SimilarCountriesPage");

  // This function is called once when the page loads, it runs on the client browser.
  useEffect(() => {
    // Use the D3 library to load the data file
    d3.csv("data/data.csv").then((data) => {
      // console.log(data); // sanity check

      // filter data to only include instances from the target year
      const dataFromYear = data.filter((d) => d.YEAR === year);
      // map the dataFromYear to PRODUCT and remove duplicates
      const products = dataFromYear
        .map((d) => String(d.PRODUCT))
        .filter((value, index, self) => self.indexOf(value) === index);
      // map the dataFromYear to COUNTRY and remove duplicates
      const countries = dataFromYear
        .map((d) => String(d.COUNTRY))
        .filter((value, index, self) => self.indexOf(value) === index);
      // remove any elements from filteredData that are not in productionMethods
      const instances = dataFromYear.filter((d) =>
        productionMethods.includes(String(d.PRODUCT))
      );

      // find all the unique years
      var years: string[] = [];
      data.forEach((d) => {
        if (!years.includes(String(d.YEAR))) {
          years.push(String(d.YEAR));
        }
      });
      setYears(years);
      // log instances
      // console.log(instances);

      // =========== Current goal is to find the top generation method for each country in the given year to determine what color the node should be in the graph ==========

      // for each country iterate over instances and create a new object with the country name and the sum of the values for each production method
      const countryTotals = countries.map((country) => {
        const countryInstances = instances.filter(
          (d) => String(d.COUNTRY) === country
        );
        var amount: number = Number.MIN_VALUE;
        var biggestMethod: string = "";
        productionMethods.forEach((method) => {
          const methodInstances = countryInstances.filter(
            (d) => String(d.PRODUCT) === method
          );
          const methodTotal = methodInstances.reduce(
            (a, b) => a + Number(b.VALUE),
            0
          );
          if (methodTotal > amount) {
            amount = methodTotal;
            biggestMethod = method;
          }
        });

        var colorIndex: number = Number(productionColorMap.get(biggestMethod));
        var totalEnergy: number = countryInstances.reduce(
          (a, b) => a + Number(b.VALUE),
          0
        );

        return {
          country: country,
          biggestProducer: biggestMethod,
          amount: amount,
          color: productionColors[colorIndex],
          id: country,
          group: colorIndex,
          totalEnergy: totalEnergy,
        };
      });
      // log the size of countries
      console.log(countries.length);
      console.log(countryTotals); // Country totals ends up being used as the nodes in the graph later in this function.

      const largestCountryTotal = countryTotals.reduce((a, b) =>
        a.amount > b.amount ? a : b
      );
      const smallestCountryTotal = countryTotals.reduce((a, b) =>
        a.amount < b.amount ? a : b
      );

      // ============== At this stage we want to calculate the similarity of each country to one another for the force attaction in the graph =======================
      var edges: any[] = [];

      /**
       * Checks if two countries share any energy generation methods in common
       * @param countryA
       * @param countryB
       * @returns true if countryA and countryB share any energy generation methods in common, false otherwise
       */
      const checkForSharedGenerationMethods = (
        countryA: string,
        countryB: string
      ) => {
        // if country a and country b share no generation methods then skip
        var countryAInstances = instances.filter(
          (d) => String(d.COUNTRY) === countryA
        );
        var countryBInstances = instances.filter(
          (d) => String(d.COUNTRY) === countryB
        );
        var countryAProducts = countryAInstances
          .map((d) => String(d.PRODUCT))
          .filter((value, index, self) => self.indexOf(value) === index);
        var countryBProducts = countryBInstances
          .map((d) => String(d.PRODUCT))
          .filter((value, index, self) => self.indexOf(value) === index);
        var sharedProducts = countryAProducts.filter((value) =>
          countryBProducts.includes(value)
        );
        if (sharedProducts.length === 0) {
          return false;
        } else {
          return true;
        }
      };

      /**
       * Countries that generated a similar amount of GWh will have larger similarity score.
       * @param countryA
       * @param countryB
       */
      const calculateCountrySimilarityEnergyTotal: (
        countryA: string,
        countryB: string
      ) => number = (countryA: string, countryB: string) => {
        // get country A from countryTotals
        var countryAInstances = countryTotals.filter(
          (d) => d.country === countryA
        );
        var countryBInstances = countryTotals.filter(
          (d) => d.country === countryB
        );
        var totalEnergyA: number = countryAInstances[0].totalEnergy;
        var totalEnergyB: number = countryBInstances[0].totalEnergy;
        var difference: number = Math.abs(totalEnergyA - totalEnergyB);
        var range: number =
          largestCountryTotal.amount - smallestCountryTotal.amount;
        var normalizedDifference: number = difference / range;
        return 3 * (1 - normalizedDifference); // This causes countries with a large difference in energy production to have a thin edge connecting them
      };

      const shouldCountriesHaveEdge: (
        countryA: string,
        countryB: string
      ) => boolean = (countryA: string, countryB: string) => {
        // Store the total energy generated for each method for countryA in an array
        var countryAInstances = instances.filter(
          (d) => String(d.COUNTRY) === countryA
        );
        var countryAMethodTotals: number[] = [];
        productionMethods.forEach((method) => {
          var countryAMethodInstances = countryAInstances.filter(
            (d) => String(d.PRODUCT) === method
          );
          var countryAMethodTotal = countryAMethodInstances.reduce(
            (a, b) => a + Number(b.VALUE),
            0
          );
          // use production color map to decide the index into the array
          var index: number = Number(productionColorMap.get(method));
          countryAMethodTotals[index] = countryAMethodTotal;
        });
        // Store the total energy generated for each method for countryB in an array
        var countryBInstances = instances.filter(
          (d) => String(d.COUNTRY) === countryB
        );
        var countryBMethodTotals: number[] = [];
        productionMethods.forEach((method) => {
          var countryBMethodInstances = countryBInstances.filter(
            (d) => String(d.PRODUCT) === method
          );
          var countryBMethodTotal = countryBMethodInstances.reduce(
            (a, b) => a + Number(b.VALUE),
            0
          );
          // use production color map to decide the index into the array
          var index: number = Number(productionColorMap.get(method));
          countryBMethodTotals[index] = countryBMethodTotal;
        });

        // log an error if the arrays are not the same length
        if (countryAMethodTotals.length !== countryBMethodTotals.length) {
          console.error(
            "Country A and Country B do not have the same number of energy generation methods"
          );
          return false;
        }

        // treat the two arrays as vectors, calculate the dot product between them
        var dotProduct: number = 0;
        var magnitudeA: number = 0;
        var magnitudeB: number = 0;
        for (var i = 0; i < countryAMethodTotals.length; i++) {
          dotProduct += countryAMethodTotals[i] * countryBMethodTotals[i];
          magnitudeA += countryAMethodTotals[i] * countryAMethodTotals[i];
          magnitudeB += countryBMethodTotals[i] * countryBMethodTotals[i];
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        var cosineSimilarity: number = dotProduct / (magnitudeA * magnitudeB);
        if (cosineSimilarity < similarityThreshold) {
          return false;
        }
        // if (!checkSameTopGenerationMethod(countryA, countryB)) {
        //     return false;
        // }
        return true;
      };

      // var temp:number = 0/100; // 0
      // var temp2:number = 0/0; // NaN
      // var temp3:number = 10/0; // Infinity
      // log the similairty threshold
      // console.log("Similarity Threshold: " + similarityThreshold);

      // A set of countries that has already been visited
      var visited: string[] = [];

      countries.forEach((countryA) => {
        countries.forEach((countryB) => {
          // if country a is the same as country b then skip
          if (countryA === countryB) {
            return;
          }
          // If country B is in the visited set then skip
          if (visited.includes(countryB)) {
            return;
          }
          // if country a and country b share no generation methods then skip
          if (!checkForSharedGenerationMethods(countryA, countryB)) {
            return;
          }
          if (!shouldCountriesHaveEdge(countryA, countryB)) {
            return;
          }
          // var weight: number = calculateCountrySimilarityEuclidean(countryA, countryB);
          var weight: number = calculateCountrySimilarityEnergyTotal(
            countryA,
            countryB
          );
          var edge: Object = {
            source: countryA,
            target: countryB,
            value: weight,
          };
          edges.push(edge);
        });
        // Add country A to the visited set
        visited.push(countryA);
      });

      console.log(edges);

      // ================ time to make the d3 force simulation graph (https://observablehq.com/@d3/force-directed-graph/2?intent=fork) ======================
      const width: number = 1000;
      const height: number = 750;
      // convert the country instances to nodes
      const nodes: d3.SimulationNodeDatum[] = countryTotals.map((country) => {
        return {
          id: String(country.country),
          group: Number(country.group),
          energyTotal: country.totalEnergy,
          largestMethod: country.biggestProducer,
        } as d3.SimulationNodeDatum;
      });
      // convert the edges to links
      const links: d3.SimulationLinkDatum<d3.SimulationNodeDatum>[] = edges.map(
        (edge) => {
          return {
            source: String(edge.source),
            target: String(edge.target),
            value: Number(edge.value),
          } as d3.SimulationLinkDatum<d3.SimulationNodeDatum>;
        }
      );

      const radius: number = 5;
      // create the physics simulation
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3.forceLink(links).id((d: any) => d.id)
        )
        .force("charge", d3.forceManyBody())
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force(
          "x",
          d3
            .forceX()
            .x((d) => Math.max(radius, Math.min(width - radius, Number(d.x))))
        )
        .force(
          "y",
          d3
            .forceY()
            .y((d) => Math.max(radius, Math.min(height - radius, Number(d.y))))
        )
        .on("tick", ticked);

      // enable zooming
      const zoom = d3
        .zoom()
        .translateExtent([
          [0, 0],
          [width, height],
        ])
        .scaleExtent([1, 15])
        .on("zoom", zoomed)
        .on("zoom", zoomed);
      function zoomed(event: any) {
        // svg.attr("transform", event.transform);
        // half the event transform values
        event.transform.x = event.transform.x / 2;
        event.transform.y = event.transform.y / 2;
        svg.attr("transform", event.transform);
        console.log(event.transform);
      }

      // Find the div to inject DOM elements into
      const container = d3.select("#visualization");

      // Remove existing elements in the div
      container.selectAll("*").remove();

      // Add an SVG
      const svg = container
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .attr("overflow", "visible")
        .attr("overflow-x", "clip")
        .attr("preserveAspectRatio", "xMidYMid meet")
        .attr("style", "max-width: 100%; height: auto;")
        // @ts-ignore
        .call(zoom);

      const link = svg
        .append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: any) => Math.sqrt(d.value));

      const node = svg
        .append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", (d: any) => productionColors[d.group])
        .attr("fill-opacity", (d: any) => {
          if (selectedMethod !== "") {
            if (d.largestMethod === selectedMethod) {
              return 1;
            } else {
              return 0.2;
            }
          } else {
            return 1;
          }
        })
        // Create a popup when a node is clicked with information about the node
        .on("click", (event: any, d: any) => {
          setSelectedCountry(d as Country);
          console.log(d);
        });
      node.append("title").text((d: any) => d.id);

      // This causes a type error but I don't know how to solve it. The actual code works fine, so I'm just ignoring the error here.
      // @ts-ignore
      node.call(
        // @ts-ignore
        d3
          .drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended)
      );

      function ticked() {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node.attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
      }

      function dragstarted(this: any, event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        // set cursor to grabbing
        d3.select(this).style("cursor", "grabbing");
      }

      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      setExportableCountries(countryTotals);
      setExportableEdges(edges);
    });
  }, [year, similarityThreshold, selectedMethod]);
  /*This argument causes this function to be recalled if the selected year or similarity threshold changes*/

  if(typeof(document) === "undefined"){
    return <>Loading...</>
  }

  // hide the details on demand if the user clicks outside of the popup
  document
    .getElementById("visualization")
    ?.addEventListener("click", (event) => {
      // check if we clicked inside the country details popup
      var clicked = event.target as HTMLElement;
      var typeOfClicked: string = clicked.tagName;
      if (typeOfClicked !== "circle") {
        setSelectedCountry(null as any);
        if (selectedMethod !== "") setSelectedMethod("");
      }
    });

  return (
    <div className=" flex flex-row pt-44 h-screen px-2 w-full items-center overflow-hidden">
      <div className="flex flex-col w-[90%] items-center h-full">
        <h1 className="text-4xl font-bold z-10">Similar Countries</h1>
        <div className="flex flex-col">
          <div id="visualization"></div>

          {/*the pop up component*/}
          {selectedCountry && (
            <div
              id="country-popup"
              className="fixed left-72 shadow-md p-4 rounded"
            >
              <div>
                <div className="flex space-x-2">
                  <a
                    target="_blank"
                    href={`/country/${selectedCountry.id}?initYear=${year}`}
                  >
                    <h1 className="font-bold text-lg hover:underline">
                      {selectedCountry.id}
                    </h1>
                  </a>
                  <span className="text-xl font-bold">⤴</span>
                </div>
                <ul>
                  <li>Biggest Producer: {selectedCountry.largestMethod}</li>
                  <li>
                    Energy Total: {Math.trunc(selectedCountry.energyTotal)} GWh
                  </li>
                </ul>
              </div>
            </div>
          )}
          {years.length > 0 && (
            <div
              id="year-list"
              className="fixed bottom-0 flex mb-4 flex-row p-2 rounded-full border shadow-lg"
            >
              {years.map((y: string) => {
                return (
                  <div key={y} className="year-list-entry">
                    <div
                      className={`year-list-year p-4 font-medium rounded opacity-90 hover:opacity-100 cursor-pointer hover:underline  ${
                        y === year ? " text-blue-500 underline " : " "
                      } `}
                      onClick={() => {
                        setYear(y);
                        // remove selected country,
                        // since the year has changed,
                        // the popup will not show correct info
                        setSelectedCountry(null as any);
                      }}
                    >
                      {y}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col flex-grow space-y-1 p-5 rounded-lg shadow-xl z-10">
        {/*The button to export current year's JSON*/}

        <div className="flex flex-row justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
            onClick={() => {
              let dataObj = {
                similarityThreshold: similarityThreshold,
                countries: exportableCountries.map((c: any) => {
                  return {
                    country: c.country,
                    biggestProducer: c.biggestProducer,
                    amount: c.amount,
                    totalEnergy: c.totalEnergy,
                  };
                }),
                edges: exportableEdges.map((e: any) => {
                  return {
                    source: e.source,
                    target: e.target,
                    value: e.value,
                  };
                }),
              };

              // Convert to a JSON string with indentation
              let dataStr = JSON.stringify(dataObj, null, 2);

              const blob = new Blob([dataStr], {
                type: "text/plain;charset=utf-8",
              });

              saveAs(blob, `${year}_production_group_nodes.json`);
            }}
          >
            Export Graph as JSON
          </button>
        </div>

        <div id="color-map" className="flex-grow flex flex-col space-y-1">
          {
            // Add a div for each color in prductionColors
            Object.keys(productionMethods).map((key: string) => {
              const methodName: string = productionMethods[Number(key)];
              const color: string =
                productionColors[Number(productionColorMap.get(methodName))];
              const textColor: string =
                methodName === "Coal" ||
                methodName === "Hydro" ||
                methodName === "Oil" ||
                methodName === "Natural gas"
                  ? "white"
                  : "black";
              return (
                <div
                  key={methodName}
                  className="color-map-entry"
                  onClick={() => {
                    setSelectedMethod(methodName);
                  }}
                >
                  <div
                    className="color-map-color p-4 font-medium rounded  opacity-90 hover:opacity-100"
                    style={{ backgroundColor: color, color: textColor }}
                  >
                    {methodName}
                  </div>
                </div>
              );
            })
          }
        </div>
        {
          // add a div that states the current similarity threshold
          // make the text bold
          <Tooltip
            arrow
            title="The similarity required between two countries' energy production distribution before they are connected in the graph"
          >
            <div className="color-map-entry border border-black cursor-pointer">
              <div className="color-map-color p-4 font-medium rounded  opacity-90 hover:opacity-100">
                <div className="flex flex-row space-x-2">
                  <p className="font-bold flex items-center space-x-2">
                    <HelpOutlineIcon />
                    <span>Similarity: {similarityThreshold.toFixed(2)}</span>
                  </p>
                </div>
              </div>
            </div>
          </Tooltip>
        }
        {
          // add a div that contains two buttons, one for decreasing the similarity threshold, one for increasing the similarity threshold
          <div className="color-map-entry">
            <div className="color-map-color p-4 font-medium rounded  opacity-90 hover:opacity-100">
              <div className="flex flex-row space-x-2">
                <Tooltip
                  arrow
                  title="Countries with less similarity between their energy generation methods are clumped together"
                >
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => {
                      if (similarityThreshold > minThreshold)
                        setSimilarityThreshold(
                          similarityThreshold - incrementAmount
                        );
                    }}
                  >
                    Less Similarity
                  </button>
                </Tooltip>
                <Tooltip
                  arrow
                  title="Countries with more similarity between their energy generation methods are clumped together"
                >
                  <button
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => {
                      if (similarityThreshold < maxThreshold)
                        setSimilarityThreshold(
                          similarityThreshold + incrementAmount
                        );
                    }}
                  >
                    More Similarity
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  );
}
