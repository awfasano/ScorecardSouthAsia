// survey_table_script.js

let indicatorDict = {};
let appliedFilters = {
    indicator: '',
    yearType: '',
    country: '',
    category: ''
};

async function loadIndicators() {
    try {
        const response = await fetch('/api/scorecard_indicators');
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const indicators = await response.json();
        if (!Array.isArray(indicators)) throw new Error('The fetched data is not an array. Check the API response structure.');

        indicators.forEach(indicator => {
            const {
                ID,
                Category_ID,
                Secondary_ID,
                Group_Name,
                Indicator_Name,
                Proxy,
                Country,
                Year,
                Year_Type,
                Source,
                Value,
                Value_N,
                Value_Map,
                Value_Standardized,
                Positive,
                Value_Standardized_Table,
                Indicator_Details
            } = indicator;

            // Ensure Indicator_Details exists
            if (Indicator_Details) {
                const indicatorId = Indicator_Details.IndicatorID;

                // Include Group_Name and Category_ID in indicatorDetails
                Indicator_Details.Group_Name = Group_Name;
                Indicator_Details.Category_ID = Category_ID;

                if (!indicatorDict[indicatorId]) {
                    indicatorDict[indicatorId] = {
                        indicatorDetails: Indicator_Details,
                        data: {}
                    };
                }

                if (!indicatorDict[indicatorId].data[Year_Type]) {
                    indicatorDict[indicatorId].data[Year_Type] = {};
                }

                if (!indicatorDict[indicatorId].data[Year_Type][Country]) {
                    indicatorDict[indicatorId].data[Year_Type][Country] = {};
                }

                indicatorDict[indicatorId].data[Year_Type][Country][Year] = {
                    ID,
                    Category_ID,
                    Secondary_ID,
                    Group_Name,
                    Indicator_Name,
                    Proxy,
                    Source,
                    Value,
                    Value_N,
                    Value_Map,
                    Value_Standardized,
                    Positive,
                    Value_Standardized_Table,
                    Year,
                    Year_Type,
                    Country
                };
            }
        });

        populateFilters();

        const showAllButton = document.getElementById('clearFilters');
        if (showAllButton) {
            showAllButton.addEventListener('click', clearFilters);
        }

        // Attach event listeners to the "Create New Indicator" and "Create New Scorecard Value" buttons
        document.getElementById('addNewIndicatorBtn').addEventListener('click', showNewIndicatorForm);
        document.getElementById('addNewScorecardBtn').addEventListener('click', showNewScorecardForm);

    } catch (error) {
        console.error('Error fetching indicators:', error);
    }
}

function populateFilters() {
    const indicatorFilter = document.getElementById('indicatorFilter');
    const yearTypeFilter = document.getElementById('yearTypeFilter');
    const countryFilter = document.getElementById('countryFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    indicatorFilter.innerHTML = '<option value="">All Indicators</option>';
    yearTypeFilter.innerHTML = '<option value="">All Year Types</option>';
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    categoryFilter.innerHTML = '<option value="">All Categories</option>';

    const yearTypes = new Set();
    const categories = new Set();

    for (const indicatorId in indicatorDict) {
        const indicatorDetails = indicatorDict[indicatorId].indicatorDetails;
        const categoryName = indicatorDetails.Group_Name || "Unknown Category";

        // Add categories to the set
        categories.add(categoryName);

        // Populating indicator filter
        const option = document.createElement('option');
        option.value = indicatorId;
        option.text = indicatorDetails.IndicatorName;
        indicatorFilter.appendChild(option);

        // Populating year types
        for (const yearType in indicatorDict[indicatorId].data) {
            yearTypes.add(yearType);
        }
    }

    // Add categories to the filter
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.text = category;
        categoryFilter.appendChild(option);
    });

    // Add year types to the filter
    yearTypes.forEach(yearType => {
        const option = document.createElement('option');
        option.value = yearType;
        option.text = `Year Type ${yearType}`;
        yearTypeFilter.appendChild(option);
    });

    const countries = new Set();
    for (const indicatorId in indicatorDict) {
        for (const yearType in indicatorDict[indicatorId].data) {
            for (const country in indicatorDict[indicatorId].data[yearType]) {
                countries.add(country);
            }
        }
    }

    // Add countries to the filter
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.text = country;
        countryFilter.appendChild(option);
    });
}

