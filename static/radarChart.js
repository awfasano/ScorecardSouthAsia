const selectedCountries = new Set();
const selectedCountryYears = {}; // Track selected years per country
let globalData = {}; // Organized as Group_Name: {Country: {Year: {Object}}}
let filteredData = {}; // Store the filtered dataset
let selectedCategory = "Vision"; // Default category is now Vision
let allIndicators = []; // Store all indicators
let filteredIndicators = []; // Indicators for the selected category
let countryYearTypes = {}; // Map of country to available year types
let mostRecentSelection = null; // Keep track of the most recent selection
let showRadarValues = false; // Flag to toggle the display of radar values
let tableSortOption = 'indicator'; // Default sorting by indicator
tableSortOption = 'year'; // Set default sort option to 'year'


// Initialize global variables at the top of your file
let allCirclesData = []; // Initialize as empty array

// Function to get the color for each country based on the flag color
// Function to get a color variation for each country-year combination
function getCountryYearColor(country, yearType) {
    if (!country || !yearType || !countryYearTypes[country]) {
        return "#cccccc";
    }

    const availableYearTypes = Array.from(countryYearTypes[country] || [])
        .sort((a, b) => b - a);
    const recent = availableYearTypes[0];

    const yearColors = {
        "India": {
            recent: "#8B0000",
            previous: "#ea4242"
        },
        "Pakistan": {
            recent: "#016101",
            previous: "#5be45b"
        },
        "Bangladesh": {
            recent: "#00008B",
            previous: "#4169E1"
        },
        "Sri Lanka": {
            recent: "#f3af04",
            previous: "#edd848"
        },
        "Nepal": {
            recent: "#8B008B",
            previous: "#BA55D3"
        },
        "Bhutan": {
            recent: "#037f8a",
            previous: "#33d8cc"
        },
        "Afghanistan": {
            recent: "#D35400",
            previous: "#FF8C00"
        },
        "Maldives": {
            recent: "#3f0082",
            previous: "#936fef"
        },
        "SARw/oIndia": {
            recent: "#273e50",
            previous: "#727b91"
        },
        "South Asia Region": {
            recent: "#9a6203",      // Antique bronze
            previous: "#d5c492"     // Metallic gold
        }
    };

    if (yearColors[country]) {
        return parseInt(yearType) === parseInt(recent) ?
            yearColors[country].recent :
            yearColors[country].previous;
    }
    return "#cccccc";
}

// Function to get the flag URL for each country
// Update getFlagUrl to use local images for special regions
function getFlagUrl(country) {
    const flagUrls = {
        "India": "https://flagcdn.com/in.svg",
        "Pakistan": "https://flagcdn.com/pk.svg",
        "Bangladesh": "https://flagcdn.com/bd.svg",
        "Sri Lanka": "https://flagcdn.com/lk.svg",
        "Nepal": "https://flagcdn.com/np.svg",
        "Bhutan": "https://flagcdn.com/bt.svg",
        "Afghanistan": "https://flagcdn.com/af.svg",
        "Maldives": "https://flagcdn.com/mv.svg",
        // Use local assets for special regions
        "SARw/oIndia": "/static/Assets/SAR%20wo%20India.jpeg",
        "South Asia Region": "/static/Assets/SAR.jpeg"
    };

    return flagUrls[country];
}

function calculateRankings(data, sortOption) {
    const rankings = {};

    // First pass: Collect data for ranking
    Object.entries(data).forEach(([country, yearData]) => {
        // Skip regional aggregates
        if (country === "South Asia Region" || country === "SARw/oIndia") return;

        Object.entries(yearData).forEach(([yearType, indicators]) => {
            indicators.forEach(item => {
                if (item.Country === country) { // Only use country-specific data
                    const key = sortOption === 'year'
                        ? `${item.Indicator}_${yearType}` // Group by year
                        : `${item.Indicator}_${country}`; // Group by country

                    if (!rankings[key]) {
                        rankings[key] = [];
                    }

                    rankings[key].push({
                        country,
                        yearType: parseInt(yearType),
                        indicator: item.Indicator,
                        value: item.Value_Standardized_Table,
                        formattedValue: formatValue(item.Value_Map, item.Percent_Number),
                        originalData: item
                    });
                }
            });
        });
    });

    // Second pass: Calculate rankings
    Object.keys(rankings).forEach(key => {
        if (sortOption === 'year') {
            // Sort within each year-indicator group
            rankings[key].sort((a, b) => b.value - a.value);
            rankings[key].forEach((item, index) => {
                item.rank = index + 1;
                item.totalInGroup = rankings[key].length;
            });
        } else {
            // For country sort, handle each country's measurements separately
            const countryGroups = {};
            rankings[key].forEach(item => {
                if (!countryGroups[item.country]) {
                    countryGroups[item.country] = [];
                }
                countryGroups[item.country].push(item);
            });

            Object.values(countryGroups).forEach(countryItems => {
                countryItems.sort((a, b) => b.value - a.value);
                countryItems.forEach((item, index) => {
                    item.rank = index + 1;
                    item.totalInGroup = countryItems.length;
                });
            });
        }
    });

    return rankings;
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
        countryYearTypes = {}; // Initialize countryYearTypes

        // Store the complete original objects
        data.forEach((scorecardItem) => {
            const { Group_Name, Country, Year_Type } = scorecardItem;

            const group = globalData[Group_Name] || (globalData[Group_Name] = {});
            const country = group[Country] || (group[Country] = {});
            const yearType = country[Year_Type] || (country[Year_Type] = []);

            if (scorecardItem.Value_Standardized !== null && !isNaN(scorecardItem.Value_Standardized)) {
                // Store the entire original object
                yearType.push(scorecardItem);
            }

            // Collect available year types per country
            if (!countryYearTypes[Country]) {
                countryYearTypes[Country] = new Set();
            }
            countryYearTypes[Country].add(Year_Type);
        });

        // Populate allIndicators with unique indicators
        allIndicators = Array.from(new Set(data.map(d => d.Indicator))).sort();

        createCategoryButtons();
        populateFlagSelections();

    } catch (error) {
        console.error('Error fetching scorecard indicators:', error);
    }
}

