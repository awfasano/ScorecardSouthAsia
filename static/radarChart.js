// Global data and selected countries/years set
const selectedCountries = new Set();
const selectedCountryYears = {}; // Track selected years per country
let globalData = {}; // Organized as Group_Name: {Country: {Year: {Object}}}
let filteredData = {}; // Store the filtered dataset
let selectedCategory = "Vision"; // Default category is now Vision
let allIndicators = []; // Store all indicators

// Initialize tooltip as a D3 selection
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

// Define the ScoreCardIndicator class
class ScoreCardIndicator {
    constructor(id, secondary_id, group_name, indicator, proxy, country, year, year_type, source, value, value_n, value_map, value_standardized, positive, value_standardized_table) {
        this.id = id;
        this.secondary_id = secondary_id;
        this.group_name = group_name;
        this.indicator = indicator;
        this.proxy = proxy;
        this.country = country;
        this.year = year;
        this.year_type = year_type;
        this.source = source;
        this.value = value;
        this.value_n = value_n;
        this.value_map = value_map;
        this.value_standardized = value_standardized;
        this.positive = positive;
        this.value_standardized_table = value_standardized_table;
    }
}

// Function to get the color for each country based on the flag color
function getCountryColor(country) {
    const countryColors = {
        "India": "#EE5A1C", // Saffron
        "Pakistan": "#115740", // Green
        "Bangladesh": "#d30cb8", // Dark Green
        "Sri Lanka": "#8D153A", // Gold
        "Nepal": "#003893", // Crimson
        "Bhutan": "#FFCC00", // Gold
        "Afghanistan": "#000000", // Black
        "Maldives": "#00bbdd" // Red
    };
    return countryColors[country];
}

// Function to get a lighter or more transparent version of the country's color
function getYearColor(countryColor, yearType) {
    const opacity = 0.1 + (yearType * 0.3); // Adjust opacity based on year type
    return d3.color(countryColor).brighter(1 - opacity).formatRgb(); // Return a lighter color
}

// Function to get the flag URL for each country
function getFlagUrl(country) {
    const flagUrls = {
        "India": "https://flagcdn.com/in.svg",
        "Pakistan": "https://flagcdn.com/pk.svg",
        "Bangladesh": "https://flagcdn.com/bd.svg",
        "Sri Lanka": "https://flagcdn.com/lk.svg",
        "Nepal": "https://flagcdn.com/np.svg",
        "Bhutan": "https://flagcdn.com/bt.svg",
        "Afghanistan": "https://flagcdn.com/af.svg",
        "Maldives": "https://flagcdn.com/mv.svg"
    };
    return flagUrls[country];
}

// Fetching the data from the API and organizing it by Group_Name, Country, and Year
async function fetchData() {
    try {
        console.log("Fetching data from API...");
        const response = await fetch('/api/scorecard_chart');

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("API Response Data:", data);

        if (!Array.isArray(data)) {
            throw new Error('The fetched data is not an array.');
        }

        globalData = {}; // Initialize the globalData object

        data.forEach(({ Group_Name, Country, Year_Type, Indicator, Value_Standardized, Value_Standardized_Table, Proxy, Value_Map }) => {
            const group = globalData[Group_Name] || (globalData[Group_Name] = {});
            const country = group[Country] || (group[Country] = {});
            const yearType = country[Year_Type] || (country[Year_Type] = []);

            if (Value_Standardized !== null && !isNaN(Value_Standardized)) {
                yearType.push({
                    axis: Indicator,
                    value_standardized: Value_Standardized,
                    proxy: Proxy,
                    value_map: Value_Map,
                    table_value_standarized: Value_Standardized_Table !== null && !isNaN(Value_Standardized_Table) ? Value_Standardized_Table : null
                });
            }
        });

        // Populate allIndicators with unique indicators
        allIndicators = Array.from(new Set(data.map(d => d.Indicator))).sort();

        createCategoryButtons(); // Create the category buttons
        populateFlagSelections(); // Populate flag selections
    } catch (error) {
        console.error('Error fetching scorecard indicators:', error);
    }
}

