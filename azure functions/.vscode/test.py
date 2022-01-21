def check_username_length(name):
    if(len(name) > 4 or len(name) < 16):
        print("OK")
    else:
        print("Not OK")

check_username_length("dasd")