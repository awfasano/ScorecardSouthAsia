from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship, joinedload
from db import Base  # Import Base from your centralized module
import logging
import json  # Import json module for debugging
from Classes.Indicator import Indicator  # Ensure you import Indicator from the correct location

# Define the ScoreCardIndicator2 model
class ScoreCardIndicator2(Base):
    __tablename__ = 'scorecard_indicators2'
    secondary_id = Column(Integer, primary_key=True)

    # Define the foreign key to the Indicator table
    id = Column(Integer, ForeignKey('indicators_revised.id'))

    category_id = Column(Integer)
    group_name = Column(String)
    indicator = Column(String)  # Renamed to avoid conflict with relationship name
    proxy = Column(String)
    country = Column(String)
    year = Column(String)
    year_type = Column(Integer)
    source = Column(String)
    value = Column(String)
    value_n = Column(Float)
    value_map = Column(String)
    value_standardized = Column(Float)
    positive = Column(Boolean)
    value_standardized_table = Column(Float)

    # Define the relationship to the Indicator table
    indicator_details = relationship('Indicator', back_populates='scorecard_values')

# Fetching the data from the database with joinedload
def get_scorecard_indicator2_data():
    from db import Session  # Import Session here to avoid circular import issues

    session = Session()
    try:
        # Use joinedload to optimize fetching related Indicator data
        scorecards = session.query(ScoreCardIndicator2).options(joinedload(ScoreCardIndicator2.indicator_details)).all()
        result = []
        for scorecard in scorecards:
            indicator_data = None
            if scorecard.indicator_details:
                indicator_data = {
                    'IndicatorID': scorecard.indicator_details.indicator_id,
                    'API_url': scorecard.indicator_details.api_url,
                    'Category': scorecard.indicator_details.category,
                    'CategoryID': scorecard.indicator_details.category_id,
                    'Dataset': scorecard.indicator_details.dataset,
                    'Proxy': scorecard.indicator_details.proxy,
                    'Source': scorecard.indicator_details.source,
                    'IndicatorCode': scorecard.indicator_details.indicator_code,
                    'IndicatorName': scorecard.indicator_details.indicator_name,
                    'Positive_Negative_Indicator': scorecard.indicator_details.positive_negative_indicator,
                    'Number_Percent': scorecard.indicator_details.number_percent,
                    'Notes': scorecard.indicator_details.notes,
                    'Years': {
                        'AFG': scorecard.indicator_details.afghanistan_year,
                        'BAN': scorecard.indicator_details.bangladesh_year,
                        'IND': scorecard.indicator_details.india_year,
                        'MLD': scorecard.indicator_details.maldives_year,
                        'NEP': scorecard.indicator_details.nepal_year,
                        'PAK': scorecard.indicator_details.pakistan_year,
                        'LAK': scorecard.indicator_details.sri_lanka_year,
                    },
                    'Year_Types': {
                        'AFG': scorecard.indicator_details.afghanistan_year_type,
                        'BAN': scorecard.indicator_details.bangladesh_year_type,
                        'IND': scorecard.indicator_details.india_year_type,
                        'MLD': scorecard.indicator_details.maldives_year_type,
                        'NEP': scorecard.indicator_details.nepal_year_type,
                        'PAK': scorecard.indicator_details.pakistan_year_type,
                        'LAK': scorecard.indicator_details.sri_lanka_year_type,
                    }
                }

            scorecard_data = {
                'ID': scorecard.id,
                'Category_ID': scorecard.category_id,
                'Secondary_ID': scorecard.secondary_id,
                'Group_Name': scorecard.group_name,
                'Indicator_Name': scorecard.indicator,  # Updated to match the model change
                'Proxy': scorecard.proxy,
                'Country': scorecard.country,
                'Year': scorecard.year,
                'Year_Type': scorecard.year_type,
                'Source': scorecard.source,
                'Value': scorecard.value,
                'Value_N': scorecard.value_n,
                'Value_Map': scorecard.value_map,
                'Value_Standardized': scorecard.value_standardized,
                'Positive': scorecard.positive,
                'Value_Standardized_Table': scorecard.value_standardized_table,
                'Indicator_Details': indicator_data
            }

            result.append(scorecard_data)

        # Debug code to identify the problematic item
        for idx, item in enumerate(result):
            try:
                print(f"Serializing item {idx}")
                json.dumps(item)
            except TypeError as te:
                logging.error(f"Serialization issue at item {idx}: {te}")
                raise  # Re-raise the error to see it in the log

        return result

    except Exception as e:
        logging.error(f"Error fetching scorecard indicators: {e}")
        return None
    finally:
        session.close()  # Ensuring the session is closed after the operation
