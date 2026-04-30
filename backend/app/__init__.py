from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
import os

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
mail = Mail()

# Upload configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), '..', 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def create_app():
    app = Flask(__name__, static_url_path='/static', static_folder='../uploads')

    # Config
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 'postgresql://postgres:ypursecurepassword@localhost:5432/edanastroenie'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
    app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

    # Mail config
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

    # Init extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    mail.init_app(app)
    CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')],
         supports_credentials=True)

    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.meals import meals_bp
    from app.routes.reviews import reviews_bp
    from app.routes.places import places_bp
    from app.routes.analytics import analytics_bp
    from app.routes.social import social_bp
    from app.routes.notifications import notifications_bp
    from app.routes.search import search_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(meals_bp, url_prefix='/api/meals')
    app.register_blueprint(reviews_bp, url_prefix='/api/reviews')
    app.register_blueprint(places_bp, url_prefix='/api/places')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(social_bp, url_prefix='/api/social')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    app.register_blueprint(search_bp, url_prefix='/api/search')

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'message': 'АИС ЕдаНастроение работает'}

    return app