function applyIndicatorFilter() {
    const indicatorFilter = document.getElementById('indicatorFilter').value;
    appliedFilters.indicator = indicatorFilter;
    applyFilters();
}

function applyYearTypeFilter() {
    const yearTypeFilter = document.getElementById('yearTypeFilter').value;
    appliedFilters.yearType = yearTypeFilter;
    applyFilters();
}

function applyCountryFilter() {
    const countryFilter = document.getElementById('countryFilter').value;
    appliedFilters.country = countryFilter;
    applyFilters();
}

function applyCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    appliedFilters.category = categoryFilter;
    applyFilters();
}

function applyFilters() {
    const filteredData = [];

    for (const [indicatorId, indicatorData] of Object.entries(indicatorDict)) {
        if (appliedFilters.indicator && indicatorId !== appliedFilters.indicator) continue;
        if (appliedFilters.category && indicatorData.indicatorDetails.Group_Name !== appliedFilters.category) continue;

        for (const [yearType, countries] of Object.entries(indicatorData.data)) {
            if (appliedFilters.yearType && yearType !== appliedFilters.yearType) continue;

            for (const [country, yearsData] of Object.entries(countries)) {
                if (appliedFilters.country && country !== appliedFilters.country) continue;

                for (const year in yearsData) {
                    filteredData.push({
                        Year: year,
                        Year_Type: yearType,
                        Country: country,
                        ...yearsData[year],
                        IndicatorName: indicatorData.indicatorDetails.IndicatorName,
                    });
                }
            }
        }
    }

    displayFilteredData(filteredData);
}

function clearFilters() {
    appliedFilters = {
        indicator: '',
        yearType: '',
        country: '',
        category: ''
    };

    document.getElementById('indicatorFilter').value = '';
    document.getElementById('yearTypeFilter').value = '';
    document.getElementById('countryFilter').value = '';
    document.getElementById('categoryFilter').value = '';

    applyFilters();
}

function displayFilteredData(data) {
    const container = document.getElementById('organizedTables');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<p>No data found matching the filters.</p>';
        return;
    }

    let table = `<table><thead><tr><th>Year</th><th>Year Type</th><th>Country</th><th>Indicator Name</th><th>Category ID</th><th>Secondary ID</th><th>Group Name</th><th>Proxy</th><th>Source</th><th>Value</th><th>Value (Numeric)</th><th>Value Map</th><th>Value Standardized</th><th>Positive</th><th>Value Standardized (Table)</th><th>Actions</th></tr></thead><tbody>`;
    data.forEach(entry => {
        const rowId = `${entry.ID}-${entry.Year_Type}-${entry.Country}-${entry.Year}`;
        const indicatorId = entry.ID;

        table += `<tr id="${rowId}">
                    <td>${entry.Year}</td>
                    <td>${entry.Year_Type}</td>
                    <td>${entry.Country}</td>
                    <td>${entry.IndicatorName}</td>
                    <td>${entry.Category_ID}</td>
                    <td>${entry.Secondary_ID}</td>
                    <td>${entry.Group_Name}</td>
                    <td>${entry.Proxy}</td>
                    <td>${entry.Source}</td>
                    <td>${entry.Value}</td>
                    <td>${entry.Value_N}</td>
                    <td>${entry.Value_Map}</td>
                    <td>${entry.Value_Standardized}</td>
                    <td>${entry.Positive}</td>
                    <td>${entry.Value_Standardized_Table}</td>
                    <td>
                        <button onclick="showSurveyForm('${rowId}', '${indicatorId}', '${entry.Year_Type}', '${entry.Country}', '${entry.Year}')">Edit</button>
                    </td>
                  </tr>`;
        table += `<tr id="form-${rowId}" style="display: none;"><td colspan="16"></td></tr>`;
    });
    table += '</tbody></table>';
    container.innerHTML = table;
}

