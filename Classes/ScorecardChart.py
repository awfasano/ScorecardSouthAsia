from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Boolean, Float
from sqlalchemy.orm import scoped_session
from db import Session
import logging

Base = declarative_base()

class ScoreCardChart(Base):
    __tablename__ = 'scorecard_indicators3'

    id = Column(Integer)  # Unique identifier for each indicator
    category_id = Column(Integer)  # Maps to group_name using provided mapping
    secondary_id = Column(Integer, primary_key=True)  # Unique identifier for each value
    group_name = Column(String)
    indicator = Column(String)
    proxy = Column(String)
    country = Column(String)
    year = Column(String)  # Changed to String
    year_type = Column(Integer)
    source = Column(String)
    value = Column(String)  # Changed to String
    value_n = Column(String)  # Changed to String
    value_map = Column(String)
    value_standardized = Column(Float)
    positive = Column(Boolean)
    value_standardized_table = Column(Float)
    percent_number = Column(Boolean)  # New column added

# Setting up logging
logging.basicConfig(level=logging.ERROR)

# Fetch scoreCard_indicators2 data
def get_scorecard_chart_data():
    session = Session()
    try:
        indicators = session.query(ScoreCardChart).all()
        print(len(indicators))
        return [
            {
                'ID': indicator.id,
                'Category_ID': indicator.category_id,
                'Secondary_ID': indicator.secondary_id,
                'Group_Name': indicator.group_name,
                'Indicator': indicator.indicator,
                'Proxy': indicator.proxy,
                'Country': indicator.country,
                'Year': indicator.year,
                'Year_Type': indicator.year_type,
                'Source': indicator.source,
                'Value': indicator.value,
                'Value_N': indicator.value_n,
                'Value_Map': indicator.value_map,
                'Value_Standardized': indicator.value_standardized,
                'Positive': indicator.positive,
                'Value_Standardized_Table': indicator.value_standardized_table,
                'Percent_Number': indicator.percent_number  # New field added
            } for indicator in indicators
        ]
    except Exception as e:
        logging.error(f"Error fetching indicators: {e}")
        return None
    finally:
        session.close()  # Ensuring the session is closed after the operation
