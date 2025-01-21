import os
import json
import threading
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
from urllib.parse import unquote
import webview

# Initialize Flask app
app = Flask(__name__)

# Directory for saving/loading skill trees
DATA_DIR = 'data'
os.makedirs(DATA_DIR, exist_ok=True)

@app.route('/')
def index():
    """Main page to list all saved skill trees."""
    trees = [f[:-5] for f in os.listdir(DATA_DIR) if f.endswith('.json')]
    return render_template('index.html', trees=trees)

@app.route('/builder/<tree_name>')
def builder(tree_name):
    """Skill tree builder page."""
    return render_template('builder.html', tree_name=tree_name)

@app.route('/save/<tree_name>', methods=['POST'])
def save_tree(tree_name):
    """Save a skill tree with a given name, including notes."""
    # Decode the tree name to handle spaces and special characters
    tree_name = unquote(tree_name)
    data = request.json
    file_path = os.path.join(DATA_DIR, f'{tree_name}.json')
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)
    return jsonify({"message": f"Skill tree '{tree_name}' saved successfully!"}), 200

@app.route('/load/<tree_name>', methods=['GET'])
def load_tree(tree_name):
    """Load a specific skill tree, including notes."""
    file_path = os.path.join(DATA_DIR, f'{tree_name}.json')
    if os.path.exists(file_path):
        with open(file_path, 'r') as f:
            data = json.load(f)
        return jsonify(data), 200
    else:
        return jsonify({"error": f"Skill tree '{tree_name}' not found."}), 404

@app.route('/delete/<tree_name>', methods=['DELETE'])
def delete_tree(tree_name):
    """Delete a specific skill tree."""
    file_path = os.path.join(DATA_DIR, f'{tree_name}.json')
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({"message": f"Skill tree '{tree_name}' deleted successfully!"}), 200
    else:
        return jsonify({"error": f"Skill tree '{tree_name}' not found."}), 404

@app.route('/download/<tree_name>', methods=['GET'])
def download_tree(tree_name):
    """Download a specific skill tree."""
    file_path = os.path.join(DATA_DIR, f'{tree_name}.json')
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True)
    else:
        return jsonify({"error": f"Skill tree '{tree_name}' not found."}), 404

@app.route('/import', methods=['POST'])
def import_tree():
    """Import a skill tree from a JSON file."""
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded."}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected."}), 400
    
    if file and file.filename.endswith('.json'):
        try:
            data = json.load(file)
            return jsonify(data), 200
        except json.JSONDecodeError:
            return jsonify({"error": "Invalid JSON format."}), 400
    else:
        return jsonify({"error": "Invalid file type. Please upload a JSON file."}), 400

def start_flask():
    """Run the Flask app in a separate thread."""
    app.run(debug=False, use_reloader=False)


if __name__ == '__main__':
    # Generate a random port for Flask
    flask_port = random.randint(10000, 20000)

    # Start the Flask app in a thread
    flask_thread = threading.Thread(target=start_flask, args=(flask_port,))
    flask_thread.daemon = True
    flask_thread.start()

    # Open the Flask app in a PyWebView window
    webview.create_window('Skill Tree Manager', f'http://127.0.0.1:{flask_port}')
    webview.start()
