import re
from typing import Optional

# Real US cities with bus service - curated list
DB_CITIES = ['Aberdeen', 'Abilene', 'Akron', 'Albany', 'Albuquerque', 'Alexandria', 'Allentown', 'Amarillo', 'Anaheim', 'Anchorage', 'Ann Arbor', 'Annapolis', 'Appleton', 'Arlington', 'Asheville', 'Athens', 'Atlanta', 'Atlantic City', 'Augusta', 'Aurora', 'Austin', 'Bakersfield', 'Baltimore', 'Bangor', 'Baton Rouge', 'Beaumont', 'Bellevue', 'Bellingham', 'Bend', 'Bethlehem', 'Billings', 'Biloxi', 'Binghamton', 'Birmingham', 'Bismarck', 'Bloomington', 'Boise', 'Boston', 'Boulder', 'Bowling Green', 'Bozeman', 'Bridgeport', 'Brockton', 'Broken Arrow', 'Buffalo', 'Burlington', 'Cambridge', 'Camden', 'Canton', 'Casper', 'Cedar Rapids', 'Champaign', 'Chandler', 'Charleston', 'Charlotte', 'Charlottesville', 'Chattanooga', 'Chesapeake', 'Cheyenne', 'Chicago', 'Chico', 'Cincinnati', 'Clarksville', 'Cleveland', 'Colorado Springs', 'Columbia', 'Columbus', 'Concord', 'Corpus Christi', 'Corvallis', 'Covington', 'Cranston', 'Dallas', 'Davenport', 'Dayton', 'Daytona Beach', 'Dearborn', 'Denver', 'Des Moines', 'Detroit', 'Dover', 'Duluth', 'Durham', 'Edmond', 'El Paso', 'Elgin', 'Elizabeth', 'Erie', 'Eugene', 'Evansville', 'Fairbanks', 'Fargo', 'Farmington', 'Fayetteville', 'Flagstaff', 'Flint', 'Fort Collins', 'Fort Lauderdale', 'Fort Myers', 'Fort Smith', 'Fort Wayne', 'Fort Worth', 'Frederick', 'Fresno', 'Gainesville', 'Gaithersburg', 'Garland', 'Gillette', 'Glendale', 'Grand Forks', 'Grand Island', 'Grand Junction', 'Grand Rapids', 'Great Falls', 'Green Bay', 'Greensboro', 'Greenville', 'Gresham', 'Gulfport', 'Hagerstown', 'Hammond', 'Hampton', 'Harrisburg', 'Hartford', 'Hattiesburg', 'Helena', 'Henderson', 'Hialeah', 'Hillsboro', 'Hilo', 'Honolulu', 'Houston', 'Huntington', 'Huntsville', 'Idaho Falls', 'Independence', 'Indianapolis', 'Iowa City', 'Irving', 'Jackson', 'Jacksonville', 'Jefferson City', 'Jersey City', 'Joliet', 'Jonesboro', 'Juneau', 'Kailua', 'Kalamazoo', 'Kansas City', 'Kearney', 'Kennewick', 'Kenosha', 'Killeen', 'Knoxville', 'Lafayette', 'Lake Charles', 'Lakeland', 'Lancaster', 'Lansing', 'Laramie', 'Laredo', 'Las Cruces', 'Las Vegas', 'Lawrence', 'Lawton', 'Lewiston', 'Lexington', 'Lincoln', 'Little Rock', 'Long Beach', 'Los Angeles', 'Louisville', 'Lowell', 'Lubbock', 'Macon', 'Madison', 'Manchester', 'McAllen', 'Medford', 'Memphis', 'Meridian', 'Mesa', 'Miami', 'Midland', 'Milwaukee', 'Minneapolis', 'Minot', 'Missoula', 'Mobile', 'Modesto', 'Monroe', 'Montgomery', 'Montpelier', 'Morgantown', 'Murfreesboro', 'Myrtle Beach', 'Nampa', 'Nashua', 'Nashville', 'New Bedford', 'New Haven', 'New London', 'New Orleans', 'New York', 'Newark', 'Newport News', 'Norfolk', 'Norman', 'North Charleston', 'North Las Vegas', 'Oakland', 'Ocala', 'Odessa', 'Ogden', 'Oklahoma City', 'Olympia', 'Omaha', 'Orlando', 'Oshkosh', 'Overland Park', 'Owensboro', 'Oxnard', 'Parkersburg', 'Paterson', 'Pawtucket', 'Pensacola', 'Peoria', 'Philadelphia', 'Phoenix', 'Pittsburgh', 'Plano', 'Pocatello', 'Portland', 'Portsmouth', 'Providence', 'Provo', 'Pueblo', 'Quincy', 'Racine', 'Raleigh', 'Rapid City', 'Reading', 'Redding', 'Reno', 'Richmond', 'Rio Rancho', 'Riverside', 'Roanoke', 'Rochester', 'Rock Hill', 'Rock Springs', 'Rockford', 'Rockville', 'Roswell', 'Rutland', 'Sacramento', 'Saginaw', 'Salem', 'Salinas', 'Salt Lake City', 'San Antonio', 'San Diego', 'San Francisco', 'San Jose', 'Santa Ana', 'Santa Barbara', 'Santa Fe', 'Santa Rosa', 'Sarasota', 'Savannah', 'Scottsdale', 'Scranton', 'Seattle', 'Shreveport', 'Sioux City', 'Sioux Falls', 'South Bend', 'Sparks', 'Spartanburg', 'Spokane', 'Springdale', 'Springfield', 'St. Cloud', 'St. George', 'St. Louis', 'St. Paul', 'St. Petersburg', 'Stamford', 'Stockton', 'Syracuse', 'Tacoma', 'Tallahassee', 'Tampa', 'Tempe', 'Toledo', 'Topeka', 'Trenton', 'Tucson', 'Tulsa', 'Tuscaloosa', 'Twin Falls', 'Tyler', 'Utica', 'Vancouver', 'Virginia Beach', 'Waco', 'Warren', 'Warwick', 'Washington DC', 'Waterbury', 'Waterloo', 'West Palm Beach', 'West Valley City', 'Wichita', 'Wilmington', 'Winston-Salem', 'Worcester', 'Yakima', 'Yonkers', 'Youngstown', 'Yuma']

