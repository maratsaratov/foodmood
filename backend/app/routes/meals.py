from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import MealLog, Notification, User
from datetime import datetime

meals_bp = Blueprint('meals', __name__)


@meals_bp.route('/', methods=['GET'])
@jwt_required()
def get_meals():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    meal_type = request.args.get('meal_type')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = MealLog.query.filter_by(user_id=user_id)

    if meal_type:
        query = query.filter_by(meal_type=meal_type)
    if date_from:
        query = query.filter(MealLog.meal_time >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(MealLog.meal_time <= datetime.fromisoformat(date_to))

    meals = query.order_by(MealLog.meal_time.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        'items': [m.to_dict(user_id) for m in meals.items],
        'total': meals.total,
        'pages': meals.pages,
        'page': page
    })


@meals_bp.route('/feed', methods=['GET'])
@jwt_required()
def get_feed():
    """Публичная лента приёмов пищи всех пользователей"""
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    meals = MealLog.query.filter_by(is_public=True)\
        .order_by(MealLog.created_at.desc())\
        .paginate(page=page, per_page=20)
    return jsonify({
        'items': [m.to_dict(user_id) for m in meals.items],
        'total': meals.total,
        'pages': meals.pages,
        'page': page
    })


@meals_bp.route('/', methods=['POST'])
@jwt_required()
def create_meal():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    food_name = data.get('food_name', '').strip()
    calories = data.get('calories')

    if not food_name:
        return jsonify({'error': 'Название блюда обязательно'}), 400
    if calories is None or float(calories) <= 0:
        return jsonify({'error': 'Калории должны быть больше 0'}), 400

    meal_time_str = data.get('meal_time')
    meal_time = datetime.fromisoformat(meal_time_str) if meal_time_str else datetime.utcnow()

    meal = MealLog(
        user_id=user_id,
        food_name=food_name,
        calories=float(calories),
        proteins=float(data.get('proteins', 0)),
        fats=float(data.get('fats', 0)),
        carbs=float(data.get('carbs', 0)),
        meal_time=meal_time,
        meal_type=data.get('meal_type', 'обед'),
        notes=data.get('notes', ''),
        is_public=bool(data.get('is_public', False))
    )
    db.session.add(meal)
    db.session.commit()
    return jsonify(meal.to_dict(user_id)), 201


@meals_bp.route('/<int:meal_id>', methods=['GET'])
@jwt_required()
def get_meal(meal_id):
    user_id = int(get_jwt_identity())
    meal = MealLog.query.get_or_404(meal_id)
    if meal.user_id != user_id and not meal.is_public:
        return jsonify({'error': 'Нет доступа'}), 403
    return jsonify(meal.to_dict(user_id))


@meals_bp.route('/<int:meal_id>', methods=['PUT'])
@jwt_required()
def update_meal(meal_id):
    user_id = int(get_jwt_identity())
    meal = MealLog.query.get_or_404(meal_id)
    if meal.user_id != user_id:
        return jsonify({'error': 'Нет доступа'}), 403

    data = request.get_json()
    if 'food_name' in data:
        meal.food_name = data['food_name'].strip()
    if 'calories' in data:
        if float(data['calories']) <= 0:
            return jsonify({'error': 'Калории должны быть больше 0'}), 400
        meal.calories = float(data['calories'])
    if 'proteins' in data:
        meal.proteins = float(data['proteins'])
    if 'fats' in data:
        meal.fats = float(data['fats'])
    if 'carbs' in data:
        meal.carbs = float(data['carbs'])
    if 'meal_type' in data:
        meal.meal_type = data['meal_type']
    if 'notes' in data:
        meal.notes = data['notes']
    if 'is_public' in data:
        meal.is_public = bool(data['is_public'])
    if 'meal_time' in data:
        meal.meal_time = datetime.fromisoformat(data['meal_time'])

    db.session.commit()
    return jsonify(meal.to_dict(user_id))


@meals_bp.route('/<int:meal_id>', methods=['DELETE'])
@jwt_required()
def delete_meal(meal_id):
    user_id = int(get_jwt_identity())
    meal = MealLog.query.get_or_404(meal_id)
    if meal.user_id != user_id:
        return jsonify({'error': 'Нет доступа'}), 403
    db.session.delete(meal)
    db.session.commit()
    return jsonify({'message': 'Запись удалена'})
