import logging

import azure.functions as func
import azure.cosmos.cosmos_client as cosmos_client
import os
import json
from azure.cosmos.exceptions import CosmosHttpResponseError


#read only key
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


def main(req: func.HttpRequest, items:func.Out[func.Document]) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    #value error if no json provided
    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass

    username = json_given['username']
    password = json_given['password']
    text = json_given['text']

    if len(text) < 10:
        json_out = {"result": False, "msg": "prompt is less than 10 characters" }
        return func.HttpResponse(json.dumps(json_out))

    if len(text) > 100:
        json_out = {"result": False, "msg": "prompt is more than 100 characters" }
        return func.HttpResponse(json.dumps(json_out))

    #gets player with corresponding username (if any)
    player = {}
    players_query = "SELECT * FROM players WHERE players.username = " + '"' + username + '"'
    for item in player_container.query_items(query=players_query,enable_cross_partition_query=True):
        player = item

    if player == {} or password != player["password"]:
        json_out = {"result": False, "msg": "bad username or password" } 
        return func.HttpResponse(json.dumps(json_out))

    prompts_username_query = "SELECT * FROM prompts WHERE prompts.username = " + '"' + username + '"'
    for item in prompt_container.query_items(query=prompts_username_query,enable_cross_partition_query=True):
        if item['text'] == text:
            json_out = {"result": False, "msg": "User already has a prompt with the same text" }
            return func.HttpResponse(json.dumps(json_out))



    max_id = -1
    prompts_query = "SELECT TOP 1 * FROM prompts ORDER BY prompts.id DESC"
    for item in prompt_container.query_items(query=prompts_query,enable_cross_partition_query=True):
        if int(item["id"]) > max_id:
            max_id = int(item["id"])

    new_id = max_id + 1

    new_dict = {}
    new_dict["id"] = str(new_id)
    new_dict["username"]= username
    new_dict["text"] = text
    try:
        items.set(func.Document.from_dict(new_dict))
        json_out = {
            'result' : True,
            'msg':'OK'
        }
        return func.HttpResponse(json.dumps(json_out))
    except CosmosHttpResponseError:
        return func.HttpResponse("An error has occured")


    

