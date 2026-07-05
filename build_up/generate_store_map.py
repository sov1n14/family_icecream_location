import json
import os
import urllib.request
import urllib.parse
import time
import re
import random
from datetime import datetime
from typing import Dict, List, Optional, Any

# Constants
API_KEY = os.environ.get('MAP_API_KEY')
if not API_KEY:
    raise SystemExit(
        "請設定環境變數 MAP_API_KEY 後再執行本腳本"
        "（例如 PowerShell：$env:MAP_API_KEY = 'your-key'）"
    )
BASE_URL = 'https://api.map.com.tw/net/familyShop.aspx'
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0'
]
TARGET_CITIES = ['台中市', '台北市', '台東縣', '台南市', '宜蘭縣', '花蓮縣', '金門縣', '南投縣', '屏東縣', '苗栗縣', '桃園市', '高雄市', '基隆市', '雲林縣', '新北市', '新竹市', '新竹縣', '嘉義市', '嘉義縣', '彰化縣', '澎湖縣']
OUTPUT_FILENAME = 'stores.json'
API_ERRORS = []

# Rate limiting settings (in seconds)
RATE_LIMIT_MIN = 0.001
RATE_LIMIT_MAX = 0.005


def fetch_jsonp(url: str) -> Optional[Any]:
    """
    Fetches JSONP data from the given URL and parses it into a Python object.
    
    Args:
        url: The URL to fetch.
        
    Returns:
        Parsed JSON data or None if fetching fails.
    """
    try:
        headers = {
            'User-Agent': random.choice(USER_AGENTS),
            'Referer': 'https://www.family.com.tw/'
        }
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            
            # Extract JSON from JSONP wrapper (e.g., functionName([...]))
            match = re.search(r'^\s*[\w\.]+\s*\((.*)\)\s*$', content, re.DOTALL)
            if match:
                json_str = match.group(1)
                return json.loads(json_str)
            else:
                # Try parsing directly if not wrapped
                return json.loads(content)
    except Exception as e:
        error_msg = f"Error fetching URL {url}: {e}"
        print(error_msg)
        API_ERRORS.append(error_msg)
        return None


