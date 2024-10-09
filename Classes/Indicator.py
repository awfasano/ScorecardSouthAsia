from sqlalchemy import Column, Integer, String, Text, Boolean
from sqlalchemy.orm import relationship
from db import Base  # Ensure you're importing Base from your centralized module

class Indicator(Base):
    __tablename__ = 'indicators_revised'

    id = Column(Integer, primary_key=True)
    indicator_id = Column(Integer)
    api_url = Column(String)
    category = Column(String)
    category_id = Column(Integer)
    dataset = Column(String)
    proxy = Column(String)
    source = Column(String)
    indicator_code = Column(String)
    indicator_name = Column(String)
    positive_negative_indicator = Column(Boolean)
    number_percent = Column(Boolean)
    notes = Column(Text)

    # Country-specific year columns
    afghanistan_year = Column(String)
    bangladesh_year = Column(String)
    india_year = Column(String)
    maldives_year = Column(String)
    nepal_year = Column(String)
    pakistan_year = Column(String)
    sri_lanka_year = Column(String)

    # Country-specific year_type columns
    afghanistan_year_type = Column(Integer)
    bangladesh_year_type = Column(Integer)
    india_year_type = Column(Integer)
    maldives_year_type = Column(Integer)
    nepal_year_type = Column(Integer)
    pakistan_year_type = Column(Integer)
    sri_lanka_year_type = Column(Integer)

    # Relationship to ScoreCardIndicator2 using a foreign key
    scorecard_values = relationship('ScoreCardIndicator2', back_populates='indicator_details', cascade='all, delete-orphan')

# Fetching the data from the database
def get_all_indicators():
    from db import Session  # Import Session here to avoid circular import issues
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
                'Proxy': indicator.proxy,
                'Source': indicator.source,
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
        session.close()  # Ensuring the session is closed after the operation