function showSurveyForm(rowId, indicatorId, yearType, country, year) {
    console.log(`Editing rowId: ${rowId}, indicatorId: ${indicatorId}, yearType: ${yearType}, country: ${country}, year: ${year}`);

    if (!indicatorDict[indicatorId]) {
        console.error(`Indicator ID ${indicatorId} not found.`);
        return;
    }

    const indicatorData = indicatorDict[indicatorId].data[yearType];
    if (!indicatorData) {
        console.error(`Year Type ${yearType} not found for Indicator ID ${indicatorId}.`);
        return;
    }

    const countryData = indicatorData[country];
    if (!countryData) {
        console.error(`Country ${country} not found for Year Type ${yearType} and Indicator ID ${indicatorId}.`);
        return;
    }

    const data = countryData[year];
    if (!data) {
        console.error(`Year ${year} not found for Country ${country}, Year Type ${yearType}, and Indicator ID ${indicatorId}.`);
        return;
    }

    const formRow = document.getElementById(`form-${rowId}`);
    const indicatorDetails = indicatorDict[indicatorId].indicatorDetails;

    const groupCategoryMapping = {
        "People": 1,
        "Prosperity": 2,
        "Planet": 3,
        "Vision": 4,
        "Infrastructure": 5,
        "Digital": 6,
        "Cross Cutting": 7
    };

    formRow.style.display = '';

    let groupNameOptions = '';
    for (const [groupName, categoryId] of Object.entries(groupCategoryMapping)) {
        const selected = indicatorDetails.Group_Name === groupName ? 'selected' : '';
        groupNameOptions += `<option value="${categoryId}" ${selected}>${groupName}</option>`;
    }

    // Build the year table
    let yearTable = '<table><thead><tr><th>Country</th><th>Year</th><th>Year Type</th></tr></thead><tbody>';
    const countries = Object.keys(indicatorDetails.Years || {});

    countries.forEach(countryCode => {
        // Fetch year and year type based on the correct structure
        const countryYear = indicatorDetails.Years[countryCode] || '';
        const countryYearType = indicatorDetails.Year_Types[countryCode] || '';

        yearTable += `<tr class="countryYearRow-${rowId}">
            <td><input type="text" class="countryField" value="${countryCode}" readonly /></td>
            <td><input type="text" class="yearField" value="${countryYear}" /></td>
            <td><input type="text" class="yearTypeField" value="${countryYearType}" /></td>
        </tr>`;
    });

    yearTable += '</tbody></table>';

    formRow.innerHTML = `
        <td colspan="16">
            <div id="surveyForm">
                <h3>Survey Form for ${indicatorDetails.IndicatorName || ''}</h3>

                <div class="toggle-buttons">
                    <button type="button" onclick="toggleEditMode('${rowId}', 'indicator')">Edit Indicator Info</button>
                    <button type="button" onclick="toggleEditMode('${rowId}', 'score')">Edit Score Value</button>
                </div>
                <form id="surveyDataForm-${rowId}">
                    <!-- Indicator Fields -->
                    <div class="indicatorField">
                        <div class="form-group">
                            <label for="indicatorNameInput-${rowId}">Indicator Name:</label>
                            <input type="text" id="indicatorNameInput-${rowId}" value="${indicatorDetails.IndicatorName || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="proxyInput-${rowId}">Proxy:</label>
                            <input type="text" id="proxyInput-${rowId}" value="${indicatorDetails.Proxy || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="indicatorAPIURL-${rowId}">API URL:</label>
                            <input type="text" id="indicatorAPIURL-${rowId}" value="${indicatorDetails.API_url || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="indicatorDataset-${rowId}">Dataset ID:</label>
                            <input type="text" id="indicatorDataset-${rowId}" value="${indicatorDetails.Dataset || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="indicatorCodeInput-${rowId}">Indicator Code:</label>
                            <input type="text" id="indicatorCodeInput-${rowId}" value="${indicatorDetails.IndicatorCode || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="groupNameInput-${rowId}">Category Name:</label>
                            <select id="groupNameInput-${rowId}" onchange="updateCategoryId('${rowId}')">
                                ${groupNameOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="categoryIdInput-${rowId}">Category ID:</label>
                            <input type="text" id="categoryIdInput-${rowId}" value="${indicatorDetails.Category_ID || ''}" readonly />
                        </div>
                        <div class="form-group">
                            <label for="positiveNegativeIndicatorInput-${rowId}">Indicator Direction:</label>
                            <select id="positiveNegativeIndicatorInput-${rowId}">
                                <option value="true" ${indicatorDetails.Positive_Negative_Indicator === true ? 'selected' : ''}>Positive Indicator (Higher is better)</option>
                                <option value="false" ${indicatorDetails.Positive_Negative_Indicator === false ? 'selected' : ''}>Negative Indicator (Lower is better)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="numberPercentInput-${rowId}">Value Type:</label>
                            <select id="numberPercentInput-${rowId}">
                                <option value="number" ${indicatorDetails.Number_Percent === 'number' ? 'selected' : ''}>Number</option>
                                <option value="percent" ${indicatorDetails.Number_Percent === 'percent' ? 'selected' : ''}>Percent</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="sourceIndicatorInput-${rowId}">Source:</label>
                            <input type="text" id="sourceIndicatorInput-${rowId}" value="${indicatorDetails.Source || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="notesInput-${rowId}">Notes:</label>
                            <textarea id="notesInput-${rowId}">${indicatorDetails.Notes || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Year and Year Type by Country:</label>
                            ${yearTable}
                            <button type="button" onclick="addCountryYearRow('${rowId}')">Add Country</button>
                        </div>
                    </div>

                    <!-- Scorecard Fields -->
                    <div class="scoreField" style="display: none;">
                        <div class="form-group">
                            <label for="CountryInput-${rowId}">Country:</label>
                            <input type="text" id="CountryInput-${rowId}" value="${data.Country || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="IndicatorInput-${rowId}">Indicator:</label>
                            <input type="text" id="IndicatorInput-${rowId}" value="${data.Indicator_Name || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="ProxyInput-${rowId}">Proxy:</label>
                            <input type="text" id="ProxyInput-${rowId}" value="${data.Proxy || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="SourceInputScorecard-${rowId}">Source:</label>
                            <input type="text" id="SourceInputScorecard-${rowId}" value="${data.Source || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="IndicatorIDInput-${rowId}">Indicator ID:</label>
                            <input type="text" id="IndicatorIDInput-${rowId}" value="${data.ID || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="groupNameInputScoreCard-${rowId}">Group Name:</label>
                            <select id="groupNameInputScoreCard-${rowId}" onchange="updateCategoryIdScorecard('${rowId}')">
                                ${groupNameOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="categoryIdInputScorecard-${rowId}">Category ID:</label>
                            <input type="text" id="categoryIdInputScorecard-${rowId}" value="${data.Category_ID || ''}" readonly />
                        </div>
                        <div class="form-group">
                            <label for="YearInput-${rowId}">Year:</label>
                            <input type="text" id="YearInput-${rowId}" value="${data.Year || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="YearTypeInput-${rowId}">Year Type:</label>
                            <input type="text" id="YearTypeInput-${rowId}" value="${data.Year_Type || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="valueInput-${rowId}">Value:</label>
                            <input type="text" id="valueInput-${rowId}" value="${data.Value || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="valueNInput-${rowId}">Value (Numeric):</label>
                            <input type="text" id="valueNInput-${rowId}" value="${data.Value_N || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="valueMapInput-${rowId}">Value Map:</label>
                            <input type="text" id="valueMapInput-${rowId}" value="${data.Value_Map || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="valueStandardizedInput-${rowId}">Value Standardized:</label>
                            <input type="text" id="valueStandardizedInput-${rowId}" value="${data.Value_Standardized || ''}" />
                        </div>
                        <div class="form-group">
                            <label for="positiveInput-${rowId}">Positive:</label>
                            <input type="checkbox" id="positiveInput-${rowId}" ${data.Positive ? 'checked' : ''} />
                        </div>
                        <div class="form-group">
                            <label for="valueStandardizedTableInput-${rowId}">Value Standardized (Table):</label>
                            <input type="text" id="valueStandardizedTableInput-${rowId}" value="${data.Value_Standardized_Table || ''}" />
                        </div>
                    </div>

                    <button type="button" onclick="saveSurveyData('${rowId}', '${indicatorId}', '${yearType}', '${country}', '${year}')">Save</button>
                    <button type="button" onclick="closeForm('${rowId}')">Close</button>
                </form>
            </div>
        </td>
    `;
}