// Create category buttons
function createCategoryButtons() {
    const categories = Object.keys(globalData);
    const categoryContainer = document.getElementById("categoryContainer");

    categories.forEach(category => {
        const button = document.createElement("button");
        button.textContent = category;
        button.classList.add("category-button");
        button.dataset.category = category;

        if (category === "Vision") {
            button.classList.add("selected"); // Automatically highlight Vision
        }

        button.addEventListener("click", function () {
            selectedCategory = this.dataset.category;
            highlightSelectedButton(this);
            filterData(); // Update the radar chart and table based on the selected category
        });
        categoryContainer.appendChild(button);
    });
}

// Highlight the selected category button
function highlightSelectedButton(selectedButton) {
    const buttons = document.querySelectorAll('.category-button');
    buttons.forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');
}

// Populate flag selections and add year buttons dynamically
function populateFlagSelections() {
    const flagContainer = document.getElementById("flagSelections");
    const countries = ["India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal", "Bhutan", "Afghanistan", "Maldives"];
    flagContainer.innerHTML = '';

    countries.forEach(country => {
        const flagDiv = document.createElement("div");
        flagDiv.classList.add("flag-item");

        const flagImage = document.createElement("img");
        flagImage.src = getFlagUrl(country);
        flagImage.alt = country;
        flagDiv.appendChild(flagImage);

        selectedCountryYears[country] = new Set();

        const yearButtonsContainer = document.createElement("div");
        yearButtonsContainer.classList.add("year-buttons-container");
        yearButtonsContainer.style.display = "none"; // Hidden by default

        [1, 2, 3].forEach(yearType => {
            const yearButton = document.createElement("button");
            const countryColor = getCountryColor(country);
            yearButton.textContent = `${yearType}`;
            yearButton.classList.add("year-button");
            yearButton.dataset.yearType = yearType;
            yearButton.style.backgroundColor = "white"; // Default color is white

            yearButton.addEventListener("mouseenter", function () {
                if (!this.classList.contains("selected")) {
                    this.style.backgroundColor = getYearColor(countryColor, yearType); // Hover color
                }
            });

            yearButton.addEventListener("mouseleave", function () {
                if (!this.classList.contains("selected")) {
                    this.style.backgroundColor = "white"; // Revert to white if not selected
                }
            });

            yearButton.addEventListener("click", function () {
                this.classList.toggle("selected");
                const year = parseInt(this.dataset.yearType, 10);
                if (selectedCountryYears[country].has(year)) {
                    selectedCountryYears[country].delete(year);
                    this.style.backgroundColor = "white"; // Revert to white if deselected
                } else {
                    selectedCountryYears[country].add(year);
                    this.style.backgroundColor = getYearColor(countryColor, yearType); // Selected color
                }
                filterData();  // Update the radar chart and table based on the selected countries and year types
            });
            yearButtonsContainer.appendChild(yearButton);
        });

        flagDiv.appendChild(yearButtonsContainer);
        flagContainer.appendChild(flagDiv);

        flagImage.addEventListener("click", function () {
            if (selectedCountries.has(country)) {
                selectedCountries.delete(country);
                this.classList.remove("selected");
                yearButtonsContainer.style.display = "none"; // Hide year buttons when flag is deselected
            } else {
                selectedCountries.add(country);
                this.classList.add("selected");
                yearButtonsContainer.style.display = "flex"; // Show year buttons when flag is selected
            }
            filterData();  // Update the radar chart and table based on the selected countries
        });
    });
}

