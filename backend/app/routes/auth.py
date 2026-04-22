from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__)



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
