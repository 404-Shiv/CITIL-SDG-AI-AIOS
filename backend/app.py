"""
Academic Risk & Success Intelligence Platform — Flask Backend
"""

from flask import Flask
from flask_cors import CORS

from config import Config
from models.database import load_data
from seed_data import generate_all_data

from routes.student_routes import student_bp
from routes.risk_routes import risk_bp
from routes.anomaly_routes import anomaly_bp
from routes.peer_routes import peer_bp
from routes.learn_routes import learn_bp
from routes.dashboard_routes import dashboard_bp
from routes.course_routes import course_bp
from routes.ai_routes import ai_bp
from routes.auth_routes import auth_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Generate and load synthetic data
    print("🔄 Generating synthetic student data...")
    data = generate_all_data(Config.NUM_STUDENTS)
    load_data(data)
    print(f"✅ Loaded {len(data['students'])} students")
    
    # Train ML models on startup
    print("🧠 Training ML models...")
    from ml.risk_predictor import train_model
    train_model(None)
    print("✅ Models trained successfully")
    
    # Register blueprints
    app.register_blueprint(student_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(anomaly_bp)
    app.register_blueprint(peer_bp)
    app.register_blueprint(learn_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(auth_bp)
    
    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'healthy', 'students': len(data['students'])}
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)
