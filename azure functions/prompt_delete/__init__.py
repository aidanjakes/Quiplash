import logging

import azure.functions as func
import json
import azure.cosmos.cosmos_client as cosmos_client
import os
from azure.cosmos.partition_key import NonePartitionKeyValue

#read write key
settings = {
    'host': os.environ.get('ACCOUNT_HOST', 'https://aidan.documents.azure.com:443/'),
    'master_key': os.environ.get('ACCOUNT_KEY', 'W5Vvz1LaSPmoM3ZP8XLMeRy9WD0nLeuDg6NP64c7G6u6TKOh7jsBXshj9dxnnZKqX0TFRefcYAkBsGctsLXprg=='),
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


def main(req: func.HttpRequest) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')
    
    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass

    prompt_id = json_given['id']
    username = json_given['username']
    password = json_given['password']

    #gets player with corresponding username (if any)
    player = {}
    players_query = "SELECT * FROM players WHERE players.username = " + '"' + username + '"'
    for item in player_container.query_items(query=players_query,enable_cross_partition_query=True):
        player = item

    if player == {} or password != player["password"]:
        json_out = {"result": False, "msg": "bad username or password" } 
        return func.HttpResponse(json.dumps(json_out))

    prompt_id_query = "SELECT * FROM prompts WHERE prompts.id = " + '"' + str(prompt_id) + '"'
    prompt = {}
    for item in prompt_container.query_items(query=prompt_id_query,enable_cross_partition_query=True):
        prompt = item

    if prompt == {}:
        json_out = {"result": False, "msg": "prompt id does not exist" }
        return func.HttpResponse(json.dumps(json_out))
    else:
        prompt_container.delete_item(item=str(prompt_id),partition_key=NonePartitionKeyValue)
        json_out = {"result" : True, "msg": "OK" }
        return func.HttpResponse(json.dumps(json_out))




       
