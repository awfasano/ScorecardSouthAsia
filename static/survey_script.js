// MSAL configuration
const msalConfig = {
    auth: {
        clientId: "6f9b2b30-f0f4-4630-a452-9245f295c947", // Replace with your Azure AD app client ID
        authority: "https://login.microsoftonline.com/eeadad2d-ff1a-48de-a8a6-20d1d35e4faf",
        redirectUri: "https://automationwbrise.uc.r.appspot.com/data_input"
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    }
};

const msalInstance = new msal.PublicClientApplication(msalConfig);

let userEmail = '';
let indicatorData = {};  // Store indicator-related information for dynamic form population

// Elements
const loginButton = document.getElementById('login-button');
const dataEntryDiv = document.getElementById('data-entry');
const userInfoDiv = document.getElementById('user-info');
const greeting = document.getElementById('greeting');
const indicatorDropdown = document.getElementById('IndicatorDropdown');
const categoryDropdown = document.getElementById('CategoryDropdown');
const yearTypeDropdown = document.getElementById('YearTypeDropdown');
const countryDropdown = document.getElementById('CountryDropdown');  // Add country dropdown
const welcomeHeader = document.querySelector('h1');

// South Asian countries
const southAsianCountries = ["AFG", "BAN", "BHU", "IND", "MLD", "NPL", "PAK", "LKA"];

// Login button click handler
loginButton.addEventListener('click', () => {
    msalInstance.loginPopup({
        scopes: ["user.read"]
    }).then(response => {
        console.log("Login successful:", response);
        getUserProfile(response.accessToken);
    }).catch(error => {
        console.error("Login failed:", error);
    });
});

// Get User Profile
function getUserProfile(accessToken) {
    fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    })
        .then(response => response.json())
        .then(user => {
            userEmail = user.mail || user.userPrincipalName; // Get email or userPrincipalName if mail is not available
            const userName = user.displayName;

            // Display the user's name and show the data entry form
            greeting.innerText = `Hello, ${userName}`;
            userInfoDiv.style.display = 'block';
            loginButton.style.display = 'none';
            dataEntryDiv.style.display = 'block';
            welcomeHeader.style.display = 'block';

            // Fetch and populate indicators, categories, and year types
            populateIndicators();
            populateCategories();
            populateYearTypes();
        })
        .catch(error => {
            console.error('Error fetching user profile:', error);
        });
}

// Fetch indicators from the backend and populate the dropdown
function populateIndicators() {
    fetch('/api/indicators')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("Error fetching indicators:", data.error);
            } else {
                // Store indicator data for dynamic population
                indicatorData = data;

                // Populate dropdown with indicators
                data.forEach(indicator => {
                    const option = document.createElement('option');
                    option.value = indicator.ID; // Correct use of IndicatorID
                    option.text = indicator.IndicatorName; // Correct use of IndicatorName
                    indicatorDropdown.add(option);
                });

                // Add event listener to detect when the user selects an indicator
                indicatorDropdown.addEventListener('change', () => {
                    const selectedIndicatorId = indicatorDropdown.value;
                    if (selectedIndicatorId) {
                        populateIndicatorFields(selectedIndicatorId);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Populate fields based on the selected indicator
function populateIndicatorFields(indicatorId) {
    // Find the selected indicator in the indicatorData array
    const selectedIndicator = indicatorData.find(indicator => indicator.ID == indicatorId); // Compare with IndicatorID

    if (selectedIndicator) {
        // Populate form fields with the selected indicator's data
        document.getElementById('ProxyInput').value = selectedIndicator.Proxy || '';
        document.getElementById('SourceInputScorecard').value = selectedIndicator.Source || '';
        document.getElementById('CategoryIDInput').value = selectedIndicator.CategoryID || ''; // Use CategoryID
        document.getElementById('indicatorCodeInput').value = selectedIndicator.IndicatorCode || ''; // Use IndicatorCode
        document.getElementById('DatasetInput').value = selectedIndicator.Dataset || ''; // Use Dataset

        // Populate the country dropdown
        populateCountryDropdown(selectedIndicator);

        // Reset Year and Year Type fields
        document.getElementById('YearInput').value = '';
        yearTypeDropdown.innerHTML = '<option value="">Select a Year Type</option>';
    }
}

// Populate the country dropdown based on available data
function populateCountryDropdown(indicator) {
    countryDropdown.innerHTML = ''; // Clear existing options

    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.text = 'Select a Country';
    countryDropdown.appendChild(optionDefault);

    // Only populate countries that are in the South Asian countries list and have data in Years
    southAsianCountries.forEach(countryCode => {
        if (indicator.Years && indicator.Years[countryCode]) {
            const option = document.createElement('option');
            option.value = countryCode;
            option.text = countryCode; // You could use full country names if available
            countryDropdown.appendChild(option);
        }
    });

    // Add event listener to country dropdown
    countryDropdown.addEventListener('change', () => {
        const selectedCountry = countryDropdown.value;
        if (selectedCountry) {
            populateYearAndYearType(indicator, selectedCountry);
        } else {
            // Reset year and year type if no country is selected
            document.getElementById('YearInput').value = '';
            yearTypeDropdown.innerHTML = '<option value="">Select a Year Type</option>';
        }
    });
}

// Populate the year and year type based on the selected country
function populateYearAndYearType(indicator, countryCode) {
    // Set the year for the selected country
    document.getElementById('YearInput').value = indicator.Years[countryCode] || '';

    // Populate the Year Type dropdown
    yearTypeDropdown.innerHTML = ''; // Clear existing options
    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.text = 'Select a Year Type';
    yearTypeDropdown.appendChild(optionDefault);

    const yearType = indicator.Year_Types[countryCode];
    if (yearType) {
        const option = document.createElement('option');
        option.value = yearType;
        option.text = `Year Type ${yearType}`;
        yearTypeDropdown.appendChild(option);
    }
}

// Fetch categories from the backend and populate the dropdown
function populateCategories() {
    const categories = ["People", "Prosperity", "Planet", "Vision", "Infrastructure", "Digital", "Cross Cutting"];
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.text = category;
        categoryDropdown.add(option);
    });
}

// Populate Year Types (general)
function populateYearTypes() {
    const yearTypes = ["1", "2", "3"];
    yearTypes.forEach(yearType => {
        const option = document.createElement('option');
        option.value = yearType;
        option.text = `Year Type ${yearType}`;
        yearTypeDropdown.add(option);
    });
}

// Save Survey Data - to be sent to Flask server
function saveSurveyData() {
    const surveyData = {
        user_email: userEmail, // Include the user's email in the data
        country: countryDropdown.value, // Use the selected country
        indicator: indicatorDropdown.options[indicatorDropdown.selectedIndex].text,
        proxy: document.getElementById('ProxyInput').value,
        source: document.getElementById('SourceInputScorecard').value,
        indicator_id: indicatorDropdown.value,
        year: document.getElementById('YearInput').value,
        year_type: yearTypeDropdown.value,
        value: document.getElementById('valueInput').value,
        category: categoryDropdown.options[categoryDropdown.selectedIndex].text,
        category_id: document.getElementById('CategoryIDInput').value
    };

    fetch('/api/save_scorecard', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(surveyData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert(`Error: ${data.error}`);
            } else {
                alert('Scorecard saved successfully!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while saving the scorecard.');
        });
}
