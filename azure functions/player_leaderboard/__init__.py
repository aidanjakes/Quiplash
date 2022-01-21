import logging
import azure.functions as func
import azure.cosmos.cosmos_client as cosmos_client
import os
import json

#read only key
settings = {
    'host': os.environ.get('ACCOUNT_HOST', 'https://aidan.documents.azure.com:443/'),
    'master_key': os.environ.get('ACCOUNT_KEY', 'r0pK5Nq7XBHgfH8uiePpavSZayHL0CIDYdd68X3HlIxiUwtDSjePcpTzizTesSKvocWdHDJQPfmmeb2tIQEJqg=='),
    'database_id': os.environ.get('COSMOS_DATABASE', 'quiplash-cwk'),
    'players_container_id': os.environ.get('COSMOS_CONTAINER', 'players')
}


HOST = settings['host']
MASTER_KEY = settings['master_key']
DATABASE_ID = settings['database_id']
PLAYER_CONTAINER_ID = settings['players_container_id']

client = cosmos_client.CosmosClient(HOST,credential=MASTER_KEY)
database = client.get_database_client('quiplash-cwk')
container = database.get_container_client('players')


def main(req: func.HttpRequest) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    #value error if no json provided
    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass

    top = json_given["top"]

    #had to create composite index in container
    sorted_db_query = ("SELECT TOP " + str(top) + 
                       " players.username,players.total_score,players.games_played  " + 
                       "FROM players ORDER BY players.total_score DESC, players.username ASC")
    
    json_out = []
    for item in container.query_items(query=sorted_db_query,enable_cross_partition_query=True):
        new_dict = {
            "username":item["username"],
            "score":item["total_score"],
            "games_played":item["games_played"]
        }
        json_out.append(new_dict)

    return func.HttpResponse(json.dumps(json_out))

        