// Filtering the data based on the selected year type, category, and countries, and updating the radar chart and table
function filterData() {
    console.log("Filtering data based on selected countries, years, and category...");

    filteredData = {}; // Initialize the filtered data object

    const selectedGroup = selectedCategory === "Prosperity, Digital, and Infrastructure"
        ? ["Digital", "Infrastructure", "Prosperity"]
        : [selectedCategory];

    selectedGroup.forEach(groupName => {
        if (globalData[groupName]) {
            filteredData[groupName] = {};

            Array.from(selectedCountries).forEach(country => {
                if (globalData[groupName][country]) {
                    filteredData[groupName][country] = {};

                    selectedCountryYears[country].forEach(yearType => {
                        if (globalData[groupName][country][yearType]) {
                            filteredData[groupName][country][yearType] = globalData[groupName][country][yearType]
                                .map(d => ({
                                    axis: d.axis,
                                    value_standardized: d.value_standardized,
                                    proxy: d.proxy,
                                    value_map: d.value_map,
                                    table_value_standarized: d.table_value_standarized
                                }));
                        }
                    });
                }
            });
        }
    });

    console.log("Filtered Data:", filteredData);

    updateRadarChart(selectedGroup);
    updateTable(Array.from(selectedCountries), selectedGroup);
}