ALIASES = {
    "nyc": "New York", "new york city": "New York", "ny": "New York",
    "dc": "Washington DC", "d.c.": "Washington DC", "washington": "Washington DC",
    "la": "Los Angeles", "l.a.": "Los Angeles",
    "sf": "San Francisco", "san fran": "San Francisco",
    "philly": "Philadelphia",
    "vegas": "Las Vegas",
    "nola": "New Orleans",
    "chi": "Chicago",
    "atl": "Atlanta",
    "mia": "Miami",
    "bos": "Boston",
    "htx": "Houston",
    "pdx": "Portland",
    "slc": "Salt Lake City",
    "okc": "Oklahoma City",
    "stl": "St. Louis",
    "kc": "Kansas City",
    "indy": "Indianapolis",
    "nash": "Nashville",
    "jax": "Jacksonville",
    "sa": "San Antonio",
}

def resolve_to_db_city(query: str) -> str:
    if not query:
        return query
    q = query.strip()
    ql = q.lower()

    # Check aliases
    if ql in ALIASES:
        return ALIASES[ql]

    # Exact match
    for city in DB_CITIES:
        if city.lower() == ql:
            return city

    # Starts-with (only if unambiguous)
    matches = [c for c in DB_CITIES if c.lower().startswith(ql)]
    if len(matches) == 1:
        return matches[0]
    # If multiple, return the shortest (most likely exact)
    if matches:
        return min(matches, key=len)

    # Contains
    matches = [c for c in DB_CITIES if ql in c.lower()]
    if matches:
        return min(matches, key=len)

    return q.title()

def search_cities(query: str, limit: int = 10):
    if not query or len(query) < 2:
        return []
    ql = query.strip().lower()
    starts = [c for c in DB_CITIES if c.lower().startswith(ql)]
    contains = [c for c in DB_CITIES if ql in c.lower() and c not in starts]
    return (starts + contains)[:limit]

def search_cities_with_state(query: str, limit: int = 8):
    """Return cities with state for autocomplete display."""
    import csv, os
    results = search_cities(query, limit)
    # Try to add state info from uscities.csv
    try:
        csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dataset', 'uscities.csv')
        state_map = {}
        with open(csv_path) as f:
            for row in csv.DictReader(f):
                city = row.get('city','').strip()
                state = row.get('state_id','').strip()
                if city and state and city not in state_map:
                    state_map[city] = state
        return [{'city': r, 'display': f"{r}, {state_map.get(r, '')}"} for r in results]
    except:
        return [{'city': r, 'display': r} for r in results]

def get_best_city_matches(query: str, limit: int = 5):
    return search_cities(query, limit)

def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())

# Load cities dataframe for distance calculations
cities_df = None
try:
    import pandas as pd, os
    _csv = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'dataset', 'uscities.csv')
    if os.path.exists(_csv):
        cities_df = pd.read_csv(_csv)
        cities_df.columns = [col.lower() for col in cities_df.columns]
        cities_df['population'] = pd.to_numeric(cities_df['population'], errors='coerce').fillna(0)
        # Sort by population descending so largest city is first for each name
        cities_df = cities_df.sort_values('population', ascending=False).reset_index(drop=True)
except Exception as _e:
    pass


# Compatibility stubs for ai.py and other modules
class CityResolver:
    def __init__(self, *args, **kwargs):
        self.city_names = DB_CITIES
    def resolve_city(self, name):
        return resolve_to_db_city(name)
    def normalize_message(self, msg):
        return msg.lower()
    def extract_route(self, msg):
        return None, None
    def find_cities_in_text(self, msg):
        return []

# Global resolver instance
_global_resolver = CityResolver()

def resolve_city(name: str):
    return resolve_to_db_city(name)

def get_all_cities():
    return DB_CITIES
