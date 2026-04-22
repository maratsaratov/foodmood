from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import Place, Review, MealLog

search_bp = Blueprint('search', __name__)


@search_bp.route('/', methods=['GET'])
@jwt_required()
def search():
    q = request.args.get('q', '').strip()
    search_type = request.args.get('type', 'all')  # all, places, products

    if not q or len(q) < 2:
        return jsonify({'error': 'Поисковый запрос должен содержать минимум 2 символа'}), 400

    results = {}

    if search_type in ('all', 'places'):
        places = Place.query.filter(
            Place.name.ilike(f'%{q}%')
        ).limit(10).all()
        results['places'] = [p.to_dict() for p in places]

    if search_type in ('all', 'products'):
        # Уникальные продукты из записей питания (публичные)
        meals = MealLog.query.filter(
            MealLog.food_name.ilike(f'%{q}%'),
            MealLog.is_public == True
        ).limit(20).all()

        seen = set()
        products = []
        for m in meals:
            name = m.food_name.lower()
            if name not in seen:
                seen.add(name)
                # Средний рейтинг из отзывов
                products.append({
                    'food_name': m.food_name,
                    'avg_calories': m.calories
                })
        results['products'] = products

    return jsonify(results)
