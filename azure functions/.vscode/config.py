import os

settings = {
    'host': os.environ.get('ACCOUNT_HOST', 'https://aidan.documents.azure.com:443/'),
    'master_key': os.environ.get('ACCOUNT_KEY', 'W5Vvz1LaSPmoM3ZP8XLMeRy9WD0nLeuDg6NP64c7G6u6TKOh7jsBXshj9dxnnZKqX0TFRefcYAkBsGctsLXprg=='),
    # replace the  below according to your DB
    'database_id': os.environ.get('COSMOS_DATABASE', 'quiplash-cwk'),
    'players_container_id': os.environ.get('COSMOS_CONTAINER', 'players')
}
