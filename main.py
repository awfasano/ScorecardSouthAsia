import logging

from flask import Flask, render_template, jsonify, request, url_for

from Classes.ScorecardChart import get_scorecard_chart_data
from db import Session, init_db
from Classes.Indicator import get_all_indicators, Indicator
from Classes.ScorecardValues import get_scorecard_indicator2_data, ScoreCardIndicator2
from sqlalchemy import cast, String

app = Flask(__name__)


def initialize_database():
    """Initialize the database."""
    with app.app_context():
        init_db()


@app.teardown_appcontext
def shutdown_session(exception=None):
    """Remove the database session at the end of the request."""
    Session.remove()


@app.route('/')
def index():
    return render_template('chart.html')


@app.route('/data_entry')
def data_entry():
    return render_template('data_entry.html')

@app.route('/data_input')
def data_input():
    return render_template('data_input.html')


@app.route('/chart')
def chart():
    sar_image = url_for('static', filename='Assets/SAR_wo_India.jpeg')
    sa_image = url_for('static', filename='Assets/SAR.jpeg')
    return render_template('chart.html',
                           sar_image=sar_image,
                           sa_image=sa_image)


@app.route('/api/indicators', methods=['GET'])
def get_indicators():
    try:
        indicators = get_all_indicators()
        if indicators:
            return jsonify(indicators)
        else:
            return jsonify({"error": "No indicators found"}), 404
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        Session.remove()


@app.route('/api/scorecard_chart', methods=['GET'])
def get_scorecard_chart():
    try:
        chart_scorecard = get_scorecard_chart_data()
        if chart_scorecard:
            return jsonify(chart_scorecard)
        else:
            return jsonify({"error": "No data found"}), 404
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        Session.remove()


@app.route('/api/scorecard_indicators', methods=['GET'])
def get_scorecard_indicators():
    try:
        indicators_scorecard = get_scorecard_indicator2_data()
        if indicators_scorecard:
            return jsonify(indicators_scorecard)
        else:
            return jsonify({"error": "No data found"}), 404
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        Session.remove()



