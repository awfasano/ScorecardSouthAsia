import os
from google.cloud.sql.connector import Connector, IPTypes
import pg8000
import sqlalchemy
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base


def connect_with_connector() -> sqlalchemy.engine.base.Engine:
    instance_connection_name = os.environ["INSTANCE_CONNECTION_NAME"]
    db_user = os.environ["DB_USER"]
    db_pass = os.environ["DB_PASS"]
    db_name = os.environ["DB_NAME"]

    ip_type = IPTypes.PRIVATE if os.environ.get("PRIVATE_IP") else IPTypes.PUBLIC

    connector = Connector()

    def getconn() -> pg8000.dbapi.Connection:
        conn: pg8000.dbapi.Connection = connector.connect(
            instance_connection_name,
            "pg8000",
            user=db_user,
            password=db_pass,
            db=db_name,
            ip_type=ip_type,
        )
        return conn

    pool = sqlalchemy.create_engine(
        "postgresql+pg8000://",
        creator=getconn,
    )
    return pool

# Set up the database engine and session
db_engine = connect_with_connector()
SessionFactory = sessionmaker(bind=db_engine)
Session = scoped_session(SessionFactory)
Base = declarative_base()


def init_db():
    """Initializes the database and creates tables if they don't exist."""
    from Classes.Indicator import Indicator
    from Classes.ScorecardValues import ScoreCardIndicator2
    Base.metadata.create_all(bind=db_engine)
    print("Database initialized and tables created.")

