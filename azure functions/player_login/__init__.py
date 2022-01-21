import json
import logging

import azure.functions as func


def main(req: func.HttpRequest,documents: func.DocumentList) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    #value error if no json provided
    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass


    #get username and password from json
    username = json_given['username']
    password = json_given['password']

    

    json_out = ""
    if documents:
        for document in documents:
            if(document["username"] == username and document["password"] == password):
                json_out = {"result": True , "msg" : "OK"}
                break
        
    if json_out == "":
        json_out = {"result": False , "msg": "Username or password incorrect"}
    

    return func.HttpResponse(json.dumps(json_out))