// Create category buttons
function createCategoryButtons() {
    let categories = Object.keys(globalData);

    // Add combined category
    categories = categories.filter(cat => !["Prosperity", "Digital", "Infrastructure"].includes(cat));
    categories.push("Prosperity, Digital, and Infrastructure");

    const categoryContainer = document.getElementById("categoryContainer");
    categoryContainer.innerHTML = ''; // Clear existing buttons

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

// Helper function to format values with commas and percentages
function formatValue(value, needsPercent = false) {
    if (value === null || value === undefined) return '';

    // Try to parse the value as a number
    let numValue;
    if (typeof value === 'string') {
        // Remove any existing commas and percentage signs before parsing
        numValue = parseFloat(value.replace(/,/g, '').replace(/%/g, ''));
    } else {
        numValue = parseFloat(value);
    }

    if (isNaN(numValue)) return value; // Return original value if not a number

    // Format the number with commas and proper decimal places
    let formattedValue;
    if (Math.abs(numValue) >= 1000) {
        // For large numbers, use locale string with 1 decimal place
        formattedValue = numValue.toLocaleString('en-US', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
    } else {
        // For smaller numbers, show 1 decimal place
        formattedValue = numValue.toFixed(1);
    }

    // Add percentage sign if needed
    return needsPercent ? `${formattedValue}%` : formattedValue;
}

// Highlight the selected category button
function highlightSelectedButton(selectedButton) {
    const buttons = document.querySelectorAll('.category-button');
    buttons.forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');
}

function highlightSortButton(selectedButton) {
    const buttons = document.querySelectorAll('.table-controls button.sort-button');
    buttons.forEach(button => button.classList.remove('selected'));
    selectedButton.classList.add('selected');
}

// Populate flag selections and add year buttons dynamically
function populateFlagSelections() {
    const flagContainer = document.getElementById("flagSelections");
    const countries = [
        "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
        "Bhutan", "Afghanistan", "Maldives", "SARw/oIndia", "South Asia Region"
    ];
    flagContainer.innerHTML = '';
    allCirclesData = [];

    countries.forEach(country => {
        const flagDiv = document.createElement("div");
        flagDiv.classList.add("flag-item");
        flagDiv.style.display = "flex";
        flagDiv.style.alignItems = "center";

        const flagImageContainer = document.createElement("div");
        flagImageContainer.classList.add("flag-image-container");

        const flagImage = document.createElement("img");
        flagImage.src = getFlagUrl(country);
        flagImage.alt = country;
        flagImageContainer.appendChild(flagImage);

        const countryLabel = document.createElement("div");
        countryLabel.classList.add("country-label");
        countryLabel.textContent = country;
        flagImageContainer.appendChild(countryLabel);

        selectedCountryYears[country] = new Set();

        const availableYearTypes = Array.from(countryYearTypes[country] || [])
            .sort((a, b) => b - a)
            .slice(0, 2);

        const yearTypeToLabel = {};
        availableYearTypes.forEach((yearType, index) => {
            yearTypeToLabel[yearType] = index === 0 ? 'Recent' : 'Previous';
        });

        const yearButtonsContainer = document.createElement("div");
        yearButtonsContainer.classList.add("year-buttons-container");

        availableYearTypes.forEach((yearType) => {
            const measurementLabel = yearTypeToLabel[yearType];
            const yearButton = document.createElement("button");
            yearButton.textContent = measurementLabel;
            yearButton.classList.add("year-button");
            yearButton.dataset.yearType = yearType;
            yearButton.dataset.measurementLabel = measurementLabel;
            yearButton.style.backgroundColor = "#f0f0f0";

            // Add event listeners
            yearButton.addEventListener("mouseenter", handleYearButtonEnter);
            yearButton.addEventListener("mouseleave", handleYearButtonLeave);
            yearButton.addEventListener("click", function() {
                const wasSelected = this.classList.contains("selected");
                this.classList.toggle("selected");
                const year = parseInt(this.dataset.yearType, 10);
                const country = this.closest('.flag-item').querySelector('img').alt;

                if (!wasSelected) {
                    mostRecentSelection = { country, yearType: year };
                    selectedCountryYears[country].add(year);
                    this.style.backgroundColor = getCountryYearColor(country, year);
                    triggerRadarAnimation(country, year);
                } else {
                    if (mostRecentSelection &&
                        mostRecentSelection.country === country &&
                        mostRecentSelection.yearType === year) {
                        mostRecentSelection = null;
                    }
                    selectedCountryYears[country].delete(year);
                    this.style.backgroundColor = "#f0f0f0";
                }
                filterData();
            });

            yearButtonsContainer.appendChild(yearButton);
        });

        flagDiv.appendChild(flagImageContainer);
        flagDiv.appendChild(yearButtonsContainer);
        flagContainer.appendChild(flagDiv);

        // Add flag image click handler
        flagImage.addEventListener("click", (event) => handleFlagImageClick(event, country, flagDiv));
    });
}

function handleYearButtonEnter(event, customCountry, customYearType) {
    // Get country and yearType either from button or from custom parameters
    const country = customCountry || event.target.closest('.flag-item').querySelector('img').alt;
    const yearType = customYearType || event.target.dataset.yearType;

    // Only adjust font size if it's a button event
    if (!customCountry) {
        event.target.style.fontSize = "16px";
    }

    // Update all radar areas and strokes
    d3.selectAll('.radarArea').each(function() {
        const area = d3.select(this);
        const areaDataId = area.attr('data-id');
        const isTarget = areaDataId === `${country}|${yearType}`;

        area.transition()
            .duration(200)
            .style('fill-opacity', isTarget ? 0.6 : 0.02);

        d3.select(`.radarStroke[data-id="${areaDataId}"]`)
            .transition()
            .duration(200)
            .style('stroke-width', isTarget ? '4px' : '1px')
            .style('stroke-opacity', isTarget ? 1 : 0.1);
    });

    // Update the circles and labels
    d3.selectAll('.radarCircle').each(function(d) {
        if (!d) return;

        const circle = d3.select(this);
        const currentId = circle.attr("data-id");
        const [circleCountry, circleYear] = currentId.split('|');

        const isTarget = circleCountry === country && circleYear === yearType;

        circle.transition()
            .duration(200)
            .attr("r", isTarget ? 6 : 2)
            .style("fill", isTarget ? "orange" : d.countryColor)
            .style("opacity", isTarget ? 0.8 : 0.1);

        const textGroup = d3.select(`.text-group[data-id="${currentId}"]`);
        if (textGroup.empty()) return;

        if (isTarget) {
            textGroup.raise();
            textGroup.select('.radarText-background')
                .transition()
                .duration(200)
                .style("opacity", 1);

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("font-size", "16px")
                .style("opacity", 1);

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("stroke-width", "2px")
                .style("opacity", 1);
        } else {
            textGroup.select('.radarText-background')
                .transition()
                .duration(200)
                .style("opacity", 0);

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("opacity", 0);

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("opacity", 0);
        }
    });
}

function handleYearButtonLeave(event, customCountry, customYearType) {
    // Reset font size only if it's a button event
    if (!customCountry) {
        event.target.style.fontSize = "";
    }

    // Reset radar appearance for all elements
    resetRadarAppearance();
}

function handleFlagImageClick(event, country, flagDiv) {
    const flagImage = event.target;

    // Find all year buttons for this country
    const yearButtons = flagDiv.querySelectorAll('.year-button');

    if (selectedCountries.has(country)) {
        // Deselecting the country
        selectedCountries.delete(country);
        flagImage.classList.remove("selected");
        flagDiv.classList.remove("selected");

        // Clear year selections and reset button appearances
        yearButtons.forEach(button => {
            button.classList.remove("selected");
            button.style.backgroundColor = "#f0f0f0";
        });

        // Remove from selectedCountryYears
        delete selectedCountryYears[country];

        // Clear animation state
        window.currentAnimation = null;
        mostRecentSelection = null;
    } else {
        // Selecting the country
        selectedCountries.add(country);
        flagImage.classList.add("selected");
        flagDiv.classList.add("selected");

        // Initialize selectedCountryYears for this country
        selectedCountryYears[country] = new Set();

        // Check which year buttons were selected before (Recent/Previous buttons state)
        const recentButton = document.getElementById('recentMeasurementButton');
        const previousButton = document.getElementById('previousMeasurementButton');

        // Get available years for this country
        const availableYears = Array.from(countryYearTypes[country] || [])
            .sort((a, b) => b - a);

        yearButtons.forEach(button => {
            const yearType = parseInt(button.dataset.yearType);
            const measurementLabel = button.dataset.measurementLabel;

            // Check if this button should be selected based on Recent/Previous button states
            const shouldSelect = (measurementLabel === 'Recent' && recentButton.classList.contains('selected')) ||
                (measurementLabel === 'Previous' && previousButton.classList.contains('selected'));

            if (shouldSelect && yearType) {
                button.classList.add('selected');
                button.style.backgroundColor = getCountryYearColor(country, yearType);
                selectedCountryYears[country].add(yearType);

                // Set up animation state for the most recent selection
                if (!window.currentAnimation) {
                    window.currentAnimation = {
                        id: `${country}_${yearType}_${Date.now()}`,
                        inProgress: true,
                        items: []
                    };
                }
                window.currentAnimation.items.push({
                    country: country,
                    yearType: yearType
                });
            }
        });

        // Set mostRecentSelection if we have any selections
        if (selectedCountryYears[country].size > 0) {
            mostRecentSelection = {
                country: country,
                yearType: Array.from(selectedCountryYears[country])[0],
                animationId: window.currentAnimation?.id
            };
        }
    }

    filterData();
}

// Filtering the data based on the selected year type, category, and countries, and updating the radar chart and table
function filterData() {
    console.log("Filtering data based on selected countries, years, and category...");

    filteredData = {};

    const selectedGroup = selectedCategory === "Prosperity, Digital, and Infrastructure"
        ? ["Prosperity", "Digital", "Infrastructure"]
        : [selectedCategory];

    const rankings = {};

    // Collect unique indicators
    let filteredIndicatorsSet = new Set();
    selectedGroup.forEach(groupName => {
        if (globalData[groupName]) {
            Object.values(globalData[groupName]).forEach(countryData => {
                Object.values(countryData).forEach(yearTypeData => {
                    yearTypeData.forEach(scorecardItem => {
                        if (scorecardItem.Indicator) {
                            filteredIndicatorsSet.add(scorecardItem.Indicator);
                        }
                    });
                });
            });
        }
    });

    filteredIndicators = Array.from(filteredIndicatorsSet).sort();

    // Filter and organize data
    Array.from(selectedCountries).forEach(country => {
        filteredData[country] = {};

        selectedCountryYears[country].forEach(yearType => {
            let dataList = [];
            let rankingDataList = []; // Separate list for ranking calculations

            selectedGroup.forEach(groupName => {
                if (globalData[groupName]?.[country]?.[yearType]) {
                    const yearData = globalData[groupName][country][yearType];
                    yearData.forEach(item => {
                        // Include all data points for visualization
                        if (item.Country === "SARw/oIndia" ||
                            item.Country === "India" ||
                            item.Country === country) {
                            dataList.push(item);
                        }

                        // Only include country-specific data for rankings
                        if (item.Country === country) {
                            rankingDataList.push(item);
                        }
                    });
                }
            });

            if (dataList.length > 0) {
                filteredData[country][yearType] = dataList;

                // Create rankings using only country-specific data
                rankingDataList.forEach(scorecardItem => {
                    let key;
                    if (tableSortOption === 'indicator') {
                        key = `${scorecardItem.Indicator}_${yearType}`;
                    } else if (tableSortOption === 'country') {
                        key = `${scorecardItem.Indicator}_${country}`;
                    }

                    if (!rankings[key]) {
                        rankings[key] = [];
                    }

                    rankings[key].push({
                        country: country,
                        value: scorecardItem.Value_Standardized_Table,
                        formattedValue: formatValue(scorecardItem.Value_Map, scorecardItem.Percent_Number),
                        rank: null,
                        originalData: scorecardItem
                    });
                });
            }
        });
    });

    // Sort and assign ranks
    Object.keys(rankings).forEach(key => {
        rankings[key].sort((a, b) => b.value - a.value);
        rankings[key].forEach((item, index) => {
            item.rank = index + 1;
        });
    });

    globalData.rankings = calculateRankings(filteredData, tableSortOption);

    // Update visualizations
    updateRadarChart(selectedGroup, mostRecentSelection);
    updateTable(Array.from(selectedCountries), selectedGroup);

    updateAllLabelsVisibility();
}

function animateRadarStroke(radarStroke, radarArea) {
    // Ensure the elements exist
    if (!radarStroke.node() || !radarArea.node()) return;

    const totalLength = radarStroke.node().getTotalLength();

    // Store original color for restoration
    const originalColor = radarStroke.style("stroke");
    const originalStrokeWidth = radarStroke.style("stroke-width");

    // Initial state for animation
    radarArea
        .style("fill-opacity", 0);

    radarStroke
        .style("stroke-opacity", 1)
        .style("stroke-width", "3px")
        .style("stroke-dasharray", `${totalLength} ${totalLength}`)
        .style("stroke-dashoffset", totalLength)
        .classed('animating', true);

    // Create the animation
    radarStroke
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .style("stroke-dashoffset", 0)
        .on("end", function() {
            // Cleanup after animation
            d3.select(this)
                .style("stroke-dasharray", null)
                .style("stroke-dashoffset", null)
                .classed('animating', false)
                .style("stroke", originalColor)
                .style("stroke-width", originalStrokeWidth)
                .style("stroke-opacity", 1);

            // Fade in the area
            radarArea
                .transition()
                .duration(400)
                .style("fill-opacity", 0.3);

            // Reset animation state
            if (window.currentAnimation) {
                window.currentAnimation.inProgress = false;
            }
        })
        .on("interrupt", function() {
            // Cleanup if interrupted
            d3.select(this)
                .style("stroke-dasharray", null)
                .style("stroke-dashoffset", null)
                .classed('animating', false)
                .style("stroke", originalColor)
                .style("stroke-width", originalStrokeWidth)
                .style("stroke-opacity", 1);

            radarArea
                .style("fill-opacity", 0.3);

            if (window.currentAnimation) {
                window.currentAnimation.inProgress = false;
            }
        });
}
function triggerRadarAnimation(country, yearType) {
    if (!country || !yearType) return;

    // Set up animation state
    window.currentAnimation = {
        id: `${country}_${yearType}_${Date.now()}`,
        inProgress: true,
        items: [{ country, yearType }]
    };

    // Force an immediate redraw to start the animation
    filterData();
}
    
// Function to update the radar chart based on the filtered data
function updateRadarChart(selectedGroup, mostRecentSelection) {
    const svgWidth = 600;
    const svgHeight = 700;
    const radius = svgWidth / 2 - 60;
    const levels = 10;

    // Clear all existing data
    allCirclesData = [];
    
    // Clear existing elements before redrawing
    d3.select("#chart svg g#radarGroup").selectAll("*").remove();
    d3.selectAll(".text-group").remove();
    // Create or select main SVG group
    let svgRadar = d3.select("#chart svg g#radarGroup");
    if (svgRadar.empty()) {
        svgRadar = d3.select("#chart svg")
            .attr("width", svgWidth)
            .attr("height", svgHeight)
            .append("g")
            .attr("id", "radarGroup")
            .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);
    }

    // Create or select layers
    let areasLayer = svgRadar.select('.areas-layer');
    if (areasLayer.empty()) {
        areasLayer = svgRadar.append('g').attr('class', 'areas-layer');
    }

    let axesLayer = svgRadar.select('.axes-layer');
    if (axesLayer.empty()) {
        axesLayer = svgRadar.append('g').attr('class', 'axes-layer');
    }

    let circlesLabelsLayer = svgRadar.select('.circles-labels-layer');
    if (circlesLabelsLayer.empty()) {
        circlesLabelsLayer = svgRadar.append('g').attr('class', 'circles-labels-layer');
    }

    // Clear existing elements
    areasLayer.selectAll("*").remove();
    axesLayer.selectAll("*").remove();
    circlesLabelsLayer.selectAll("*").remove();
    d3.selectAll(".text-group").remove(); // Remove all existing text groups


    const indicatorsToUse = filteredIndicators;

    if (indicatorsToUse.length === 0) {
        console.log("No indicators to display in the radar chart.");
        svgRadar.selectAll("*").remove();
        return;
    }

    const rScale = d3.scaleLinear().range([0, radius]).domain([0, 100]);
    const angleSlice = Math.PI * 2 / indicatorsToUse.length;

    // Draw levels (circles) in axes layer
    for (let i = 0; i < levels; i++) {
        const levelFactor = radius * ((i + 1) / levels);
        axesLayer.selectAll(".levels")
            .data([1])
            .enter()
            .append("circle")
            .attr("r", levelFactor)
            .style("fill", "none")
            .style("stroke", "gray")
            .style("stroke-opacity", 0.75)
            .style("stroke-width", 0.3);
    }

    // Draw axes in axes layer
    const axis = axesLayer.selectAll(".axis")
        .data(indicatorsToUse)
        .enter()
        .append("g")
        .attr("class", "axis");

    axis.append("line")
        .attr("x1", 0)
        .attr("y1", 0)
        .attr("x2", (d, i) => rScale(100 * 1.05) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y2", (d, i) => rScale(100 * 1.05) * Math.sin(angleSlice * i - Math.PI / 2))
        .style("stroke", "gray")
        .style("stroke-width", "2px");

    // Draw axis labels
    axis.append("text")
        .attr("class", "axisLabel")
        .style("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("x", (d, i) => rScale(100 * 1.4) * Math.cos(angleSlice * i - Math.PI / 2))
        .attr("y", (d, i) => rScale(100 * 1.4) * Math.sin(angleSlice * i - Math.PI / 2))
        .attr("dy", (d, i) => {
            const angle = angleSlice * i - Math.PI / 2;
            return (Math.abs(angle - Math.PI / 2) < 0.01) ? "-2em" : "0em";
        })
        .text(d => d)
        .call(wrap, 150)
        .on("mouseover", function(event, d) {
            handleAxisLabelHover(event, d, this);
        })
        .on("mouseout", function(event, d) {
            handleAxisLabelOut(event, d, this);
        });

    // Prepare radar data
    const radarData = [];
    allCirclesData = [];

    Object.keys(filteredData).forEach(country => {
        Object.keys(filteredData[country]).forEach(yearType => {
            radarData.push({
                key: `${country}_${yearType}`,
                country,
                yearType,
                data: filteredData[country][yearType],
                isMostRecent: mostRecentSelection &&
                    mostRecentSelection.country === country &&
                    mostRecentSelection.yearType === parseInt(yearType)
            });
        });
    });

    // Draw radar areas and strokes in areas layer
    const radarWrappers = areasLayer.selectAll(".radarWrapper")
        .data(radarData, d => d.key);

    radarWrappers.exit().remove();

    const radarWrappersEnter = radarWrappers.enter()
        .append("g")
        .attr("class", "radarWrapper");

    const radarWrappersMerged = radarWrappersEnter.merge(radarWrappers);

    // Draw circles and labels in top layer
    radarWrappersMerged.each(function(dataObj) {
        // Create separate wrapper for this country/year in the circles-labels layer
        const circlesLabelsWrapper = circlesLabelsLayer.append("g")
            .attr("class", "circles-labels-wrapper");

        // Draw radar path in areas layer
        drawRadarChartForCountryYear(
            d3.select(this), // for areas and strokes
            circlesLabelsWrapper, // for circles and labels
            dataObj,
            rScale,
            angleSlice,
            indicatorsToUse,
            allCirclesData
        );
    });

    // Create a new layer for the labels if it doesn't exist
    let labelsLayer = d3.select("#chart svg g#labelsLayer");
    if (labelsLayer.empty()) {
        labelsLayer = d3.select("#chart svg")
            .append("g")
            .attr("id", "labelsLayer")
            .attr("transform", `translate(${svgWidth / 2}, ${svgHeight / 2})`);
    }

    // Move all label groups to the labels layer
    circlesLabelsLayer.selectAll(".text-group").each(function() {
        labelsLayer.node().appendChild(this);
    });

    // Ensure labelsLayer is on top
    labelsLayer.raise();

    // Adjust label positions
    setTimeout(() => {
        adjustLabelPositions(allCirclesData, radius, angleSlice, rScale, allCirclesData);
        // Force a second adjustment after a brief delay to handle any remaining issues
        setTimeout(() => {
            adjustLabelPositions(allCirclesData, radius, angleSlice, rScale, allCirclesData);
        }, 50);
    }, 10);
    // Update all labels visibility and interactions
    updateAllLabelsVisibility();
}


function handleAxisLabelHover(event, hoveredIndicator, labelElement) {
    // Complete any in-progress animations first
    completeAnimations();

    // Highlight the axis line and label
    const axisGroup = d3.select(labelElement.parentNode);
    axisGroup.select('line')
        .transition()
        .duration(200)
        .style('stroke-width', '4px')
        .style('stroke', '#6c6c6c');

    d3.select(labelElement)
        .transition()
        .duration(200)
        .style("font-size", "16px")
        .style("font-weight", "bold");

    // Store current visibility state
    const currentShowRadarValues = showRadarValues;

    // Process all data points
    d3.selectAll('.radarCircle').each(function(circleData) {
        if (!circleData || !circleData.data) return;

        const circle = d3.select(this);
        const dataId = circle.attr("data-id");
        if (!dataId) return;

        const isTarget = circleData.data.Indicator === hoveredIndicator;

        // Get corresponding text group
        const textGroup = d3.select(`.text-group[data-id="${dataId}"]`);
        if (textGroup.empty()) return;

        if (isTarget) {
            // Highlight matching elements
            circle
                .transition()
                .duration(200)
                .attr("r", 6)
                .style("fill", "orange")
                .style("opacity", 0.8);

            // Show and enhance target labels, regardless of showRadarValues
            textGroup.select('.radarText-background')
                .transition()
                .duration(200)
                .style("opacity", 1);

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("opacity", 1)
                .style("font-size", "16px")
                .style("font-weight", "bold");

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("stroke-width", "2px")
                .style("opacity", 1);

            // Raise the text group to ensure it's on top
            textGroup.raise();
        } else {
            // Dim non-matching elements
            circle
                .transition()
                .duration(200)
                .attr("r", 4)
                .style("fill", circleData.countryColor)
                .style("opacity", 0.1);

            // Hide non-matching labels completely
            textGroup.select('.radarText-background')
                .transition()
                .duration(200)
                .style("opacity", 0);

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("opacity", 0);

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("opacity", 0);
        }
    });

    // Dim all radar areas and strokes
    d3.selectAll('.radarWrapper').each(function() {
        const wrapper = d3.select(this);
        wrapper.select('.radarArea')
            .transition()
            .duration(200)
            .style('fill-opacity', 0.05);

        wrapper.select('.radarStroke')
            .transition()
            .duration(200)
            .style('stroke-opacity', 0.5);
    });
}

// Update the axis label mouseout handler
function handleAxisLabelOut(event, hoveredIndicator, labelElement) {
    // Reset the axis line and label appearance
    const axisGroup = d3.select(labelElement.parentNode);
    axisGroup.select('line')
        .transition()
        .duration(200)
        .style('stroke-width', '2px')
        .style('stroke', 'gray');

    d3.select(labelElement)
        .transition()
        .duration(200)
        .style("font-size", "14px")
        .style("font-weight", "normal");

    // Reset radar areas and strokes
    d3.selectAll('.radarWrapper').each(function() {
        const wrapper = d3.select(this);
        const wrapperData = wrapper.datum();
        if (wrapperData) {
            const countryColor = getCountryYearColor(wrapperData.country, wrapperData.yearType);

            wrapper.select('.radarArea')
                .transition()
                .duration(200)
                .style('fill', countryColor)
                .style('fill-opacity', 0.3);

            wrapper.select('.radarStroke')
                .transition()
                .duration(200)
                .style('stroke', countryColor)
                .style('stroke-width', '2px')
                .style('stroke-opacity', 1);
        }
    });

    // Reset all circles and labels to their default state
    d3.selectAll('.radarCircle').each(function(circleData) {
        if (!circleData) return;

        const circle = d3.select(this);
        circle.transition()
            .duration(200)
            .attr("r", 4)
            .style("fill", circleData.countryColor)  // Use stored country color
            .style("opacity", 0.8);

        const dataId = circle.attr("data-id");
        if (!dataId) return;

        const textGroup = d3.select(`.text-group[data-id="${dataId}"]`);
        if (textGroup.empty()) return;

        const baseOpacity = showRadarValues ? 1 : 0;

        // Reset label background (always hidden by default)
        textGroup.select('.radarText-background')
            .transition()
            .duration(200)
            .style("opacity", 0);

        // Reset main text
        textGroup.select('.radarText')
            .transition()
            .duration(200)
            .style("opacity", baseOpacity)
            .style("font-size", "14px")
            .style("font-weight", "normal")
            .style("fill", d3.hsl(circleData.countryColor).darker(1));  // Use stored country color

        // Reset leader line
        textGroup.select('.leaderLine')
            .transition()
            .duration(200)
            .style("stroke-width", "0.5px")
            .style("stroke", circleData.countryColor)
            .style("opacity", baseOpacity);
    });
}

// Function to create labels with proper styling
function createLabels(labelGroup, scorecardItem, cx, cy, countryColor, uniqueId) {
    const labelOpacity = showRadarValues ? 1 : 0;
    const labelOffset = 20;
    const angle = Math.atan2(cy, cx);
    const offsetX = Math.cos(angle) * labelOffset;
    const offsetY = Math.sin(angle) * labelOffset;

    // Remove any existing text groups for this uniqueId
    d3.selectAll(`.text-group[data-id="${uniqueId}"]`).remove();

    const textGroup = labelGroup.append("g")
        .attr("class", "text-group")
        .attr("data-id", uniqueId)
        .style("pointer-events", showRadarValues ? "all" : "none")
        .datum({
            data: scorecardItem,
            countryColor: countryColor
        });

    const textX = cx + offsetX * 1.2;
    const textY = cy + offsetY * 1.2;
    const formattedValue = formatValue(scorecardItem.Value_Map, scorecardItem.Percent_Number);

    // Leader line (never receives events)
    const leaderLine = textGroup.append("line")
        .attr("class", "leaderLine")
        .attr("data-id", uniqueId)
        .attr("x1", cx)
        .attr("y1", cy)
        .attr("x2", textX)
        .attr("y2", textY)
        .style("stroke", countryColor)
        .style("stroke-width", "0.5px")
        .style("opacity", labelOpacity)
        .style("pointer-events", "none");

    // Background text (never receives events)
    const textBackground = textGroup.append("text")
        .attr("class", "radarText-background")
        .attr("data-id", uniqueId)
        .attr("x", textX)
        .attr("y", textY)
        .text(formattedValue)
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("fill", "white")
        .style("stroke", "white")
        .style("stroke-width", "5px")
        .style("opacity", 0)
        .style("pointer-events", "none");

    // Main text (receives events only when values are shown)
    const mainText = textGroup.append("text")
        .attr("class", "radarText")
        .attr("data-id", uniqueId)
        .attr("x", textX)
        .attr("y", textY)
        .text(formattedValue)
        .style("font-size", "14px")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("fill", d3.hsl(countryColor).darker(1))
        .style("opacity", labelOpacity)
        .style("pointer-events", showRadarValues ? "all" : "none")
        .style("cursor", showRadarValues ? "pointer" : "default");

    if (showRadarValues) {
        mainText
            .on("mouseenter.textHighlight", function(event) {
                event.stopPropagation();

                // Extract country and year from uniqueId
                const [country, yearType] = uniqueId.split("|");

                // Update radar appearance first
                updateRadarAppearance(country, yearType, true);

                // Show tooltip
                showTooltipForCircle(event, textGroup.datum());

                // Highlight text and show background
                mainText
                    .transition()
                    .duration(200)
                    .style("font-size", "16px")
                    .style("font-weight", "bold");

                textBackground
                    .transition()
                    .duration(200)
                    .style("opacity", 1);

                leaderLine
                    .transition()
                    .duration(200)
                    .style("stroke-width", "2px");
            })
            .on("mouseleave.textHighlight", function(event) {
                event.stopPropagation();

                resetRadarAppearance();
                hideTooltip();

                mainText
                    .transition()
                    .duration(200)
                    .style("font-size", "14px")
                    .style("font-weight", "normal");

                textBackground
                    .transition()
                    .duration(200)
                    .style("opacity", 0);

                leaderLine
                    .transition()
                    .duration(200)
                    .style("stroke-width", "0.5px");
            });
    }

    return {
        textGroup,
        leaderLine,
        mainText,
        textBackground
    };
}

function updateAllLabelsVisibility() {
    d3.selectAll('.text-group').each(function() {
        const group = d3.select(this);
        const baseOpacity = showRadarValues ? 1 : 0;

        // Remove all existing event listeners
        group.selectAll('.radarText')
            .on('.textHighlight', null);

        // Update pointer events and visibility for the entire group
        group
            .style("pointer-events", showRadarValues ? "all" : "none")
            .style("cursor", showRadarValues ? "pointer" : "default");

        // Background text is always hidden by default
        group.select('.radarText-background')
            .transition()
            .duration(200)
            .style("opacity", 0)
            .style("pointer-events", "none");

        // Update main text
        const mainText = group.select('.radarText');
        mainText
            .transition()
            .duration(200)
            .style("opacity", baseOpacity)
            .style("font-size", "14px")
            .style("font-weight", "normal")
            .style("pointer-events", showRadarValues ? "all" : "none");

        // Reattach event listeners if values are shown
        if (showRadarValues) {
            const uniqueId = group.attr("data-id");
            mainText
                .on("mouseenter.textHighlight", function(event) {
                    event.stopPropagation();
                    const [country, yearType] = uniqueId.split("|");
                    updateRadarAppearance(country, yearType, true);
                    showTooltipForCircle(event, group.datum());
                })
                .on("mouseleave.textHighlight", function(event) {
                    event.stopPropagation();
                    resetRadarAppearance();
                    hideTooltip();
                });
        }

        // Update leader line
        group.select('.leaderLine')
            .transition()
            .duration(200)
            .style("stroke-width", "0.5px")
            .style("opacity", baseOpacity)
            .style("pointer-events", "none");
    });

    // Make sure circles remain interactive
    d3.selectAll('.radarCircle')
        .style("pointer-events", "all")
        .raise();
}

function updateRadarAppearance(targetCountry, targetYear, isHover) {
    // Complete any in-progress animations first
    completeAnimations();

    // Update all radar wrappers
    d3.selectAll('.radarWrapper').each(function() {
        const wrapper = d3.select(this);
        const area = wrapper.select('.radarArea');
        const stroke = wrapper.select('.radarStroke');
        const areaData = area.datum();

        if (!areaData) return;

        const currentCountry = areaData[0]?.Country || areaData.Country;
        const currentYear = areaData[0]?.Year_Type || areaData.Year_Type;

        if (!currentCountry || !currentYear) return;

        const isTarget = currentCountry === targetCountry &&
            currentYear.toString() === targetYear.toString();

        const countryColor = getCountryYearColor(currentCountry, currentYear);

        if (isHover) {
            area.transition()
                .duration(200)
                .style('fill', countryColor)
                .style('fill-opacity', isTarget ? 0.6 : 0.05);

            stroke.transition()
                .duration(200)
                .style('stroke', countryColor)
                .style('stroke-width', isTarget ? '4px' : '1px')
                .style('stroke-opacity', isTarget ? 1 : 0.3);

            if (isTarget) {
                wrapper.raise();
            }
        } else {
            area.transition()
                .duration(200)
                .style('fill', countryColor)
                .style('fill-opacity', 0.3);

            stroke.transition()
                .duration(200)
                .style('stroke', countryColor)
                .style('stroke-width', '2px')
                .style('stroke-opacity', 1);
        }
    });

    // Update circles and labels
    d3.selectAll('.radarCircle').each(function() {
        const circle = d3.select(this);
        const circleData = circle.datum();
        if (!circleData) return;

        const dataId = circle.attr("data-id");
        if (!dataId) return;

        const [circleCountry, circleYear] = dataId.split('|');
        const isTarget = circleCountry === targetCountry &&
            circleYear.toString() === targetYear.toString();

        circle.transition()
            .duration(200)
            .attr("r", isHover ? (isTarget ? 6 : 4) : 4)
            .style("fill", isHover && isTarget ? "orange" : circleData.countryColor)
            .style("opacity", isHover ? (isTarget ? 0.8 : 0.1) : 0.8);

        // Update associated text group only if showRadarValues is true
        const textGroup = d3.select(`.text-group[data-id="${dataId}"]`);
        if (!textGroup.empty() && showRadarValues) {
            const baseOpacity = showRadarValues ? 1 : 0;

            if (isHover) {
                if (isTarget) {
                    textGroup.raise();
                    textGroup.select('.radarText-background')
                        .transition()
                        .duration(200)
                        .style("opacity", 1);

                    textGroup.select('.radarText')
                        .transition()
                        .duration(200)
                        .style("opacity", 1)
                        .style("font-size", "16px")
                        .style("font-weight", "bold");

                    textGroup.select('.leaderLine')
                        .transition()
                        .duration(200)
                        .style("stroke", circleData.countryColor)
                        .style("stroke-width", "2px")
                        .style("opacity", 1);
                } else {
                    textGroup.select('.radarText-background')
                        .transition()
                        .duration(200)
                        .style("opacity", 0);

                    textGroup.select('.radarText')
                        .transition()
                        .duration(200)
                        .style("opacity", 0.1);

                    textGroup.select('.leaderLine')
                        .transition()
                        .duration(200)
                        .style("opacity", 0.1);
                }
            } else {
                textGroup.select('.radarText-background')
                    .transition()
                    .duration(200)
                    .style("opacity", 0);

                textGroup.select('.radarText')
                    .transition()
                    .duration(200)
                    .style("opacity", baseOpacity)
                    .style("font-size", "14px")
                    .style("font-weight", "normal");

                textGroup.select('.leaderLine')
                    .transition()
                    .duration(200)
                    .style("stroke", circleData.countryColor)
                    .style("stroke-width", "0.5px")
                    .style("opacity", baseOpacity);
            }
        }
    });
}

// Helper function to dim other elements



function hideTooltip() {
    const tooltip = d3.select(".tooltip");
    tooltip
        .style("display", "none")
        .style("opacity", 0);
}


// Function to get bounding box for a label
// Function to get bounding box for a label
function getLabelBounds(label) {
    // Wait for the label to be fully rendered
    if (!label.node()) return null;

    // Force a reflow to ensure accurate dimensions
    label.node().getBBox(); // Force reflow

    const bounds = label.node().getBBox();
    return {
        left: parseFloat(label.attr("x")) - bounds.width / 2,
        right: parseFloat(label.attr("x")) + bounds.width / 2,
        top: parseFloat(label.attr("y")) - bounds.height / 2,
        bottom: parseFloat(label.attr("y")) + bounds.height / 2,
        width: bounds.width,
        height: bounds.height,
        x: parseFloat(label.attr("x")),
        y: parseFloat(label.attr("y"))
    };
}

// Function to get axis label bounds
function getAxisLabelBounds() {
    const axisBounds = [];
    d3.selectAll('.axisLabel').each(function() {
        const label = d3.select(this);
        // Force a reflow to ensure accurate dimensions
        label.node()?.getBBox();
        const bounds = getLabelBounds(label);
        if (bounds) axisBounds.push(bounds);
    });
    return axisBounds;
}

// Main function to adjust label positions
function adjustLabelPositions(data, radius, angleSlice, rScale, allCirclesData) {
    if (!data || data.length === 0) return;

    // Use different scaling factors for horizontal and vertical dimensions
    const horizontalScale = 0.95;
    const verticalScale = 1.1;

    // Calculate grid based on the larger of the two scales
    const gridCellSize = 7;
    const effectiveHorizontalRadius = radius * horizontalScale;
    const effectiveVerticalRadius = radius * verticalScale;
    const maxRadius = Math.max(effectiveHorizontalRadius, effectiveVerticalRadius);
    const numCells = Math.ceil((maxRadius * 2) / gridCellSize);
    const grid = Array(numCells).fill().map(() => Array(numCells).fill(null));

    // Convert coordinates to grid position with elliptical scaling
    function coordToGrid(x, y) {
        // Scale x and y differently
        const scaledX = x * (horizontalScale / Math.max(horizontalScale, verticalScale));
        const scaledY = y * (verticalScale / Math.max(horizontalScale, verticalScale));

        const gridX = Math.floor((scaledX + maxRadius) / gridCellSize);
        const gridY = Math.floor((scaledY + maxRadius) / gridCellSize);
        return { gridX, gridY };
    }

    // Check if cells are available for the label placement
    function areCellsAvailable(startX, startY, width, height) {
        for (let y = startY; y < startY + height && y < numCells; y++) {
            for (let x = startX; x < startX + width && x < numCells; x++) {
                if (y < 0 || x < 0 || grid[y][x] !== null) {
                    return false;
                }
            }
        }
        return true;
    }

    // Mark cells as occupied
    function occupyCells(startX, startY, width, height, label) {
        for (let y = startY; y < startY + height && y < numCells; y++) {
            for (let x = startX; x < startX + width && x < numCells; x++) {
                if (y >= 0 && x >= 0 && y < numCells && x < numCells) {
                    grid[y][x] = label;
                }
            }
        }
    }

    // Sort data by distance from center and angle
    data.sort((a, b) => {
        const distA = Math.hypot(a.cx / horizontalScale, a.cy / verticalScale);
        const distB = Math.hypot(b.cx / horizontalScale, b.cy / verticalScale);
        return distB - distA;
    });

    // Place each label
    data.forEach(d => {
        if (!d.label || !d.labelBackground || !d.leaderLine) return;

        const labelBox = d.label.node().getBBox();
        const cellsNeededX = Math.ceil((labelBox.width + 10) / gridCellSize);
        const cellsNeededY = Math.ceil((labelBox.height + 10) / gridCellSize);

        let bestDistance = Infinity;
        let bestPos = null;
        let bestLabelX = 0;
        let bestLabelY = 0;

        // Calculate ideal position based on data point position
        const angle = Math.atan2(d.cy, d.cx);
        const idealDistance = Math.hypot(d.cx, d.cy) * 1.2; // 20% further out than the data point

        // Loop over all possible positions in the grid
        for (let y = 0; y <= numCells - cellsNeededY; y++) {
            for (let x = 0; x <= numCells - cellsNeededX; x++) {
                if (areCellsAvailable(x, y, cellsNeededX, cellsNeededY)) {
                    // Convert grid position back to coordinates
                    const labelX = (x * gridCellSize) - maxRadius + (cellsNeededX * gridCellSize) / 2;
                    const labelY = (y * gridCellSize) - maxRadius + (cellsNeededY * gridCellSize) / 2;

                    // Apply elliptical scaling to distance calculation
                    const dx = (labelX - d.cx) / horizontalScale;
                    const dy = (labelY - d.cy) / verticalScale;
                    const distance = dx * dx + dy * dy;

                    // Factor in the ideal position
                    const idealX = idealDistance * Math.cos(angle);
                    const idealY = idealDistance * Math.sin(angle);
                    const distanceFromIdeal = Math.hypot(
                        (labelX - idealX) / horizontalScale,
                        (labelY - idealY) / verticalScale
                    );

                    // Combined score favoring positions close to both the data point and ideal position
                    const score = distance + distanceFromIdeal * 0.5;

                    if (score < bestDistance) {
                        bestDistance = score;
                        bestPos = { x, y };
                        bestLabelX = labelX;
                        bestLabelY = labelY;
                    }
                }
            }
        }

        if (bestPos) {
            // Scale the final positions
            const finalLabelX = bestLabelX * horizontalScale;
            const finalLabelY = bestLabelY * verticalScale;

            // Update positions
            d.label
                .attr("x", finalLabelX)
                .attr("y", finalLabelY);

            d.labelBackground
                .attr("x", finalLabelX)
                .attr("y", finalLabelY);

            d.leaderLine
                .attr("x1", d.cx)
                .attr("y1", d.cy)
                .attr("x2", finalLabelX)
                .attr("y2", finalLabelY);

            // Mark cells as occupied using unscaled coordinates for grid
            occupyCells(bestPos.x, bestPos.y, cellsNeededX, cellsNeededY, d.label);
        }
    });
}

function getSearchParameters(quadrant, radius) {
    // Customize search parameters based on quadrant
    const baseParams = {
        minDist: radius * 0.2,
        maxDist: radius * 0.8,
        angleRange: Math.PI / 4
    };

    switch (quadrant) {
        case 1: // Top right
            return {
                ...baseParams,
                angleRange: Math.PI / 3,
                maxDist: radius * 0.9
            };
        case 2: // Top left
            return {
                ...baseParams,
                angleRange: Math.PI / 3,
                maxDist: radius * 0.9
            };
        case 3: // Bottom left
            return {
                ...baseParams,
                angleRange: Math.PI / 6,
                maxDist: radius * 0.8
            };
        case 4: // Bottom right
            return {
                ...baseParams,
                angleRange: Math.PI / 6,
                maxDist: radius * 0.8
            };
        default:
            return baseParams;
    }
}

function calculateOverlapScore(testBounds, labelBounds, axisBounds, padding) {
    let score = 0;

    // Check overlap with existing labels
    labelBounds.forEach(bound => {
        if (checkOverlap(testBounds, bound, padding)) {
            score += getOverlapArea(testBounds, bound);
        }
    });

    // Check overlap with axis labels
    axisBounds.forEach(bound => {
        if (checkOverlap(testBounds, bound, padding)) {
            score += getOverlapArea(testBounds, bound) * 2; // Higher penalty for axis overlap
        }
    });

    return score;
}

function checkOverlap(bounds1, bounds2, padding) {
    return !(bounds1.right + padding < bounds2.left - padding ||
        bounds1.left - padding > bounds2.right + padding ||
        bounds1.bottom + padding < bounds2.top - padding ||
        bounds1.top - padding > bounds2.bottom + padding);
}

function getOverlapArea(bounds1, bounds2) {
    const xOverlap = Math.min(bounds1.right, bounds2.right) - Math.max(bounds1.left, bounds2.left);
    const yOverlap = Math.min(bounds1.bottom, bounds2.bottom) - Math.max(bounds1.top, bounds2.top);
    return Math.max(0, xOverlap) * Math.max(0, yOverlap);
}


// Helper function to update leader lines during interactions
function updateLeaderLines() {
    d3.selectAll('.leaderLine').each(function() {
        const line = d3.select(this);
        const dataId = line.attr("data-id");
        const labelElement = d3.select(`.radarText[data-id="${dataId}"]`);
        const circleElement = d3.select(`.radarCircle[data-id="${dataId}"]`);

        if (!labelElement.empty() && !circleElement.empty()) {
            line
                .transition()
                .duration(200)
                .attr("x1", circleElement.attr("cx"))
                .attr("y1", circleElement.attr("cy"))
                .attr("x2", labelElement.attr("x"))
                .attr("y2", labelElement.attr("y"));
        }
    });
}

// Function to handle window resize
function handleResize() {
    const svgWidth = 630;
    const svgHeight = 770;
    const radius = svgWidth / 2;

    // Recalculate positions for all labels
    adjustLabelPositions(allCirclesData, radius, null, null, allCirclesData);
    updateLeaderLines();
}

// Add event listener for window resize
window.addEventListener('resize', handleResize);
// Update function for label interactions
function updateLabelsInteraction(dataId, isHover) {
    const baseOpacity = showRadarValues ? 1 : 0;

    d3.selectAll('.text-group').each(function() {
        const group = d3.select(this);
        const currentId = group.attr('data-id');
        const isTarget = currentId === dataId;

        // Find the corresponding circle data to get the country color
        const circleData = allCirclesData.find(d => d.id === currentId);
        const countryColor = circleData ? circleData.countryColor : 'black';

        const background = group.select('.radarText-background');
        const mainText = group.select('.radarText');
        const leaderLine = group.select('.leaderLine');

        if (isHover) {
            if (isTarget) {
                // Enhance target elements
                group.raise();

                background
                    .transition()
                    .duration(200)
                    .style("font-size", "16px")
                    .style("opacity", 1);

                mainText
                    .transition()
                    .duration(200)
                    .style("font-size", "16px")
                    .style("opacity", 1)
                    .style("font-weight", "bold");

                leaderLine
                    .transition()
                    .duration(200)
                    .style("stroke", countryColor)
                    .style("stroke-width", "2px")
                    .style("opacity", 1);

                // Also highlight the corresponding circle
                d3.select(`.radarCircle[data-id="${currentId}"]`)
                    .transition()
                    .duration(200)
                    .attr("r", 6)
                    .style("fill", "orange")
                    .style("opacity", 0.8);
            } else {
                // Dim non-target elements
                background
                    .transition()
                    .duration(200)
                    .style("opacity", 0);

                mainText
                    .transition()
                    .duration(200)
                    .style("opacity", 0.1);

                leaderLine
                    .transition()
                    .duration(200)
                    .style("opacity", 0.1);

                // Dim non-target circles
                d3.select(`.radarCircle[data-id="${currentId}"]`)
                    .transition()
                    .duration(200)
                    .attr("r", 4)
                    .style("fill", countryColor)
                    .style("opacity", 0.1);
            }
        } else {
            // Reset to default state
            background
                .transition()
                .duration(200)
                .style("opacity", 0);

            mainText
                .transition()
                .duration(200)
                .style("font-size", "14px")
                .style("opacity", baseOpacity)
                .style("font-weight", "normal");

            leaderLine
                .transition()
                .duration(200)
                .style("stroke", countryColor)
                .style("stroke-width", "0.5px")
                .style("opacity", baseOpacity);

            // Reset circles
            d3.select(`.radarCircle[data-id="${currentId}"]`)
                .transition()
                .duration(200)
                .attr("r", 4)
                .style("fill", countryColor)
                .style("opacity", 0.8);
        }
    });
}

function showTooltipForCircle(event, circleData) {
    if (!circleData || !circleData.data) {
        console.warn("No valid data for tooltip");
        return;
    }

    const tooltip = d3.select(".tooltip");

    // Clear any existing transition
    tooltip.interrupt();

    const scorecardItem = circleData.data;
    const formattedValue = formatValue(scorecardItem.Value_Map, scorecardItem.Percent_Number);

    // Get ranking information
    let rankingText = '';
    if (scorecardItem.Country !== "South Asia Region" && scorecardItem.Country !== "SARw/oIndia") {
        const rankKey = tableSortOption === 'year'
            ? `${scorecardItem.Indicator}_${scorecardItem.Year_Type}`
            : `${scorecardItem.Indicator}_${scorecardItem.Country}`;

        const rankData = globalData.rankings[rankKey]?.find(r =>
            r.country === scorecardItem.Country &&
            r.yearType === parseInt(scorecardItem.Year_Type)
        );

        if (rankData) {
            if (tableSortOption === 'year') {
                rankingText = `<strong><u>Rank:</u></strong> ${rankData.rank} of ${rankData.totalInGroup} (within year measurements)<br/>`;
            } else {
                rankingText = `<strong><u>Rank:</u></strong> ${rankData.rank} of ${rankData.totalInGroup} (within country measurements)<br/>`;
            }
        }
    }

    // Update tooltip content
    tooltip.html(
        `<strong><u>Country:</u></strong> ${scorecardItem.Country}<br/>` +
        `<strong><u>Indicator:</u></strong> ${scorecardItem.Indicator}<br/>` +
        `<strong><u>Proxy:</u></strong> ${scorecardItem.Proxy}<br/>` +
        `<strong><u>Value:</u></strong> ${formattedValue}<br/>` +
        rankingText +
        `<strong><u>Source:</u></strong> ${scorecardItem.Source}<br/>` +
        `<strong><u>Year:</u></strong> ${scorecardItem.Year}<br/>`
    );

    // Position tooltip
    const tooltipNode = tooltip.node();
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    let left = event.pageX - tooltipWidth / 2;
    let top = event.pageY - tooltipHeight - 10;

    if (left < 0) left = 10;
    if (left + tooltipWidth > window.innerWidth) {
        left = window.innerWidth - tooltipWidth - 10;
    }
    if (top < 0) {
        top = event.pageY + 10;
    }

    tooltip
        .style("display", "block")
        .style("left", `${left}px`)
        .style("top", `${top}px`)
        .style("opacity", 0.9);
}

// Update the updateLabelsInteraction function to handle the new structure

// Generic mouseout handler

function completeAnimations() {
    d3.selectAll('.radarStroke.animating').each(function() {
        const stroke = d3.select(this);
        const id = stroke.attr("data-id");

        // Complete stroke animation
        stroke
            .interrupt()
            .style("stroke-dasharray", null)
            .style("stroke-dashoffset", null)
            .classed('animating', false)
            .style("stroke-opacity", 1)
            .style("stroke-width", "2px");

        // Complete area animation
        d3.select(`.radarArea[data-id="${id}"]`)
            .interrupt()
            .style("fill-opacity", 0.3);
    });
}

function updateCirclesAndLabelsForCountryYear(targetCountry, targetYear, isHover) {
    d3.selectAll('.radarCircle').each(function(d) {
        if (!d) return;

        const circle = d3.select(this);
        const [circleCountry, circleYear] = circle.attr("data-id").split('|');
        const isTarget = circleCountry === targetCountry &&
            circleYear.toString() === targetYear.toString();

        // Always use the stored countryColor from the data
        const countryColor = getCountryYearColor(circleCountry, circleYear);

        circle.transition()
            .duration(200)
            .attr("r", isHover && isTarget ? 6 : 4)
            .style("fill", isHover && isTarget ? "orange" : countryColor)
            .style("opacity", isHover ? (isTarget ? 0.8 : 0.1) : 0.8);

        // Update labels and leader lines accordingly
        const textGroup = d3.select(`.text-group[data-id="${circle.attr("data-id")}"]`);
        if (!textGroup.empty()) {
            const baseOpacity = showRadarValues ? 1 : 0;
            const labelOpacity = isHover ? (isTarget ? 1 : 0.1) : baseOpacity;

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("opacity", labelOpacity)
                .style("font-size", isHover && isTarget ? "16px" : "14px")
                .style("font-weight", isHover && isTarget ? "bold" : "normal");

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("stroke", isHover && isTarget ? countryColor : countryColor)
                .style("stroke-width", isHover && isTarget ? "2px" : "0.5px")
                .style("opacity", labelOpacity);
        }
    });
}

function resetRadarAppearance() {
    // Interrupt any ongoing transitions first
    d3.selectAll('.radarStroke, .radarArea, .radarCircle, .text-group')
        .interrupt();

    // Reset radar areas and strokes
    d3.selectAll('.radarArea').each(function() {
        const area = d3.select(this);
        const areaDataId = area.attr('data-id');
        const [currentCountry, currentYear] = areaDataId.split('|');
        const countryColor = getCountryYearColor(currentCountry, currentYear);

        // Reset area
        area.transition()
            .duration(200)
            .style('fill', countryColor)
            .style('fill-opacity', 0.3)
            .style('pointer-events', 'auto');

        // Reset corresponding stroke
        d3.select(`.radarStroke[data-id="${areaDataId}"]`)
            .transition()
            .duration(200)
            .style('stroke', countryColor)
            .style('stroke-width', '2px')
            .style('stroke-opacity', 1)
            .style('pointer-events', 'auto');
    });

    // Reset circles and labels
    d3.selectAll('.radarCircle').each(function() {
        const circle = d3.select(this);
        const circleData = circle.datum();
        if (!circleData) return;

        // Reset circle
        circle.transition()
            .duration(200)
            .attr("r", 4)
            .style("fill", circleData.countryColor)
            .style("opacity", 0.8);

        // Reset associated text group
        const textGroup = d3.select(`.text-group[data-id="${circle.attr("data-id")}"]`);
        if (!textGroup.empty()) {
            const baseOpacity = showRadarValues ? 1 : 0;

            textGroup.select('.radarText-background')
                .transition()
                .duration(200)
                .style("opacity", 0);

            textGroup.select('.radarText')
                .transition()
                .duration(200)
                .style("opacity", baseOpacity)
                .style("font-size", "14px")
                .style("font-weight", "normal");

            textGroup.select('.leaderLine')
                .transition()
                .duration(200)
                .style("stroke", circleData.countryColor)
                .style("stroke-width", "0.5px")
                .style("opacity", baseOpacity);
        }
    });

    // Reset hover states and ensure proper z-index
    d3.selectAll('.radarArea, .radarStroke')
        .style('pointer-events', 'auto');

    d3.selectAll('.text-group')
        .style('pointer-events', showRadarValues ? 'all' : 'none');

    d3.selectAll('.radarText')
        .style('pointer-events', showRadarValues ? 'all' : 'none');

    d3.selectAll('.radarCircle')
        .style('pointer-events', 'all')
        .raise();

    // Ensure proper z-index for text groups
    d3.selectAll('.text-group').raise();

    // Hide tooltip
    hideTooltip();
}


// Wrap function for axis labels
function wrap(text, width) {
    text.each(function () {
        const text = d3.select(this);
        const words = text.text().split(/\s+/).reverse();
        const lineHeight = 1.1;
        const x = text.attr("x");
        const y = text.attr("y");
        const dy = parseFloat(text.attr("dy")) || 0;

        let line = [];
        let lineNumber = 0;
        let tspan = text.text(null).append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", `${dy}em`);

        let word;
        while ((word = words.pop())) {
            line.push(word);
            tspan.text(line.join(" "));

            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];

                tspan = text.append("tspan")
                    .attr("x", x)
                    .attr("y", y)
                    .attr("dy", `${++lineNumber * lineHeight + dy}em`)
                    .text(word);
            }
        }
    });
}

// Function to download table data as CSV
// Function to download table data as CSV
function downloadCSV() {
    // Define headers for CSV
    const headers = [
        "Indicator",
        "Category",
        "Country",
        "Measurement_Type",
        "Value",
        "Rank",
        "Total_In_Ranking",
        "Ranking_Context",
        "Proxy",
        "Source",
        "Year"
    ];

    // Get all countries and their data
    const rows = [];
    const allIndicators = filteredIndicators;
    const countries = Array.from(selectedCountries);

    allIndicators.forEach(indicator => {
        countries.forEach(country => {
            const yearTypes = selectedCountryYears[country];
            if (yearTypes) {
                yearTypes.forEach(yearType => {
                    if (filteredData[country]?.[yearType]) {
                        const indicatorData = filteredData[country][yearType].find(d =>
                            d.Indicator === indicator &&
                            (d.Country === country ||
                                d.Country === "SARw/oIndia" ||
                                d.Country === "India")
                        );

                        if (indicatorData) {
                            // Get ranking data
                            let rankData = null;
                            let rankingContext = '';

                            if (country !== "South Asia Region" && country !== "SARw/oIndia") {
                                const rankKey = tableSortOption === 'year'
                                    ? `${indicator}_${yearType}`
                                    : `${indicator}`;

                                rankData = globalData.rankings[rankKey]?.find(r =>
                                    r.country === country &&
                                    r.yearType === yearType
                                );

                                if (rankData) {
                                    rankingContext = tableSortOption === 'year'
                                        ? `Within ${yearType === Math.max(...Array.from(countryYearTypes[country] || []).sort((a, b) => b - a)) ? 'Recent' : 'Previous'} measurements`
                                        : 'Within country measurements';
                                }
                            }

                            // Get measurement type
                            const availableYears = Array.from(countryYearTypes[country] || []).sort((a, b) => b - a);
                            const measurementType = yearType === availableYears[0] ? "Recent" : "Previous";

                            // Create row
                            rows.push([
                                indicator,
                                indicatorData.Group_Name,
                                country,
                                measurementType,
                                formatValue(indicatorData.Value_Map, indicatorData.Percent_Number),
                                rankData ? rankData.rank : '',
                                rankData ? rankData.totalInGroup : '',
                                rankingContext,
                                indicatorData.Proxy,
                                indicatorData.Source,
                                indicatorData.Year
                            ]);
                        }
                    }
                });
            }
        });
    });

    // Function to escape and format CSV values
    function escapeCSV(value) {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    // Combine headers and rows, properly escaped
    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = `scorecard_data_${new Date().toISOString().split('T')[0]}.csv`;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    window.URL.revokeObjectURL(url);
}
// Function to update the table
function updateTable(countries, selectedGroup) {
    console.log("Updating table with:", { countries, selectedGroup });

    const table = d3.select("#dataTable");
    table.html(""); // Clear the table

    if (!countries || countries.length === 0) {
        console.log("No countries selected, returning early");
        return;
    }

    // Get reference to existing tooltip
    const tooltip = d3.select(".tooltip");

    // Collect all selected years
    const allYears = new Set();
    countries.forEach(country => {
        if (selectedCountryYears[country]) {
            selectedCountryYears[country].forEach(year => allYears.add(year));
        }
    });
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);

    // Build column order
    let columnOrder = [];
    if (tableSortOption === 'year') {
        sortedYears.forEach(year => {
            countries.forEach(country => {
                if (selectedCountryYears[country]?.has(year)) {
                    columnOrder.push({ country, year });
                }
            });
        });
    } else { // country sort
        countries.forEach(country => {
            sortedYears.forEach(year => {
                if (selectedCountryYears[country]?.has(year)) {
                    columnOrder.push({ country, year });
                }
            });
        });
    }

    // Create table headers
    const headers = ["Indicator", ...columnOrder.map(col => {
        const yearType = col.year;
        const availableYears = Array.from(countryYearTypes[col.country] || []).sort((a, b) => b - a);
        const measurementLabel = yearType === availableYears[0] ? "Recent" : "Previous";
        return `${col.country} (${measurementLabel})`;
    })];

    const thead = table.append("thead").append("tr");
    headers.forEach(header => {
        const th = thead.append("th").text(header);
        if (header !== "Indicator") {
            const countryName = header.split(' (')[0];
            const yearType = header.includes('Recent') ?
                Math.max(...Array.from(countryYearTypes[countryName] || [])) :
                Array.from(countryYearTypes[countryName] || []).sort((a, b) => b - a)[1];

            if (yearType) {
                th.style("background-color", getCountryYearColor(countryName, yearType));
            }
        }
    });

    const tbody = table.append("tbody");

    // Use filteredIndicators instead of indicators
    Array.from(filteredIndicators).sort().forEach(indicator => {
        const row = tbody.append("tr");
        row.append("td").text(indicator);

        columnOrder.forEach(col => {
            let cellData = null;

            if (filteredData[col.country]?.[col.year]) {
                cellData = filteredData[col.country][col.year].find(d =>
                    d.Indicator === indicator &&
                    (d.Country === col.country ||
                        d.Country === "SARw/oIndia" ||
                        d.Country === "India")
                );
            }

            const cell = row.append("td")
                .attr("class", "value");

            if (cellData) {
                const formattedValue = formatValue(cellData.Value_Map, cellData.Percent_Number);
                let rankText = '';

                if (cellData.Country !== "South Asia Region" && cellData.Country !== "SARw/oIndia") {
                    const rankKey = tableSortOption === 'year'
                        ? `${indicator}_${col.year}`
                        : `${indicator}_${col.country}`;

                    const rankData = globalData.rankings[rankKey]?.find(r =>
                        r.country === col.country &&
                        r.yearType === col.year
                    );

                    if (rankData) {
                        rankText = ` (${rankData.rank}/${rankData.totalInGroup})`;
                    }
                }

                cell.text(`${formattedValue}${rankText}`)
                    .style("color", cellData.Value_Standardized_Table !== null
                        ? (Math.abs(cellData.Value_Standardized_Table) > 92 ? 'white' : 'black')
                        : 'black')
                    .style("background-color", cellData.Value_Standardized_Table !== null
                        ? d3.interpolateRdBu((cellData.Value_Standardized_Table + 100) / 200)
                        : '')
                    .style("border-left", `5px solid ${getCountryYearColor(col.country, col.year)}`)
                    .on("mouseover", function(event) {
                        // Get ranking information
                        let rankingText = '';
                        if (cellData.Country !== "South Asia Region" && cellData.Country !== "SARw/oIndia") {
                            const rankKey = tableSortOption === 'year'
                                ? `${indicator}_${col.year}`
                                : `${indicator}_${col.country}`;

                            const rankData = globalData.rankings[rankKey]?.find(r =>
                                r.country === col.country &&
                                r.yearType === col.year
                            );

                            if (rankData) {
                                rankingText = tableSortOption === 'year'
                                    ? `<strong><u>Rank:</u></strong> ${rankData.rank} of ${rankData.totalInGroup} (within ${col.year} measurements)<br/>`
                                    : `<strong><u>Rank:</u></strong> ${rankData.rank} of ${rankData.totalInGroup} (within country measurements)<br/>`;
                            }
                        }

                        // Update tooltip content
                        tooltip.html(
                            `<strong><u>Country:</u></strong> ${cellData.Country}<br/>` +
                            `<strong><u>Indicator:</u></strong> ${cellData.Indicator}<br/>` +
                            `<strong><u>Proxy:</u></strong> ${cellData.Proxy}<br/>` +
                            `<strong><u>Value:</u></strong> ${formattedValue}<br/>` +
                            rankingText +
                            `<strong><u>Source:</u></strong> ${cellData.Source}<br/>` +
                            `<strong><u>Year:</u></strong> ${cellData.Year}<br/>`
                        );

                        // Calculate tooltip position
                        const tooltipNode = tooltip.node();
                        const cellRect = this.getBoundingClientRect();

                        let left = event.pageX - tooltipNode.offsetWidth / 2;
                        let top = event.pageY - tooltipNode.offsetHeight - 10;

                        // Adjust if tooltip would go off screen
                        if (left < 0) {
                            left = 10;
                        }
                        if (left + tooltipNode.offsetWidth > window.innerWidth) {
                            left = window.innerWidth - tooltipNode.offsetWidth - 10;
                        }
                        if (top < window.scrollY) {
                            top = event.pageY + 20;
                        }

                        // Position and show tooltip
                        tooltip
                            .style("display", "block")
                            .style("left", `${left}px`)
                            .style("top", `${top}px`)
                            .style("opacity", 0.9);
                    })
                    .on("mouseout", function() {
                        tooltip
                            .style("display", "none")
                            .style("opacity", 0);
                    });
            }
        });
    });
}

document.getElementById('recentMeasurementButton').addEventListener('click', function() {
    const wasSelected = this.classList.contains('selected');
    this.classList.toggle('selected');

    const countries = [
        "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
        "Bhutan", "Afghanistan", "Maldives", "SARw/oIndia", "South Asia Region"
    ];

    // Select all flags if none are selected
    if (selectedCountries.size === 0 && !wasSelected) {
        countries.forEach(country => {
            selectedCountries.add(country);
            const flagImg = document.querySelector(`img[alt="${country}"]`);
            const flagDiv = flagImg?.closest('.flag-item');
            if (flagImg && flagDiv) {
                flagImg.classList.add('selected');
                flagDiv.classList.add('selected');
            }
        });
    }

    // Reset animation state for new selections
    window.currentAnimation = {
        id: `batch_${Date.now()}`,
        inProgress: true,
        items: []
    };

    const batchSelections = [];

    countries.forEach(country => {
        if (selectedCountries.has(country)) {
            const availableYears = Array.from(countryYearTypes[country] || [])
                .sort((a, b) => b - a);
            const mostRecentYear = availableYears[0];

            if (!wasSelected) {
                // Add to selections regardless of previous state
                if (mostRecentYear) {
                    batchSelections.push({
                        country: country,
                        yearType: mostRecentYear,
                        animationId: window.currentAnimation.id
                    });

                    window.currentAnimation.items.push({
                        country: country,
                        yearType: mostRecentYear
                    });

                    // Update button visual state
                    const flagItem = document.querySelector(`.flag-item img[alt="${country}"]`)?.closest('.flag-item');
                    const yearButton = flagItem?.querySelector(`.year-button[data-year-type="${mostRecentYear}"]`);
                    if (yearButton) {
                        yearButton.classList.add('selected');
                        yearButton.style.backgroundColor = getCountryYearColor(country, mostRecentYear);
                    }

                    // Update data structures
                    selectedCountryYears[country] = selectedCountryYears[country] || new Set();
                    selectedCountryYears[country].add(mostRecentYear);
                }
            } else {
                // Removing selections
                const flagItem = document.querySelector(`.flag-item img[alt="${country}"]`)?.closest('.flag-item');
                const yearButton = flagItem?.querySelector(`.year-button[data-year-type="${mostRecentYear}"]`);
                if (yearButton) {
                    yearButton.classList.remove('selected');
                    yearButton.style.backgroundColor = "#f0f0f0";
                }

                if (selectedCountryYears[country]) {
                    selectedCountryYears[country].delete(mostRecentYear);
                }
            }
        }
    });

    // Set most recent selection if there are any new additions
    if (batchSelections.length > 0) {
        mostRecentSelection = {
            isMultiSelection: true,
            animationId: window.currentAnimation.id,
            selections: batchSelections
        };
    } else {
        mostRecentSelection = null;
        window.currentAnimation = null;
    }

    this.style.backgroundColor = wasSelected ? "#555" : "#777";
    this.style.transform = wasSelected ? "none" : "scale(1.02)";

    filterData();
});

document.getElementById('previousMeasurementButton').addEventListener('click', function() {
    const wasSelected = this.classList.contains('selected');
    this.classList.toggle('selected');

    const countries = [
        "India", "Pakistan", "Bangladesh", "Sri Lanka", "Nepal",
        "Bhutan", "Afghanistan", "Maldives", "SARw/oIndia", "South Asia Region"
    ];

    // Select all flags if none are selected
    if (selectedCountries.size === 0 && !wasSelected) {
        countries.forEach(country => {
            selectedCountries.add(country);
            const flagImg = document.querySelector(`img[alt="${country}"]`);
            const flagDiv = flagImg?.closest('.flag-item');
            if (flagImg && flagDiv) {
                flagImg.classList.add('selected');
                flagDiv.classList.add('selected');
            }
        });
    }

    // Reset animation state for new selections
    window.currentAnimation = {
        id: `batch_${Date.now()}`,
        inProgress: true,
        items: []
    };

    const batchSelections = [];

    countries.forEach(country => {
        if (selectedCountries.has(country)) {
            const availableYears = Array.from(countryYearTypes[country] || [])
                .sort((a, b) => b - a);
            const previousYear = availableYears[1];

            if (!wasSelected && previousYear) {
                // Add to selections regardless of previous state
                batchSelections.push({
                    country: country,
                    yearType: previousYear,
                    animationId: window.currentAnimation.id
                });

                window.currentAnimation.items.push({
                    country: country,
                    yearType: previousYear
                });

                // Update button visual state
                const flagItem = document.querySelector(`.flag-item img[alt="${country}"]`)?.closest('.flag-item');
                const yearButton = flagItem?.querySelector(`.year-button[data-year-type="${previousYear}"]`);
                if (yearButton) {
                    yearButton.classList.add('selected');
                    yearButton.style.backgroundColor = getCountryYearColor(country, previousYear);
                }

                // Update data structures
                selectedCountryYears[country] = selectedCountryYears[country] || new Set();
                selectedCountryYears[country].add(previousYear);
            } else if (wasSelected && previousYear) {
                // Removing selections
                const flagItem = document.querySelector(`.flag-item img[alt="${country}"]`)?.closest('.flag-item');
                const yearButton = flagItem?.querySelector(`.year-button[data-year-type="${previousYear}"]`);
                if (yearButton) {
                    yearButton.classList.remove('selected');
                    yearButton.style.backgroundColor = "#f0f0f0";
                }

                if (selectedCountryYears[country]) {
                    selectedCountryYears[country].delete(previousYear);
                }
            }
        }
    });

    // Set most recent selection if there are any new additions
    if (batchSelections.length > 0) {
        mostRecentSelection = {
            isMultiSelection: true,
            animationId: window.currentAnimation.id,
            selections: batchSelections
        };
    } else {
        mostRecentSelection = null;
        window.currentAnimation = null;
    }

    this.style.backgroundColor = wasSelected ? "#555" : "#777";
    this.style.transform = wasSelected ? "none" : "scale(1.02)";

    filterData();
});

document.getElementById('downloadCsvButton').addEventListener('click', downloadCSV);


// Add click event listener for the Toggle Values button
document.getElementById('toggleValuesButton').addEventListener('click', function() {
    showRadarValues = !showRadarValues;
    this.classList.toggle('selected');

    // Update button appearance
    this.style.backgroundColor = showRadarValues ? "#777" : "#555";
    this.style.transform = showRadarValues ? "scale(1.02)" : "none";
    this.textContent = showRadarValues ? "Hide Values" : "Show Values";

    // Force immediate update of all labels
    updateAllLabelsVisibility();

    // Ensure proper z-index
    d3.selectAll('.radarCircle').raise();
});

// Function to update visibility for all labels
// Update the updateAllLabelsVisibility function to properly handle pointer events
// Make sure to initialize showRadarValues at the top of your script
// Update the drawRadarChartForCountryYear function to handle global animations
function drawRadarChartForCountryYear(areaWrapper, circlesLabelsWrapper, dataObj, rScale, angleSlice, allIndicators, allCirclesData) {
    const { country, yearType, data } = dataObj;

    // Map indicators to data points
    const axes = allIndicators.map((indicator, i) => {
        const scorecardItem = data.find(d => d.Indicator === indicator);
        if (scorecardItem) {
            return { ...scorecardItem, index: i };
        }
        return {
            Indicator: indicator,
            Value_Standardized: null,
            index: i
        };
    });

    const validData = axes.filter(d => d.Value_Standardized !== null);

    // Create radar line generator with explicit curve type
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.Value_Standardized))
        .angle(d => angleSlice * d.index)
        .curve(d3.curveLinearClosed);

    const countryColor = getCountryYearColor(country, yearType);
    const dataId = `${country}|${yearType}`;

    // Remove existing elements
    d3.selectAll(`.text-group[data-id^="${country}|${yearType}"]`).remove();
    areaWrapper.selectAll(`.radarArea[data-id="${dataId}"]`).remove();
    areaWrapper.selectAll(`.radarStroke[data-id="${dataId}"]`).remove();
    areaWrapper.selectAll(`.radarHoverArea[data-id="${dataId}"]`).remove();
    circlesLabelsWrapper.selectAll(`.circles-labels-wrapper[data-id="${dataId}"]`).remove();


    // Generate the path data once to ensure consistency
    const pathData = radarLine(validData);

    // Draw area path
    const radarArea = areaWrapper.append("path")
        .datum(validData)
        .attr("data-id", dataId)
        .attr("class", "radarArea")
        .attr("d", pathData)
        .style("fill", countryColor)
        .style("fill-opacity", 0.3);

    // Draw stroke path
    const radarStroke = areaWrapper.append("path")
        .datum(validData)
        .attr("data-id", dataId)
        .attr("class", "radarStroke")
        .attr("d", pathData)
        .style("stroke", countryColor)
        .style("stroke-width", "2px")
        .style("fill", "none");

    // Create hover area using exact same path
    let isHovered = false;
    let hoverTimeout;

    // Update the hover area with new hover handling
    // In drawRadarChartForCountryYear, update the hover area behavior:
