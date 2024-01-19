
def predict_image(image_path):
    from keras.models import load_model
    from keras.preprocessing import image
    import numpy as np

    # Load the trained model
    model = load_model('model.h5')

    # Load and preprocess the image
    img = image.load_img(image_path, target_size=(64, 64))
    img = image.img_to_array(img)
    img = np.expand_dims(img, axis=0)

    # Make a prediction
    result = model.predict(img)
    if result[0][0] == 1:
        prediction = 'Normal'
    else:
        prediction = 'Covid'

    return prediction