function toggleEditMode(rowId, mode) {
    const form = document.getElementById(`surveyDataForm-${rowId}`);
    const indicatorFields = form.querySelector('.indicatorField');
    const scoreFields = form.querySelector('.scoreField');

    if (mode === 'indicator') {
        indicatorFields.style.display = 'block';
        scoreFields.style.display = 'none';
    } else {
        indicatorFields.style.display = 'none';
        scoreFields.style.display = 'block';
    }
}

function updateCategoryId(rowId) {
    const groupNameInput = document.getElementById(`groupNameInput-${rowId}`);
    const selectedGroupName = groupNameInput.options[groupNameInput.selectedIndex].text;
    const categoryIdInput = document.getElementById(`categoryIdInput-${rowId}`);

    const groupCategoryMapping = {
        "People": 1,
        "Prosperity": 2,
        "Planet": 3,
        "Vision": 4,
        "Infrastructure": 5,
        "Digital": 6,
        "Cross Cutting": 7
    };

    categoryIdInput.value = groupCategoryMapping[selectedGroupName] || '';
}

function updateCategoryIdScorecard(rowId) {
    const groupNameInput = document.getElementById(`groupNameInputScoreCard-${rowId}`);
    const selectedGroupName = groupNameInput.options[groupNameInput.selectedIndex].text;
    const categoryIdInput = document.getElementById(`categoryIdInputScorecard-${rowId}`);

    const groupCategoryMapping = {
        "People": 1,
        "Prosperity": 2,
        "Planet": 3,
        "Vision": 4,
        "Infrastructure": 5,
        "Digital": 6,
        "Cross Cutting": 7
    };

    categoryIdInput.value = groupCategoryMapping[selectedGroupName] || '';
}

