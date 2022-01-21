import requests
APP_KEY="jwJMNoxZnb/35swfpI2oSt89CAN9P8W2723yZT7S2vKvvfF7dovajQ=="

def player_register(input_value):
    """
    input_value: as per specification
    output: as detailed in the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/player_register"
    #An http post request is used to create or change something
    # Do not forget to 
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def player_login(input_value):
    """
    input_value : as per specification
    output: as per the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/player_login"
    #An http get request is used to create or change something
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def player_update(input_value):
    """
    input_value: as detailed in the specification
    output: as detailed in the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/player_update"
    #An http get request is used to create or change something
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def player_leaderboard(input_value):
    """
    input_value : as per specification
    output: as per the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/player_leaderboard"
    #An http get request is used to create or change something
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def prompt_create(input_value):
    """
    input_value: as detailed in the specification
    output: as detailed in the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/prompt_create"
    #An http get request is used to create or change something
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def prompt_edit(input_value):
    """
    input_value: as detailed in the specification
    output: as detailed in the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/prompt_edit"
    #An http get request is used to create or change something
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def prompt_delete(input_value):
    #Your code for calling corresponding Azure function
    """
    input_value: as detailed in the specification
    output: as detailed in the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/prompt_delete"
    #An http get request is used to create or change something
    response = requests.post(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def prompts_get(input_value):
    """
    input_value : as per specification
    output: as per the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/prompt_get"
    #An http get request is used to create or change something
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def prompts_get_random(input_value):
    """
    input_value : as per specification
    output: as per the specification
    """
    URI="https://quiplash-cwk.azurewebsites.net/api/prompt_get_random"
    #An http get request is used to create or change something
    response = requests.get(URI, json=input_value, 
            headers={'x-functions-key' : APP_KEY })
    # parse the JSON you receive from the response
    # do not forget to actually send a JSON in the response!
    output = response.json()
    return output

def tests():
    # you may use this function for your own testing
    # You should remove your testing before submitting your CW
    print("My own testing")


if __name__ == '__main__':
    #If the script is called from the console or inside an IDE
    # it will execute the tests function
    tests()
      
