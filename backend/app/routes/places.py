from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Place, User

places_bp = Blueprint('places', __name__)


@places_bp.route('/', methods=['GET'])
@jwt_required()
def get_places():
    page = request.args.get('page', 1, type=int)
    search = request.args.get('search', '')
    query = Place.query
    if search:
        query = query.filter(Place.name.ilike(f'%{search}%'))
    places = query.order_by(Place.name).paginate(page=page, per_page=20)
    return jsonify({
        'items': [p.to_dict() for p in places.items],
        'total': places.total,
        'pages': places.pages
    })


@places_bp.route('/<int:place_id>', methods=['GET'])
@jwt_required()
def get_place(place_id):
    """Получить одно заведение — используется для обновления среднего рейтинга после отзыва."""
    place = Place.query.get_or_404(place_id)
    return jsonify(place.to_dict())


@places_bp.route('/', methods=['POST'])
@jwt_required()
def create_place():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Название заведения обязательно'}), 400

    if Place.query.filter_by(name=name).first():
        return jsonify({'error': 'Заведение с таким названием уже существует'}), 409

    place = Place(
        name=name,
        address=data.get('address', ''),
        description=data.get('description', ''),
        menu_info=data.get('menu_info', ''),
        email=data.get('email', ''),
        added_by=user_id,
        is_verified=False
    )
    db.session.add(place)
    db.session.commit()
    return jsonify(place.to_dict()), 201


@places_bp.route('/<int:place_id>/verify', methods=['POST'])
@jwt_required()
def verify_place(place_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user.is_admin:
        return jsonify({'error': 'Только администратор может верифицировать заведения'}), 403
    place = Place.query.get_or_404(place_id)
    place.is_verified = True
    db.session.commit()
    return jsonify(place.to_dict())