// Function to add a new country-year row in the indicator form
function addCountryYearRow(rowId) {
    const yearTableBody = document.querySelector(`#surveyDataForm-${rowId} .form-group table tbody`);
    const newRow = document.createElement('tr');
    newRow.classList.add(`countryYearRow-${rowId}`);
    newRow.innerHTML = `
        <td><input type="text" class="countryField" value="" /></td>
        <td><input type="text" class="yearField" value="" /></td>
        <td><input type="text" class="yearTypeField" value="" /></td>
    `;
    yearTableBody.appendChild(newRow);
}

// Function to close the form when editing an existing entry
function closeForm(rowId) {
    const formRow = document.getElementById(`form-${rowId}`);
    formRow.style.display = 'none';
    formRow.innerHTML = `<td colspan="16"></td>`;
}

// Function to close the new entry form
function closeNewEntryForm() {
    const container = document.getElementById('newEntryContainer');
    container.innerHTML = '';
}

// Modify the saveSurveyData function to handle new entries
async function saveSurveyData(rowId, indicatorId, yearType, country, year) {
    const form = document.getElementById(`surveyDataForm-${rowId}`);

    // Determine if we are in indicator mode or scorecard mode
    const isIndicatorMode = form.querySelector('.indicatorField').style.display !== 'none' || form.querySelector('.indicatorField') !== null;
    const numberPercentValue = form.querySelector(`#numberPercentInput-${rowId}`)?.value;
    const positiveNegativeValue = form.querySelector(`#positiveNegativeIndicatorInput-${rowId}`)?.value;

    if (isIndicatorMode) {
        // Indicator-specific data
        const indicatorData = {
            id: indicatorId ? parseInt(indicatorId) : null, // If indicatorId is null, it's a new indicator
            indicator_id: indicatorId ? parseInt(indicatorId) : null,
            api_url: form.querySelector(`#indicatorAPIURL-${rowId}`)?.value || '',
            dataset: form.querySelector(`#indicatorDataset-${rowId}`)?.value || '',
            indicator_code: form.querySelector(`#indicatorCodeInput-${rowId}`)?.value || '',
            indicator_name: form.querySelector(`#indicatorNameInput-${rowId}`)?.value || '',
            positive_negative_indicator: positiveNegativeValue === 'true',
            number_percent: numberPercentValue === 'percent' ? 'percent' : 'number',
            proxy: form.querySelector(`#proxyInput-${rowId}`)?.value || '',
            category: form.querySelector(`#groupNameInput-${rowId}`)?.options[form.querySelector(`#groupNameInput-${rowId}`).selectedIndex].text || '',
            category_id: parseInt(form.querySelector(`#categoryIdInput-${rowId}`)?.value) || '',
            source: form.querySelector(`#sourceIndicatorInput-${rowId}`)?.value || '',
            notes: form.querySelector(`#notesInput-${rowId}`)?.value || ''
        };

        // Extract year and year_type from the table as dictionaries
        const yearTypeDict = {};
        const yearDict = {};

        // Iterate over table rows to capture year and year_type for each country
        const countryRows = form.querySelectorAll(`.countryYearRow-${rowId}`);
        countryRows.forEach(row => {
            const countryCode = row.querySelector('.countryField')?.value || '';
            const yearValue = parseInt(row.querySelector('.yearField')?.value) || null;
            const yearTypeValue = parseInt(row.querySelector('.yearTypeField')?.value) || null;

            if (countryCode) {
                yearTypeDict[countryCode] = yearTypeValue;
                yearDict[countryCode] = yearValue;
            }
        });

        // Add the dictionaries to the indicatorData object
        indicatorData.years = yearDict;
        indicatorData.year_types = yearTypeDict;

        // Send indicator data to the API
        try {
            const response = await fetch('/api/save_indicator', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(indicatorData),
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Indicator data saved successfully!');
                window.location.reload();  // Reload the page after a successful save
            } else {
                alert(result.error || 'Failed to save indicator data.');
            }
        } catch (error) {
            console.error('Error saving indicator data:', error);
            alert(`An error occurred while saving indicator data: ${error.message}`);
        }

    } else {
        // Scorecard-specific data
        const isNewEntry = rowId === 'new-scorecard';
        const secondaryId = isNewEntry ? null : parseInt(rowId.split('-')[0]);  // Extract Secondary_ID from rowId

        const scorecardData = {
            secondary_id: secondaryId,
            id: form.querySelector(`#IndicatorIDInput-${rowId}`)?.value || null,
            category_id: form.querySelector(`#categoryIdInputScorecard-${rowId}`)?.value || '',
            group_name: form.querySelector(`#groupNameInputScoreCard-${rowId}`)?.options[form.querySelector(`#groupNameInputScoreCard-${rowId}`).selectedIndex].text || '',
            indicator: form.querySelector(`#IndicatorInput-${rowId}`)?.value || '',
            proxy: form.querySelector(`#ProxyInput-${rowId}`)?.value || '',
            country: form.querySelector(`#CountryInput-${rowId}`)?.value || '',
            year: form.querySelector(`#YearInput-${rowId}`)?.value || '',
            year_type: form.querySelector(`#YearTypeInput-${rowId}`)?.value || '',
            source: form.querySelector(`#SourceInputScorecard-${rowId}`)?.value || '',
            value: form.querySelector(`#valueInput-${rowId}`)?.value || '',
            value_n: form.querySelector(`#valueNInput-${rowId}`)?.value || '',
            value_map: form.querySelector(`#valueMapInput-${rowId}`)?.value || '',
            value_standardized: form.querySelector(`#valueStandardizedInput-${rowId}`)?.value || '',
            positive: form.querySelector(`#positiveInput-${rowId}`)?.checked || false,
            value_standardized_table: form.querySelector(`#valueStandardizedTableInput-${rowId}`)?.value || ''
        };

        // Send scorecard data to the API
        try {
            const response = await fetch('/api/save_scorecard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scorecardData),
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Scorecard data saved successfully!');
                window.location.reload();  // Reload the page after a successful save
            } else {
                alert(result.error || 'Failed to save scorecard data.');
            }
        } catch (error) {
            console.error('Error saving scorecard data:', error);
            alert(`An error occurred while saving scorecard data: ${error.message}`);
        }
    }
}