def get_towns(city: str) -> List[Dict[str, Any]]:
    """
    Fetches list of towns (districts) for a given city.
    
    Args:
        city: Name of the city (e.g., '台北市').
        
    Returns:
        List of town data dictionaries.
    """
    params = {
        'searchType': 'ShowTownList',
        'type': 'ice',
        'city': city,
        'fun': 'storeTownList',
        'key': API_KEY
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{BASE_URL}?{query_string}"
    print(f"Fetching towns for {city}...")
    
    result = fetch_jsonp(url)
    return result if isinstance(result, list) else []


def get_stores(city: str, town: str, flavor_type: str) -> List[Dict[str, Any]]:
    """
    Fetches list of stores for a given city and town with specific flavor type.
    
    Args:
        city: Name of the city.
        town: Name of the town/district.
        flavor_type: 'ice' for all ice cream stores.
        
    Returns:
        List of store data dictionaries.
    """
    params = {
        'searchType': 'ShopList',
        'type': flavor_type,
        'city': city,
        'area': town,
        'road': '',
        'fun': 'showStoreList',
        'key': API_KEY
    }
    query_string = urllib.parse.urlencode(params)
    url = f"{BASE_URL}?{query_string}"
    
    result = fetch_jsonp(url)
    return result if isinstance(result, list) else []


def process_town_stores(city: str, town: str, all_stores_dict: Dict[str, Any]) -> None:
    """
    Fetches and processes stores for a specific town, updating the main dictionary.
    
    Args:
        city: City name.
        town: Town name.
        all_stores_dict: Main dictionary to update (pkey -> store object).
    """
    print(f"Processing {city} - {town}...")
    
    current_town_count = 0

    # Fetch all ice cream stores (single, dual, special shapes)
    stores = get_stores(city, town, 'ice')
    
    if stores:
        current_town_count += len(stores)
        for store in stores:
            pkey = store.get('pkey')
            if pkey:
                # Determine store type based on 'all' tags
                tags = store.get('all', '').split(',')
                is_dual = 'twoice' in tags
                is_special = 'Famiice' in tags
                
                if is_dual:
                    if is_special:
                        store['markerColor'] = 'red-striped'
                        store['flavorType'] = '雙口味 + 特殊造型 (Dual Flavor + Special Shape)'
                    else:
                        store['markerColor'] = 'red'
                        store['flavorType'] = '雙口味 (Dual Flavor)'
                else:
                    if is_special:
                        store['markerColor'] = 'blue-striped'
                        store['flavorType'] = '單口味 + 特殊造型 (Single Flavor + Special Shape)'
                    else:
                        store['markerColor'] = 'blue'
                        store['flavorType'] = '單口味 (Single Flavor)'
                
                all_stores_dict[pkey] = store
    
    print(f"Fetched {current_town_count} stores for {city} - {town}")

    time.sleep(random.uniform(RATE_LIMIT_MIN, RATE_LIMIT_MAX)) # Rate limiting


def save_stores_to_json(stores_list: List[Dict[str, Any]]) -> None:
    """
    Saves the list of stores to a JSON file in the project root.
    Optimized to use array of arrays format to reduce file size.
    
    Args:
        stores_list: List of store dictionaries.
    """
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    # The stores.json should now be in the public folder for Vite
    output_path = os.path.join(project_root, 'public', OUTPUT_FILENAME)
    
    # Define keys for the optimized format
    # Order matters!
    keys = ['NAME', 'px', 'py', 'addr', 'TEL', 'flavorType', 'markerColor']
    
    data = []
    
    for store in stores_list:
        # Ensure 'px' and 'py' are present
        if 'px' in store and 'py' in store:
            row = []
            for k in keys:
                row.append(store.get(k, ''))
            data.append(row)

    final_output = {
        "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "keys": keys,
        "data": data
    }

    try:
        # Ensure public directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            # Use separators to remove whitespace
            json.dump(final_output, f, ensure_ascii=False, separators=(',', ':'))
        print(f"Successfully saved optimized data to {output_path}")
    except Exception as e:
        print(f"Error writing output file: {e}")


def main():
    """Main execution function."""
    all_stores_dict = {} # Key: pkey, Value: store object
    
    print("Starting data collection...")
    
    for city in TARGET_CITIES:
        towns_data = get_towns(city)
        if not towns_data:
            print(f"Failed to get towns for {city}")
            continue
            
        for town_info in towns_data:
            town = town_info.get('town')
            if not town:
                continue
                
            process_town_stores(city, town, all_stores_dict)
            
    # Convert dictionary back to list
    final_stores_list = list(all_stores_dict.values())
    
    # Calculate statistics
    dual_count = sum(1 for s in final_stores_list if s.get('markerColor') == 'red')
    single_count = sum(1 for s in final_stores_list if s.get('markerColor') == 'blue')
    dual_special_count = sum(1 for s in final_stores_list if s.get('markerColor') == 'red-striped')
    single_special_count = sum(1 for s in final_stores_list if s.get('markerColor') == 'blue-striped')
    
    print(f"Data collection complete.")
    print(f"Total Unique Stores: {len(final_stores_list)}")
    print(f"Dual Flavor: {dual_count}")
    print(f"Single Flavor: {single_count}")
    print(f"Dual Flavor + Special: {dual_special_count}")
    print(f"Single Flavor + Special: {single_special_count}")
    
    # Save Data
    save_stores_to_json(final_stores_list)

    if API_ERRORS:
        print("\n" + "!" * 50)
        print(f"WARNING: {len(API_ERRORS)} API calls failed during execution.")
        print("Please check the logs for details.")
        print("!" * 50)


if __name__ == "__main__":
    main()
