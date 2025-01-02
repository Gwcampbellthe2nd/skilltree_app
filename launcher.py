import threading
import webview
from flask import Flask, render_template, request, jsonify, send_file, redirect, url_for
import os
import json

# Import your existing Flask app
from app import app

# Start Flask server in a separate thread
def start_flask():
    app.run(host='127.0.0.1', port=5000, debug=False)

# Launch the webview window
if __name__ == "__main__":
    flask_thread = threading.Thread(target=start_flask, daemon=True)
    flask_thread.start()

    # Open webview window
    webview.create_window(
        "Skill Tree Builder",
        "http://127.0.0.1:5000/",
        width=1200,
        height=800,
        resizable=True
    )

    webview.start()
