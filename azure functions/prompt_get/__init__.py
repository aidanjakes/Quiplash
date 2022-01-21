import logging

import azure.functions as func
import json
import azure.cosmos.cosmos_client as cosmos_client
import os

#read write key
settings = {
    'host': os.environ.get('ACCOUNT_HOST', 'https://aidan.documents.azure.com:443/'),
    'master_key': os.environ.get('ACCOUNT_KEY', 'r0pK5Nq7XBHgfH8uiePpavSZayHL0CIDYdd68X3HlIxiUwtDSjePcpTzizTesSKvocWdHDJQPfmmeb2tIQEJqg=='),
    'database_id': os.environ.get('COSMOS_DATABASE', 'quiplash-cwk'),
    'players_container_id': os.environ.get('COSMOS_CONTAINER', 'players'),
    'prompts_container_id': os.environ.get('COSMOS_CONTAINER', 'prompts')

}


HOST = settings['host']
MASTER_KEY = settings['master_key']
DATABASE_ID = settings['database_id']
PLAYER_CONTAINER_ID = settings['players_container_id']
PROMPT_CONTAINER_ID = settings['prompts_container_id']

client = cosmos_client.CosmosClient(HOST,credential=MASTER_KEY)
database = client.get_database_client('quiplash-cwk')
player_container = database.get_container_client('players')
prompt_container = database.get_container_client('prompts')


def main(req: func.HttpRequest,documents: func.DocumentList) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass

    players = json_given['players']

    if players == -1:
        items_out = []
        for document in documents:
            new_dict = {
                "id":document['id'],
                "text":document['text'],
                "username":document['username']
            }
            items_out.append(new_dict)
        return func.HttpResponse(json.dumps(items_out))
    else:
        prompt_query = "SELECT * FROM prompts WHERE "
        for user in players:
            prompt_query += "prompts.username = " + '"' + user + '" OR '
        size = len(prompt_query)
        final_query = prompt_query[:size - 3]
        items_out = []
        for item in prompt_container.query_items(query=final_query,enable_cross_partition_query=True):
            new_dict = {
                "id":item['id'],
                "text":item['text'],
                "username":item['username']
            }
            items_out.append(new_dict)
        return func.HttpResponse(json.dumps(items_out))

