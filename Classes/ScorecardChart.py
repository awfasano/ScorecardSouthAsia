from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Text, Boolean, Float
from sqlalchemy.orm import scoped_session
from db import Session
import logging

Base = declarative_base()

class ScoreCardChart(Base):
    __tablename__ = 'scorecard_indicators2'

    id = Column(Integer)
    category_id = Column(Integer)
    secondary_id = Column(Integer, primary_key=True)
    group_name = Column(String)
    indicator = Column(String)
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
                'Value_Standardized_Table': indicator.value_standardized_table
            } for indicator in indicators
        ]
    except Exception as e:
        logging.error(f"Error fetching indicators: {e}")
        return None
    finally:
        session.close()  # Ensuring the session is closed after the operation