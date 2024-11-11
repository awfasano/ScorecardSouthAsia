<h1>South Asia Region Data Pipeline</h1>
https://automationwbrise.uc.r.appspot.com


<h2>Project Description</h2>

<p>The <strong>South Asia Region Data Pipeline</strong> is a comprehensive platform designed to support the South Asia Region Scorecard. This project includes a web application, cloud functions, and a database that together facilitate the collection, processing, and visualization of socio-economic indicators across South Asian countries.</p>

<h2>Features</h2>

<h3>1. Web Application</h3>
<ul>
    <li><strong>Visualization:</strong> The web application provides a demo visualization of the scorecard, allowing users to explore the collected data through an interactive dashboard.</li>
    <li><strong>Database Interaction:</strong> Users can connect to the database directly through the web app, enabling them to edit and add values. Any changes made will be automatically reflected in the dashboard.</li>
</ul>

<h3>2. Cloud Function</h3>
<ul>
    <li><strong>Data Collection:</strong> A cloud function application is responsible for fetching the most recent indicator information from various sources, including World Bank APIs and several other websites.</li>
    <li><strong>Automated Updates:</strong> The indicator table in the database contains an <code>api_url</code>, <code>dataset</code>, and <code>indicator_id</code>, which are used to automatically retrieve the data from the correct sources. As more coverage is added to the databases, indicators without current coverage can be updated for automated collection.</li>
</ul>

<h3>3. Database</h3>
<p><strong>Database Structure:</strong> The project uses a structured database to store all relevant data. Below are the details of the two main tables:</p>

<h4>scorecard_indicators2</h4>
<table>
    <thead>
        <tr>
            <th>Column Name</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>id</td>
            <td>Primary key identifier for each record.</td>
        </tr>
        <tr>
            <td>secondary_id</td>
            <td>Secondary identifier.</td>
        </tr>
        <tr>
            <td>group_name</td>
            <td>Name of the group the indicator belongs to.</td>
        </tr>
        <tr>
            <td>indicator</td>
            <td>Name of the indicator.</td>
        </tr>
        <tr>
            <td>proxy</td>
            <td>Proxy information for the indicator.</td>
        </tr>
        <tr>
            <td>country</td>
            <td>Country associated with the indicator.</td>
        </tr>
        <tr>
            <td>year</td>
            <td>Year of the data.</td>
        </tr>
        <tr>
            <td>year_type</td>
            <td>Type of year (1, 2, or 3).</td>
        </tr>
        <tr>
            <td>source</td>
            <td>Source of the data.</td>
        </tr>
        <tr>
            <td>value</td>
            <td>Actual value of the indicator.</td>
        </tr>
        <tr>
            <td>value_n</td>
            <td>Normalized value of the indicator.</td>
        </tr>
        <tr>
            <td>value_map</td>
            <td>Mapping of the value to a standardized format.</td>
        </tr>
        <tr>
            <td>value_standardized</td>
            <td>Standardized value for cross-country comparison.</td>
        </tr>
        <tr>
            <td>positive</td>
            <td>Indicates whether the value is positive or negative.</td>
        </tr>
        <tr>
            <td>value_standardized_table</td>
            <td>Link to the table containing standardized values.</td>
        </tr>
        <tr>
            <td>category_id</td>
            <td>Identifier for the category the indicator belongs to.</td>
        </tr>
    </tbody>
</table>

<h4>indicators_revised</h4>
<table>
    <thead>
        <tr>
            <th>Column Name</th>
            <th>Description</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>id</td>
            <td>Primary key identifier for each record.</td>
        </tr>
        <tr>
            <td>indicator_id</td>
            <td>Identifier linking to the <code>scorecard_indicators2</code> table.</td>
        </tr>
        <tr>
            <td>api_url</td>
            <td>URL for the API from which data is fetched.</td>
        </tr>
        <tr>
            <td>category</td>
            <td>Category of the indicator.</td>
        </tr>
        <tr>
            <td>category_id</td>
            <td>Identifier for the category.</td>
        </tr>
        <tr>
            <td>dataset</td>
            <td>Dataset name from which the indicator is retrieved.</td>
        </tr>
        <tr>
            <td>indicator_code</td>
            <td>Code used for the indicator.</td>
        </tr>
        <tr>
            <td>indicator_name</td>
            <td>Name of the indicator.</td>
        </tr>
        <tr>
            <td>positive_negative_indicator</td>
            <td>Indicates whether the indicator's values are positive or negative.</td>
        </tr>
        <tr>
            <td>number_percent</td>
            <td>Specifies whether the value is a number or a percentage.</td>
        </tr>
        <tr>
            <td>notes</td>
            <td>Additional notes related to the indicator.</td>
        </tr>
        <tr>
            <td>afghanistan_year</td>
            <td>Year of data for Afghanistan.</td>
        </tr>
        <tr>
            <td>bangladesh_year</td>
            <td>Year of data for Bangladesh.</td>
        </tr>
        <tr>
            <td>india_year</td>
            <td>Year of data for India.</td>
        </tr>
        <tr>
            <td>maldives_year</td>
            <td>Year of data for Maldives.</td>
        </tr>
        <tr>
            <td>nepal_year</td>
            <td>Year of data for Nepal.</td>
        </tr>
        <tr>
            <td>pakistan_year</td>
            <td>Year of data for Pakistan.</td>
        </tr>
        <tr>
            <td>sri_lanka_year</td>
            <td>Year of data for Sri Lanka.</td>
        </tr>
        <tr>
            <td>afghanistan_year_type</td>
            <td>Year type for Afghanistan.</td>
        </tr>
        <tr>
            <td>bangladesh_year_type</td>
            <td>Year type for Bangladesh.</td>
        </tr>
        <tr>
            <td>india_year_type</td>
            <td>Year type for India.</td>
        </tr>
        <tr>
            <td>maldives_year_type</td>
            <td>Year type for Maldives.</td>
        </tr>
        <tr>
            <td>nepal_year_type</td>
            <td>Year type for Nepal.</td>
        </tr>
        <tr>
            <td>pakistan_year_type</td>
            <td>Year type for Pakistan.</td>
        </tr>
        <tr>
            <td>sri_lanka_year_type</td>
            <td>Year type for Sri Lanka.</td>
        </tr>
    </tbody>
</table>



<h2>Usage</h2>

<ol>
    <li><strong>Web App:</strong> Navigate to the web application in your browser to interact with the scorecard and database.</li>
    <li><strong>Cloud Function:</strong> The cloud function set on a schedule to keep the database updated with the latest indicators.</li>
    <li><strong>Database Interaction:</strong> Use the web app to add or edit indicator values. Changes will be reflected in the scorecard visualizations.</li>
</ol>

<h2>Contact</h2>

<p>For any questions or issues, please contact Anthony Fasano at afasano@worldbank.org.</p>

<h2>Acknowledgments</h2>

<p>thanks to the teams at the World Bank for their continuous support and contributions to this project.</p>
