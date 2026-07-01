from PIL import Image

img = Image.open('public/logo.png').convert("RGBA")
datas = img.getdata()

newData = []
for item in datas:
    # If the pixel is close to black, make it transparent
    if item[0] < 30 and item[1] < 30 and item[2] < 30:
        newData.append((255, 255, 255, 0))
    else:
        newData.append(item)

img.putdata(newData)
img.save('public/logo.png', "PNG")
print("Logo background removed!")