@app.route('/api/save_indicator', methods=['POST'])
def save_indicator():
    session = Session()
    try:
        data = request.json
        # Validation: Ensure required fields are present
        required_fields = [
            'id', 'indicator_id', 'api_url', 'dataset', 'indicator_code', 'indicator_name',
            'positive_negative_indicator', 'number_percent', 'proxy', 'category',
            'category_id', 'source', 'notes', 'years', 'year_types'
        ]
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        # Parse IDs and boolean values to correct types
        indicator_id = int(data['id'])
        data['indicator_id'] = int(data['indicator_id'])
        data['category_id'] = int(data['category_id']) if data['category_id'] else None

        # Convert 'true'/'false' strings to boolean
        data['positive_negative_indicator'] = data['positive_negative_indicator'] if isinstance(data['positive_negative_indicator'], bool) else data['positive_negative_indicator'] == 'true'
        data['number_percent'] = data['number_percent'] if isinstance(data['number_percent'], bool) else data['number_percent'] == 'true'

        # Fetch existing indicator
        indicator = session.query(Indicator).filter_by(id=indicator_id).first()

        if not indicator:
            # Create new indicator
            indicator = Indicator(
                id=indicator_id,
                indicator_id=data['indicator_id'],
                api_url=data['api_url'],
                dataset=data['dataset'],
                indicator_code=data['indicator_code'],
                indicator_name=data['indicator_name'],
                positive_negative_indicator=bool(data['positive_negative_indicator']),
                number_percent=bool(data['number_percent']),
                proxy=data['proxy'],
                category=data['category'],
                category_id=data['category_id'],
                source=data['source'],
                notes=data['notes'],
                afghanistan_year=int(data['years'].get('AFG')),
                bangladesh_year=int(data['years'].get('BAN')),
                india_year=int(data['years'].get('IND')),
                maldives_year=int(data['years'].get('MLD')),
                nepal_year=int(data['years'].get('NEP')),
                pakistan_year=int(data['years'].get('PAK')),
                sri_lanka_year=int(data['years'].get('LAK')),
                afghanistan_year_type=int(data['year_types'].get('AFG')),
                bangladesh_year_type=int(data['year_types'].get('BAN')),
                india_year_type=int(data['year_types'].get('IND')),
                maldives_year_type=int(data['year_types'].get('MLD')),
                nepal_year_type=int(data['year_types'].get('NEP')),
                pakistan_year_type=int(data['year_types'].get('PAK')),
                sri_lanka_year_type=int(data['year_types'].get('LAK'))
            )
            session.add(indicator)
        else:
            # Update existing indicator
            indicator.indicator_id = data['indicator_id']
            indicator.api_url = data['api_url']
            indicator.dataset = data['dataset']
            indicator.indicator_code = data['indicator_code']
            indicator.indicator_name = data['indicator_name']
            indicator.positive_negative_indicator = bool(data['positive_negative_indicator'])
            indicator.number_percent = bool(data['number_percent'])
            indicator.proxy = data['proxy']
            indicator.category = data['category']
            indicator.category_id = data['category_id']
            indicator.source = data['source']
            indicator.notes = data['notes']
            indicator.afghanistan_year = data['years'].get('AFG')
            indicator.bangladesh_year = data['years'].get('BAN')
            indicator.india_year = data['years'].get('IND')
            indicator.maldives_year = data['years'].get('MLD')
            indicator.nepal_year = data['years'].get('NEP')
            indicator.pakistan_year = data['years'].get('PAK')
            indicator.sri_lanka_year = data['years'].get('LAK')
            indicator.afghanistan_year_type = data['year_types'].get('AFG')
            indicator.bangladesh_year_type = data['year_types'].get('BAN')
            indicator.india_year_type = data['year_types'].get('IND')
            indicator.maldives_year_type = data['year_types'].get('MLD')
            indicator.nepal_year_type = data['year_types'].get('NEP')
            indicator.pakistan_year_type = data['year_types'].get('PAK')
            indicator.sri_lanka_year_type = data['year_types'].get('LAK')

        session.commit()
        return jsonify({"message": "Indicator saved successfully"}), 200

    except Exception as e:
        session.rollback()
        logging.error(f"Error saving indicator: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()


@app.route('/api/save_scorecard', methods=['POST'])
def save_scorecard():
    session = Session()
    try:
        data = request.json  # Get the JSON data from the POST request

        # Validation: Ensure required fields are present
        required_fields = ['secondary_id', 'id', 'category_id', 'group_name', 'indicator', 'proxy', 'country', 'year',
                           'year_type', 'source', 'value']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

        # Fetch existing ScoreCardIndicator2 by secondary_id if available
        scorecard = session.query(ScoreCardIndicator2).filter_by(secondary_id=data['secondary_id']).first()

        if not scorecard:
            # If no scorecard exists, create a new one
            scorecard = ScoreCardIndicator2(
                secondary_id=data['secondary_id'],
                id=data['id'],
                category_id=data['category_id'],
                group_name=data['group_name'],
                indicator_name=data['indicator'],  # Updated field name
                proxy=data['proxy'],
                country=data['country'],
                year=data['year'],
                year_type=data['year_type'],
                source=data['source'],
                value=data['value'],
                value_n=data.get('value_n'),
                value_map=data.get('value_map'),
                value_standardized=data.get('value_standardized'),
                positive=data.get('positive'),
                value_standardized_table=data.get('value_standardized_table')
            )
            session.add(scorecard)
        else:
            # Update existing scorecard
            scorecard.id = data['id']  # Corrected key
            scorecard.category_id = data['category_id']
            scorecard.group_name = data['group_name']
            scorecard.indicator_name = data['indicator']  # Updated field name
            scorecard.proxy = data['proxy']
            scorecard.country = data['country']
            scorecard.year = data['year']
            scorecard.year_type = data['year_type']
            scorecard.source = data['source']
            scorecard.value = data['value']
            scorecard.value_n = data.get('value_n')
            scorecard.value_map = data.get('value_map')
            scorecard.value_standardized = data.get('value_standardized')
            scorecard.positive = data.get('positive')
            scorecard.value_standardized_table = data.get('value_standardized_table')

        session.commit()  # Commit the changes to the database
        return jsonify({"message": "Scorecard saved successfully"}), 200

    except Exception as e:
        session.rollback()  # Rollback the session if there's an error
        logging.error(f"Error saving scorecard: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        session.close()  # Close the session after operation


if __name__ == "__main__":
    initialize_database()
    app.run(debug=True, use_reloader=False)