// Update the radar chart based on the filtered data
function updateRadarChart(selectedGroup) {
    let svgRadar = d3.select("#chart svg g");

    if (svgRadar.empty()) {
        svgRadar = d3.select("#chart svg")
            .append("g")
            .attr("transform", "translate(300, 300)"); // Center the radar chart in the SVG
    }

    svgRadar.selectAll(".radarWrapper").remove();
    svgRadar.selectAll(".axis").remove();

    const radius = 250;
    const levels = 10;

    let filteredIndicators = [];
    selectedGroup.forEach(groupName => {
        if (filteredData[groupName]) {
            const groupIndicators = Object.keys(filteredData[groupName])
                .flatMap(country =>
                    Object.values(filteredData[groupName][country])
                        .flatMap(years =>
                            years.map(data => data.axis)
                        )
                );
            filteredIndicators = filteredIndicators.concat(groupIndicators);
        }
    });

    filteredIndicators = Array.from(new Set(filteredIndicators)).sort();

    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);
    const angleSlice = Math.PI * 2 / filteredIndicators.length;

    for (let i = 0; i < levels; i++) {
        const levelFactor = radius * ((i + 1) / levels);
        svgRadar.selectAll(".levels")
            .data([1])
            .enter()
            .append("circle")
            .attr("r", levelFactor)
            .style("fill", "none")
            .style("stroke", "gray")
            .style("stroke-opacity", 0.75)
            .style("stroke-width", 0.3);
    }

    const axis = svgRadar.selectAll(".axis")
        .data(filteredIndicators)
        .enter()
        .append("g")
        .attr("class", "axis");

    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(100 * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => rScale(100 * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("stroke", "gray")
        .style("stroke-width", "2px");

    axis.append("text")
        .attr("class", "legend")
        .style("font-size", "11px")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("x", (d, i) => rScale(100 * 1.2) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => rScale(100 * 1.2) * Math.sin(angleSlice * i - Math.PI / 2))
        .text(d => d)
        .call(wrap, 110)
        .style("fill", "#000");

    Object.keys(filteredData).forEach(groupName => {
        Object.keys(filteredData[groupName]).forEach(country => {
            Object.keys(filteredData[groupName][country]).forEach(yearType => {
                drawRadarChartForCountryYear(
                    country,
                    yearType,
                    groupName,
                    svgRadar,
                    rScale,
                    angleSlice,
                    filteredIndicators,
                    false
                );
            });
        });
    });
}

// Helper function to draw a radar chart for a specific country and year
function drawRadarChartForCountryYear(country, yearType, groupName, svgRadar, rScale, angleSlice, allIndicators, animate) {
    const radarWrapper = svgRadar.append("g")
        .attr("class", "radarWrapper");

    const axes = allIndicators.map((indicator, i) => {
        const data = filteredData[groupName][country][yearType].find(d => d.axis === indicator);
        return {
            axis: indicator,
            value_standardized: data ? data.value_standardized : null,
            index: i,
            proxy: data ? data.proxy : null,
            value_map: data ? data.value_map : null
        };
    });

    axes.forEach((axisData, i) => {
        radarWrapper.append("line")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", rScale(100 * 1.1) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y2", rScale(100 * 1.1) * Math.sin(angleSlice * i - Math.PI / 2))
            .style("stroke", "gray")
            .style("stroke-width", "2px");

        radarWrapper.append("text")
            .attr("class", "legend")
            .style("font-size", "11px")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .attr("x", rScale(100 * 1.2) * Math.cos(angleSlice * i - Math.PI / 2))
            .attr("y", rScale(100 * 1.2) * Math.sin(angleSlice * i - Math.PI / 2))
            .text(axisData.axis)
            .call(wrap, 110)
            .style("fill", "#000");
    });

    const filteredDataForCountryYear = axes.filter(d => d.value_standardized !== null);

    const radarLine = d3.lineRadial()
        .defined(d => d.value_standardized !== null)
        .radius(d => rScale(d.value_standardized))
        .angle(d => angleSlice * d.index)
        .curve(d3.curveLinearClosed);

    const countryColor = getYearColor(getCountryColor(country), yearType);

    const radarPath = radarWrapper.append("path")
        .datum(filteredDataForCountryYear)
        .attr("d", radarLine)
        .style("stroke-width", "2px")
        .style("stroke", countryColor)
        .style("fill", "none");

    if (animate) {
        radarPath
            .attr("stroke-dasharray", function () {
                const totalLength = this.getTotalLength();
                return `${totalLength} ${totalLength}`;
            })
            .attr("stroke-dashoffset", function () {
                return this.getTotalLength();
            })
            .transition()
            .duration(800)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0)
            .on("end", function () {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .style("fill-opacity", 0.3)
                    .style("fill", countryColor);
            });
    } else {
        radarPath.style("fill", countryColor).style("fill-opacity", 0.3);
    }

    radarWrapper.selectAll(".radarCircle")
        .data(filteredDataForCountryYear)
        .enter()
        .append("circle")
        .attr("class", "radarCircle")
        .attr("r", 4)
        .attr("cx", d => rScale(d.value_standardized) * Math.cos(angleSlice * d.index - Math.PI / 2))
        .attr("cy", d => rScale(d.value_standardized) * Math.sin(angleSlice * d.index - Math.PI / 2))
        .style("fill", countryColor)
        .style("fill-opacity", 0.8)
        .on("mouseover", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8)
                .style("fill", "orange");

            const tooltipData = filteredData[groupName][country][yearType].find(ind => ind.axis === d.axis);
            tooltip.transition().duration(200)
                .style("opacity", .9);
            tooltip.html(
                `Indicator: ${d.axis}<br/>` +
                `Proxy: ${tooltipData.proxy}<br/>` +
                `Value: ${d.value_standardized}<br/>` +
                `Value Map: ${tooltipData.value_map}<br/>` +
                `Standardized Value (Table): ${tooltipData.table_value_standarized}`
            )
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 4)
                .style("fill", countryColor);

            tooltip.transition().duration(500)
                .style("opacity", 0);
        });
}

