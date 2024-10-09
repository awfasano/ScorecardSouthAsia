from Classes.Indicator import Indi
from db import Session

def get_all_indicators():
    """
    Fetch all indicators from the database.
    """
    session = Session()
    try:
        indicators = session.query(Indicator).all()
        return [
            {
                'ID': indicator.id,
                'IndicatorID': indicator.indicator_id,
                'API_url': indicator.api_url,
                'Category': indicator.category,
                'CategoryID': indicator.category_id,
                'Dataset': indicator.dataset,
                'IndicatorCode': indicator.indicator_code,
                'IndicatorName': indicator.indicator_name,
                'Positive_Negative_Indicator': indicator.positive_negative_indicator,
                'Number_Percent': indicator.number_percent,
                'Notes': indicator.notes,
                'Years': {
                    'AFG': indicator.afghanistan_year,
                    'BAN': indicator.bangladesh_year,
                    'IND': indicator.india_year,
                    'MLD': indicator.maldives_year,
                    'NEP': indicator.nepal_year,
                    'PAK': indicator.pakistan_year,
                    'LAK': indicator.sri_lanka_year,
                },
                'Year_Types': {
                    'AFG': indicator.afghanistan_year_type,
                    'BAN': indicator.bangladesh_year_type,
                    'IND': indicator.india_year_type,
                    'MLD': indicator.maldives_year_type,
                    'NEP': indicator.nepal_year_type,
                    'PAK': indicator.pakistan_year_type,
                    'LAK': indicator.sri_lanka_year_type,
                },
                'ScoreCardValues': [
                    {
                        'Secondary_ID': scorecard.secondary_id,
                        'Group_Name': scorecard.group_name,
                        'Country': scorecard.country,
                        'Year': scorecard.year,
                        'Year_Type': scorecard.year_type,
                        'Value': scorecard.value,
                        'Value_N': scorecard.value_n,
                        'Value_Standardized': scorecard.value_standardized,
                        'Positive': scorecard.positive,
                    } for scorecard in indicator.scorecard_values
                ]
            } for indicator in indicators
        ]
    except Exception as e:
        print(f"Error fetching indicators: {e}")
        return None
    finally:
        session.close()