// Function to show the form for adding a new indicator
function showNewIndicatorForm() {
    const container = document.getElementById('newEntryContainer');
    container.innerHTML = ''; // Clear any existing content

    const rowId = 'new-indicator';

    const groupCategoryMapping = {
        "People": 1,
        "Prosperity": 2,
        "Planet": 3,
        "Vision": 4,
        "Infrastructure": 5,
        "Digital": 6,
        "Cross Cutting": 7
    };

    let groupNameOptions = '';
    for (const [groupName, categoryId] of Object.entries(groupCategoryMapping)) {
        groupNameOptions += `<option value="${categoryId}">${groupName}</option>`;
    }

    // Empty year table with the option to add more rows
    let yearTable = '<table><thead><tr><th>Country</th><th>Year</th><th>Year Type</th></tr></thead><tbody>';
    yearTable += `<tr class="countryYearRow-${rowId}">
        <td><input type="text" class="countryField" value="" /></td>
        <td><input type="text" class="yearField" value="" /></td>
        <td><input type="text" class="yearTypeField" value="" /></td>
    </tr>`;
    yearTable += '</tbody></table>';

    container.innerHTML = `
        <div id="surveyForm">
            <h3>Create New Indicator</h3>
            <form id="surveyDataForm-${rowId}">
                <!-- Indicator Fields -->
                <div class="indicatorField">
                    <div class="form-group">
                        <label for="indicatorNameInput-${rowId}">Indicator Name:</label>
                        <input type="text" id="indicatorNameInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="proxyInput-${rowId}">Proxy:</label>
                        <input type="text" id="proxyInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="indicatorAPIURL-${rowId}">API URL:</label>
                        <input type="text" id="indicatorAPIURL-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="indicatorDataset-${rowId}">Dataset ID:</label>
                        <input type="text" id="indicatorDataset-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="indicatorCodeInput-${rowId}">Indicator Code:</label>
                        <input type="text" id="indicatorCodeInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="groupNameInput-${rowId}">Category Name:</label>
                        <select id="groupNameInput-${rowId}" onchange="updateCategoryId('${rowId}')">
                            ${groupNameOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="categoryIdInput-${rowId}">Category ID:</label>
                        <input type="text" id="categoryIdInput-${rowId}" value="" readonly />
                    </div>
                    <div class="form-group">
                        <label for="positiveNegativeIndicatorInput-${rowId}">Indicator Direction:</label>
                        <select id="positiveNegativeIndicatorInput-${rowId}">
                            <option value="true">Positive Indicator (Higher is better)</option>
                            <option value="false">Negative Indicator (Lower is better)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="numberPercentInput-${rowId}">Value Type:</label>
                        <select id="numberPercentInput-${rowId}">
                            <option value="number">Number</option>
                            <option value="percent">Percent</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="sourceIndicatorInput-${rowId}">Source:</label>
                        <input type="text" id="sourceIndicatorInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="notesInput-${rowId}">Notes:</label>
                        <textarea id="notesInput-${rowId}"></textarea>
                    </div>
                    <div class="form-group">
                        <label>Year and Year Type by Country:</label>
                        ${yearTable}
                        <button type="button" onclick="addCountryYearRow('${rowId}')">Add Country</button>
                    </div>
                </div>

                <button type="button" onclick="saveSurveyData('${rowId}', null, null, null, null)">Save</button>
                <button type="button" onclick="closeNewEntryForm()">Close</button>
            </form>
        </div>
    `;
}

