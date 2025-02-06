import os
import numpy as np
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure constants
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
IMG_WIDTH = 224
IMG_HEIGHT = 224
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'model', 'skin_cancer_model.h5')
CLASS_LABELS = ['Benign', 'Malignant']  # Ensure this matches your model's class order

# Load the model at startup
try:
    model = load_model(MODEL_PATH)
    logger.info(f"Model loaded successfully. Input shape: {model.input_shape}")
except Exception as e:
    logger.error(f"Failed to load model: {str(e)}")
    raise

def allowed_file(filename):
    """Check if the file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def preprocess_image(img_file):
    """
    Preprocess image for model prediction
    """
    try:
        img = Image.open(io.BytesIO(img_file.read()))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img = img.resize((IMG_WIDTH, IMG_HEIGHT))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0  # Ensure this matches training preprocessing
        return img_array
    except Exception as e:
        logger.error(f"Image preprocessing failed: {str(e)}")
        raise ValueError("Invalid image format or corrupted file")
    finally:
        img_file.seek(0)  # Reset file pointer

def get_prediction(image_array):
    """
    Get model prediction and confidence score
    """
    try:
        prediction = model.predict(image_array)
        logger.debug(f"Raw prediction output: {prediction}")  # Add this for debugging
        
        # Handle different model output types (sigmoid vs softmax)
        if prediction.shape[1] == 1:  # Binary classification (sigmoid)
            confidence = float(prediction[0][0])
            class_index = 1 if confidence >= 0.5 else 0
            confidence = confidence if class_index == 1 else 1 - confidence
        else:  # Multiclass classification (softmax)
            class_index = np.argmax(prediction[0])
            confidence = float(np.max(prediction[0]))
        
        return CLASS_LABELS[class_index], confidence
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        raise

@app.route('/predict', methods=['POST'])
def predict():
    """Handle POST requests with image file and return prediction"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed types: png, jpg, jpeg'}), 400

        try:
            processed_image = preprocess_image(file)
        except ValueError as ve:
            return jsonify({'error': str(ve)}), 400
        except Exception as e:
            logger.error(f"Image processing error: {str(e)}")
            return jsonify({'error': 'Failed to process image'}), 500

        try:
            class_name, confidence = get_prediction(processed_image)
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            return jsonify({'error': 'Failed to generate prediction'}), 500

        logger.info(f"Prediction: {class_name} ({confidence:.2%})")
        
        return jsonify({
            'prediction': class_name,
            'confidence': round(confidence, 4),
            'endpoint': request.url,  # Add the endpoint URL
            'timestamp': datetime.now().isoformat(),
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}\n{traceback.format_exc()}")
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/')
def home():
    """Home endpoint with API information"""
    base_url = request.host_url.rstrip('/')
    return jsonify({
        'name': 'Skin Cancer Detection API',
        'status': 'running',
        'endpoints': {
            'documentation': f"{base_url}/",
            'prediction': f"{base_url}/predict (POST)"
        },
        'usage': 'Send a POST request with image file to /predict endpoint'
    })

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port, debug=False)