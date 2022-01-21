import logging

import azure.functions as func
import azure.cosmos.cosmos_client as cosmos_client
import os
import json

settings = {
    'host': os.environ.get('ACCOUNT_HOST', 'https://aidan.documents.azure.com:443/'),
    'master_key': os.environ.get('ACCOUNT_KEY', 'W5Vvz1LaSPmoM3ZP8XLMeRy9WD0nLeuDg6NP64c7G6u6TKOh7jsBXshj9dxnnZKqX0TFRefcYAkBsGctsLXprg=='),
    # replace the  below according to your DB
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

    username = json_given['username']
    password = json_given['password']
    

    add_to_games_played = 0
    add_to_score = 0
    try:
        add_to_games_played = json_given["add_to_games_played"]
    except KeyError:
        add_to_games_played = 0

    try:
        add_to_score = json_given["add_to_score"]
    except KeyError:
        add_to_score = 0


    if (add_to_games_played < 0 or add_to_score < 0):
        #logging.info("Negative value found in add_to_games_played or add_to_score")
        json_out = {"result": False, "msg": "Attempt to set negative score/games_played"   }
        return func.HttpResponse(json.dumps(json_out))
    
    #gets player with corresponding username (if any)
    player = {}
    players_query = "SELECT * FROM players WHERE players.username = " + '"' + username + '"'
    for item in container.query_items(query=players_query,enable_cross_partition_query=True):
        player = item

    if player == {}:
        #logging.info("no player could be found with the given username")
        json_out = {"result": False, "msg": "user does not exist" }
        return func.HttpResponse(json.dumps(json_out))
    
    #username exists, password matches and score/games to add not negative
    if player['password'] == password:
        #logging.info("username and password match, non-negative values for add to games/score so update player values")
        player.update({
            "games_played" : player['games_played'] + add_to_games_played,
            "total_score" : player['total_score'] + add_to_score
        })
        container.upsert_item(body = player)
        json_out = {"result" : True, "msg": "OK" }
        return func.HttpResponse(json.dumps(json_out))
    #by this point username existance and negative values been checked so only error is wrong password
    else:
        #logging.info("given password does not match that of the user")
        json_out = {"result": False, "msg": "wrong password" }
        return func.HttpResponse(json.dumps(json_out))
    



    