// Function to show the form for adding a new scorecard value
function showNewScorecardForm() {
    const container = document.getElementById('newEntryContainer');
    container.innerHTML = ''; // Clear any existing content

    const rowId = 'new-scorecard';

    const groupCategoryMapping = {
        "People": 1,
        "Prosperity": 2,
        "Planet": 3,
        "Vision": 4,
        "Infrastructure": 5,
        "Digital": 6,
        "Cross Cutting": 7
    };

    let groupNameOptions = '';
    for (const [groupName, categoryId] of Object.entries(groupCategoryMapping)) {
        groupNameOptions += `<option value="${categoryId}">${groupName}</option>`;
    }

    container.innerHTML = `
        <div id="surveyForm">
            <h3>Create New Scorecard Value</h3>
            <form id="surveyDataForm-${rowId}">
                <!-- Scorecard Fields -->
                <div class="scoreField">
                    <div class="form-group">
                        <label for="CountryInput-${rowId}">Country:</label>
                        <input type="text" id="CountryInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="IndicatorInput-${rowId}">Indicator:</label>
                        <input type="text" id="IndicatorInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="ProxyInput-${rowId}">Proxy:</label>
                        <input type="text" id="ProxyInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="SourceInputScorecard-${rowId}">Source:</label>
                        <input type="text" id="SourceInputScorecard-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="IndicatorIDInput-${rowId}">Indicator ID:</label>
                        <input type="text" id="IndicatorIDInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="groupNameInputScoreCard-${rowId}">Group Name:</label>
                        <select id="groupNameInputScoreCard-${rowId}" onchange="updateCategoryIdScorecard('${rowId}')">
                            ${groupNameOptions}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="categoryIdInputScorecard-${rowId}">Category ID:</label>
                        <input type="text" id="categoryIdInputScorecard-${rowId}" value="" readonly />
                    </div>
                    <div class="form-group">
                        <label for="YearInput-${rowId}">Year:</label>
                        <input type="text" id="YearInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="YearTypeInput-${rowId}">Year Type:</label>
                        <input type="text" id="YearTypeInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="valueInput-${rowId}">Value:</label>
                        <input type="text" id="valueInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="valueNInput-${rowId}">Value (Numeric):</label>
                        <input type="text" id="valueNInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="valueMapInput-${rowId}">Value Map:</label>
                        <input type="text" id="valueMapInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="valueStandardizedInput-${rowId}">Value Standardized:</label>
                        <input type="text" id="valueStandardizedInput-${rowId}" value="" />
                    </div>
                    <div class="form-group">
                        <label for="positiveInput-${rowId}">Positive:</label>
                        <input type="checkbox" id="positiveInput-${rowId}" />
                    </div>
                    <div class="form-group">
                        <label for="valueStandardizedTableInput-${rowId}">Value Standardized (Table):</label>
                        <input type="text" id="valueStandardizedTableInput-${rowId}" value="" />
                    </div>
                </div>

                <button type="button" onclick="saveSurveyData('${rowId}', null, null, null, null)">Save</button>
                <button type="button" onclick="closeNewEntryForm()">Close</button>
            </form>
        </div>
    `;
}

window.addEventListener('load', loadIndicators);