// Inside drawRadarChartForCountryYear, replace the hover area creation with:
    // Inside drawRadarChartForCountryYear, replace the hover area creation with:
    // Inside drawRadarChartForCountryYear, replace the hover area creation with:
    // Inside drawRadarChartForCountryYear, replace the hover area creation with:
    const hoverArea = areaWrapper.append("path")
        .datum(validData)
        .attr("class", "radarHoverArea")
        .attr("data-id", dataId)
        .attr("d", pathData)
        .style("fill", "none")
        .style("stroke", "none")
        .style("pointer-events", "all")
        .on("mouseenter", function(event) {
            // Force immediate update of visual states
            updateRadarAppearance(country, yearType, true);

            // Update all radar areas and strokes
            d3.selectAll('.radarArea').each(function() {
                const area = d3.select(this);
                const areaDataId = area.attr('data-id');
                const isTarget = areaDataId === dataId;

                area.transition()
                    .duration(200)
                    .style('fill-opacity', isTarget ? 0.6 : 0.02);

                d3.select(`.radarStroke[data-id="${areaDataId}"]`)
                    .transition()
                    .duration(200)
                    .style('stroke-width', isTarget ? '4px' : '1px')
                    .style('stroke-opacity', isTarget ? 1 : 0.1);
            });

            // Update the circles and labels
            d3.selectAll('.radarCircle').each(function(d) {
                if (!d) return;

                const circle = d3.select(this);
                const currentId = circle.attr("data-id");
                const [circleCountry, circleYear] = currentId.split('|');

                const isTarget = circleCountry === country && circleYear === yearType;

                // Update circle
                circle.transition()
                    .duration(200)
                    .attr("r", isTarget ? 6 : 2)
                    .style("fill", isTarget ? "orange" : d.countryColor)
                    .style("opacity", isTarget ? 0.8 : 0.1);

                // Update text group
                const textGroup = d3.select(`.text-group[data-id="${currentId}"]`);
                if (!textGroup.empty()) {
                    if (isTarget) {
                        textGroup.raise();

                        // Show background for target
                        textGroup.select('.radarText-background')
                            .transition()
                            .duration(200)
                            .style("opacity", 1);

                        // Show and enhance text for target
                        textGroup.select('.radarText')
                            .transition()
                            .duration(200)
                            .style("opacity", 1)
                            .style("font-size", "16px");

                        // Show and enhance leader line for target
                        textGroup.select('.leaderLine')
                            .transition()
                            .duration(200)
                            .style("stroke-width", "2px")
                            .style("opacity", 1);
                    } else {
                        // Hide text elements for non-targets
                        textGroup.select('.radarText-background')
                            .transition()
                            .duration(200)
                            .style("opacity", 0);

                        textGroup.select('.radarText')
                            .transition()
                            .duration(200)
                            .style("opacity", 0);

                        textGroup.select('.leaderLine')
                            .transition()
                            .duration(200)
                            .style("opacity", 0);
                    }
                }
            });

            // Raise the target area's text groups to ensure visibility
            d3.selectAll(`.text-group[data-id^="${country}|${yearType}|"]`).raise();
        })
        .on("mouseleave", function(event) {
            // Use the same reset function as the year button
            handleYearButtonLeave(event);
        });
    // Create wrapper for circles and labels
    const wrapper = circlesLabelsWrapper.append("g")
        .attr("class", "circles-labels-wrapper")
        .attr("data-id", dataId);

    // Draw circles and labels
    validData.forEach(scorecardItem => {
        if (!scorecardItem || scorecardItem.Value_Standardized === null) return;

        const angle = angleSlice * scorecardItem.index - Math.PI / 2;
        const pointRadius = rScale(scorecardItem.Value_Standardized);
        const cx = pointRadius * Math.cos(angle);
        const cy = pointRadius * Math.sin(angle);
        const uniqueId = `${country}|${yearType}|${scorecardItem.Indicator}`;

        // Create circle with data binding
        const circleData = {
            data: scorecardItem,
            countryColor: countryColor,
            country: country,
            yearType: yearType,
            cx: cx,
            cy: cy,
            id: uniqueId
        };

        // Create circle
        const circle = wrapper.append("circle")
            .datum(circleData)
            .attr("class", "radarCircle")
            .attr("data-id", uniqueId)
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", 4)
            .style("fill", countryColor)
            .style("fill-opacity", 0.8)
            .style("pointer-events", "all")
            .on("mouseenter", function(event, d) {
                // Highlight circle
                d3.select(this)
                    .transition()
                    .duration(100)  // Faster transition
                    .attr("r", 6)
                    .style("fill", "orange");

                // Show labels regardless of showRadarValues state for hovered circle
                const textGroup = d3.select(`.text-group[data-id="${uniqueId}"]`);
                if (!textGroup.empty()) {
                    textGroup.raise();

                    textGroup.select('.radarText-background')
                        .transition()
                        .duration(100)
                        .style("opacity", 1);

                    textGroup.select('.radarText')
                        .transition()
                        .duration(100)
                        .style("opacity", 1)
                        .style("font-size", "16px")
                        .style("font-weight", "bold");

                    textGroup.select('.leaderLine')
                        .transition()
                        .duration(100)
                        .style("stroke", countryColor)
                        .style("stroke-width", "2px")
                        .style("opacity", 1);
                }

                showTooltipForCircle(event, d);
                updateRadarAppearance(country, yearType, true);
            })
            .on("mouseleave", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(100)
                    .attr("r", 4)
                    .style("fill", d.countryColor);

                // Reset labels to their base state
                const textGroup = d3.select(`.text-group[data-id="${uniqueId}"]`);
                if (!textGroup.empty()) {
                    const baseOpacity = showRadarValues ? 1 : 0;

                    textGroup.select('.radarText-background')
                        .transition()
                        .duration(100)
                        .style("opacity", 0);

                    textGroup.select('.radarText')
                        .transition()
                        .duration(100)
                        .style("opacity", baseOpacity)
                        .style("font-size", "14px")
                        .style("font-weight", "normal");

                    textGroup.select('.leaderLine')
                        .transition()
                        .duration(100)
                        .style("stroke", countryColor)
                        .style("stroke-width", "0.5px")
                        .style("opacity", baseOpacity);
                }

                hideTooltip();
                resetRadarAppearance();
            });


        // Create labels
        const labelElements = createLabels(wrapper, scorecardItem, cx, cy, countryColor, uniqueId);

        // Add to allCirclesData
        const circleInfo = {
            cx,
            cy,
            x: parseFloat(labelElements.mainText.attr("x")),
            y: parseFloat(labelElements.mainText.attr("y")),
            countryColor,
            country,
            yearType,
            data: scorecardItem,
            id: uniqueId,
            circle,
            leaderLine: labelElements.leaderLine,
            label: labelElements.mainText,
            labelBackground: labelElements.textBackground
        };

        // Update allCirclesData
        const existingIndex = allCirclesData.findIndex(d => d.id === uniqueId);
        if (existingIndex !== -1) {
            allCirclesData[existingIndex] = circleInfo;
        } else {
            allCirclesData.push(circleInfo);
        }
    });

    // Handle animation if needed
    const shouldAnimate = window.currentAnimation?.inProgress &&
        window.currentAnimation.items?.some(item =>
            item.country === country &&
            item.yearType === parseInt(yearType)
        );

    if (shouldAnimate) {
        radarStroke.raise();
        animateRadarStroke(radarStroke, radarArea);
    } else {
        radarStroke
            .style("stroke-opacity", 1)
            .style("stroke-width", "2px");
        radarArea
            .style("fill-opacity", 0.3);
    }

    // Ensure proper z-index
    hoverArea.raise();
    wrapper.selectAll('.radarCircle').raise();
    d3.selectAll('.text-group').raise();

    return {
        radarArea,
        radarStroke,
        hoverArea
    };
}

document.getElementById('sortYearButton').addEventListener('click', function() {
    tableSortOption = 'year';
    highlightSortButton(this); // Highlight the selected button
    filterData(); // Re-filter and re-render the table
});

document.getElementById('sortCountryButton').addEventListener('click', function() {
    tableSortOption = 'country';
    highlightSortButton(this); // Highlight the selected button
    filterData(); // Re-filter and re-render the table
});


fetchData().then(() => {
    highlightSelectedButton(document.querySelector(`[data-category="Vision"]`)); // Automatically highlight Vision button
    filterData(); // Filter data based on Vision
});