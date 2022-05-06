def is_int(string):
    try:
        int(string)
        return True
    except ValueError:
        return False


def int2char(integer):
    if integer == 8:
        return "J"
    else:
        return chr(65 + integer)


def char2int(char):
    if char == "J":
        return "8"
    else:
        return str(ord(char) - 1)


def pos2cord(pos):
    return int2char(pos[0]) + str(pos[1] + 1)

