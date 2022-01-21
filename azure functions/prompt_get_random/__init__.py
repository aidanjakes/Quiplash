import logging

import azure.functions as func
import random
import json


def main(req: func.HttpRequest,documents: func.DocumentList) -> func.HttpResponse:
    #logging.info('Python HTTP trigger function processed a request.')

    json_given = ""
    try: 
        json_given = req.get_json()
    except ValueError:
        pass
    
    n = json_given["n"]

    random.shuffle(documents)
    sum = 0
    items_out = []
    for document in documents:
        if sum < n:
            dict_out = {
                "id":document['id'],
                "text":document['text'],
                "username":document['username']
            }
            items_out.append(dict_out)
            sum+=1
    return func.HttpResponse(json.dumps(items_out))
        

    
