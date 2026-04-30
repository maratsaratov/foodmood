from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User
import os
from werkzeug.utils import secure_filename
from PIL import Image
import uuid

auth_bp = Blueprint('auth', __name__)


def allowed_file(filename):
    """Проверка разрешённого расширения файла."""
    from app import ALLOWED_EXTENSIONS
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def optimize_image(filepath):
    """Оптимизация размера изображения."""
    try:
        img = Image.open(filepath)
        # Изменение размера до максимум 400x400
        img.thumbnail((400, 400), Image.Resampling.LANCZOS)
        img.save(filepath, quality=85, optimize=True)
    except Exception as e:
        print(f"Image optimization error: {e}")


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    username = data.get('username', '').strip()

    if not email or not password or not username:
        return jsonify({'error': 'Заполните все поля'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Пароль должен быть не менее 6 символов'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Пользователь с таким email уже существует'}), 409

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Имя пользователя уже занято'}), 409

    user = User(email=email, username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Неверный email или пароль'}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())


@auth_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if 'username' in data:
        new_username = data['username'].strip()
        existing = User.query.filter_by(username=new_username).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Имя пользователя уже занято'}), 409
        user.username = new_username

    if 'bio' in data:
        user.bio = data['bio']
    if 'notifications_enabled' in data:
        user.notifications_enabled = bool(data['notifications_enabled'])

    db.session.commit()
    return jsonify(user.to_dict())


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not user.check_password(old_password):
        return jsonify({'error': 'Неверный текущий пароль'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'Новый пароль должен быть не менее 6 символов'}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({'message': 'Пароль успешно изменён'})


@auth_bp.route('/users/<username>', methods=['GET'])
@jwt_required()
def get_user_profile(username):
    """Публичный профиль пользователя по username."""
    user = User.query.filter_by(username=username).first_or_404()
    return jsonify({
        'id': user.id,
        'username': user.username,
        'bio': user.bio,
        'avatar_url': user.avatar_url,
        'created_at': user.created_at.isoformat(),
    })


@auth_bp.route('/users/<username>/meals', methods=['GET'])
@jwt_required()
def get_user_public_meals(username):
    """Публичные записи питания пользователя."""
    from app.models import MealLog
    user = User.query.filter_by(username=username).first_or_404()
    current_user_id = int(get_jwt_identity())

    page = request.args.get('page', 1, type=int)
    meals = MealLog.query.filter_by(user_id=user.id, is_public=True)\
        .order_by(MealLog.meal_time.desc())\
        .paginate(page=page, per_page=20)

    return jsonify({
        'items': [m.to_dict(current_user_id) for m in meals.items],
        'total': meals.total,
        'pages': meals.pages,
        'page': page,
    })


@auth_bp.route('/me/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    """Загрузка аватарки пользователя."""
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)

    # Проверка файла
    if 'file' not in request.files:
        return jsonify({'error': 'Файл не выбран'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Файл не выбран'}), 400

    if not allowed_file(file.filename):
        return jsonify({'error': 'Недопустимый формат файла. Используйте: PNG, JPG, JPEG, GIF, WebP'}), 400

    # Создание папки uploads если её нет
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    # Генерация уникального имена файла
    ext = secure_filename(file.filename).rsplit('.', 1)[1].lower()
    filename = f"avatar_{user_id}_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_folder, filename)

    # Сохранение файла
    try:
        file.save(filepath)
        optimize_image(filepath)
        
        # Удаление старой аватарки если она была
        if user.avatar_url and user.avatar_url.startswith('avatar_'):
            old_path = os.path.join(upload_folder, user.avatar_url)
            if os.path.exists(old_path):
                os.remove(old_path)
        
        # Обновление пользователя
        user.avatar_url = filename
        db.session.commit()
        
        return jsonify({
            'message': 'Аватарка загружена успешно',
            'avatar_url': filename,
            'user': user.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': f'Ошибка при загрузке файла: {str(e)}'}), 500