// Update the table based on selected countries and indicators
// Update the table based on selected countries and indicators
// Update the table based on selected countries and indicators
function updateTable(countries, selectedGroup) {
    const table = d3.select("#dataTable");
    table.html("");

    if (countries.length === 0) return;

    const headers = ["Indicator"].concat(
        countries.flatMap(country =>
            Array.from(selectedCountryYears[country])
                .sort()
                .map(year => `${country} (Year ${year})`)
        )
    );

    const thead = table.append("thead").append("tr");

    headers.forEach(header => {
        const th = thead.append("th").text(header);
        if (header !== "Indicator") {
            th.append("span")
                .attr("class", "sort-btn")
                .html("&#9650; &#9660;")
                .on("click", function () {
                    sortTable(header);
                });
        }
    });

    // Collect only the indicators that are present in the filteredData for the selected group(s)
    const relevantIndicators = [];

    selectedGroup.forEach(groupName => {
        if (filteredData[groupName]) {
            Object.keys(filteredData[groupName]).forEach(country => {
                if (countries.includes(country)) {
                    Object.keys(filteredData[groupName][country]).forEach(yearType => {
                        if (selectedCountryYears[country].has(parseInt(yearType))) {
                            filteredData[groupName][country][yearType].forEach(data => {
                                if (!relevantIndicators.includes(data.axis)) {
                                    relevantIndicators.push(data.axis);
                                }
                            });
                        }
                    });
                }
            });
        }
    });

    const rows = table.append("tbody")
        .selectAll("tr")
        .data(relevantIndicators)  // Use only the relevant indicators
        .enter()
        .append("tr");

    rows.each(function (indicator) {
        const row = d3.select(this);
        row.append("td").text(indicator);

        countries.forEach(country => {
            Array.from(selectedCountryYears[country]).sort().forEach(year => {
                let valueData = null;

                selectedGroup.forEach(groupName => {
                    if (filteredData[groupName] && filteredData[groupName][country] && filteredData[groupName][country][year]) {
                        const groupValueData = filteredData[groupName][country][year].find(d => d.axis === indicator);
                        if (groupValueData) {
                            valueData = groupValueData;
                        }
                    }
                });

                row.append("td")
                    .attr("class", "value")
                    .text(valueData && valueData.value_standardized !== null ? valueData.value_standardized : '')
                    .style("background", valueData && valueData.table_value_standarized !== null
                        ? d3.interpolateRdBu((valueData.table_value_standarized + 100) / 200)
                        : '')
                    .on("mouseover", function (event) {
                        tooltip.transition().duration(200)
                            .style("opacity", .9);
                        tooltip.html(
                            `Indicator: ${indicator}<br/>` +
                            `Proxy: ${valueData?.proxy}<br/>` +
                            `Value: ${valueData?.value_standardized}<br/>` +
                            `Value Map: ${valueData?.value_map}<br/>` +
                            `Standardized Value (Table): ${valueData?.table_value_standarized}`
                        )
                            .style("left", (event.pageX) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function () {
                        tooltip.transition().duration(500)
                            .style("opacity", 0);
                    });
            });
        });
    });
}

// Sort the table based on the selected country
function sortTable(countryYear) {
    const table = d3.select("#dataTable");
    const rows = table.selectAll("tbody tr").nodes();

    const countryYearIndex = table.selectAll("thead th")
        .nodes()
        .findIndex(th => th.textContent === countryYear);

    if (countryYearIndex === -1) return;

    const sortedRows = rows.sort((a, b) => {
        const aValue = parseFloat(d3.select(a).selectAll("td").nodes()[countryYearIndex].textContent) || 0;
        const bValue = parseFloat(d3.select(b).selectAll("td").nodes()[countryYearIndex].textContent) || 0;

        return bValue - aValue;
    });

    table.select("tbody").html('');
    sortedRows.forEach(row => table.select("tbody").node().appendChild(row));
}

// Wrap function for axis labels
function wrap(text, width) {
    text.each(function () {
        const text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            lineHeight = 1.1, // ems
            x = text.attr("x"),
            y = text.attr("y"),
            dy = parseFloat(text.attr("dy"));
        let tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
        let line = [],
            lineNumber = 0,
            word,
            tspanLine;

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }
    });
}

// Start the script by fetching the data
fetchData().then(() => {
    highlightSelectedButton(document.querySelector(`[data-category="Vision"]`)); // Automatically highlight Vision button
    filterData(); // Filter data based on Vision
});
