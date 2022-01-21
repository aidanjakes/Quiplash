import logging
import azure.functions as func
import json
from azure.cosmos.exceptions import CosmosHttpResponseError




def main(req: func.HttpRequest,documents: func.DocumentList,items: func.Out[func.Document]) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass

    #get username and password from json
    username = json_given['username']
    password = json_given['password']

    username_exists = False
    if documents:
        for document in documents:
            if document['username'] == username:
                username_exists = True
                break
    
    if len(username) < 4:
        #logging.info("username too short so player not registered")
        json_out = {
            "result": False,
             "msg": "Username less than 4 characters"  
        } 
        
        return func.HttpResponse(json.dumps(json_out))

    if len(username) > 16:
        #logging.info("username too long so player not registered")
        json_out = {
            "result": False,
             "msg": "Username more than 16 characters"  
        } 
        return func.HttpResponse(json.dumps(json_out))

    if len(password) < 8:
        #logging.info("password too short so player not registered")
        json_out = {"result": False, "msg": "Password less than 8 characters"  }
        return func.HttpResponse(json.dumps(json_out))

    if len(password) > 24:
        #logging.info("password too long so player not registered")
        json_out = {"result": False, "msg": "Password more than 24 characters"  }
        return func.HttpResponse(json.dumps(json_out))


    if not username_exists:
        #logging.info("unregistered username so register player")
        new_dict = {'games_played':0,'total_score':0}
        new_dict['username'] = username
        new_dict['password'] = password
        try:
            items.set(func.Document.from_dict(new_dict))
            json_out = {
                'result' : True,
                'msg':'OK'
            }
            return func.HttpResponse(json.dumps(json_out))
        except CosmosHttpResponseError:
            return func.HttpResponse("An error has occured")
    else:
        #logging.info("username already exists so player can not be registered")
        json_out = {
            'result' : False,
            'msg':"Username already exists"
        }
        return func.HttpResponse(json.dumps(json_out))



