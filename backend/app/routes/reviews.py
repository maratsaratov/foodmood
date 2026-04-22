from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import Review, User

reviews_bp = Blueprint('reviews', __name__)

SPAM_WORDS = ['спам', 'реклама', 'казино', 'xxx']


def check_spam(text):
    return any(w in text.lower() for w in SPAM_WORDS)


@reviews_bp.route('/', methods=['GET'])
@jwt_required()
def get_reviews():
    place_id = request.args.get('place_id', type=int)
    page = request.args.get('page', 1, type=int)
    query = Review.query.filter_by(is_approved=True)
    if place_id:
        query = query.filter_by(place_id=place_id)
    reviews = query.order_by(Review.created_at.desc()).paginate(page=page, per_page=20)
    return jsonify({
        'items': [r.to_dict() for r in reviews.items],
        'total': reviews.total,
        'pages': reviews.pages
    })


@reviews_bp.route('/', methods=['POST'])
@jwt_required()
def create_review():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    text = data.get('text', '').strip()

    if not text:
        return jsonify({'error': 'Текст отзыва обязателен'}), 400
    if check_spam(text):
        return jsonify({'error': 'Отзыв содержит недопустимые слова'}), 400

    mood_impact = data.get('mood_impact')
    if mood_impact and not (1 <= int(mood_impact) <= 10):
        return jsonify({'error': 'Оценка влияния на настроение от 1 до 10'}), 400

    # Проверка дублей
    existing = Review.query.filter_by(
        user_id=user_id,
        place_id=data.get('place_id'),
        text=text
    ).first()
    if existing:
        return jsonify({'error': 'Вы уже оставляли такой отзыв'}), 409

    review = Review(
        user_id=user_id,
        place_id=data.get('place_id'),
        food_name=data.get('food_name', ''),
        text=text,
        mood_impact=int(mood_impact) if mood_impact else None
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(review.to_dict()), 201


@reviews_bp.route('/<int:review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(review_id):
    user_id = int(get_jwt_identity())
    review = Review.query.get_or_404(review_id)
    user = User.query.get(user_id)
    if review.user_id != user_id and not user.is_admin:
        return jsonify({'error': 'Нет доступа'}), 403
    db.session.delete(review)
    db.session.commit()
    return jsonify({'message': 'Отзыв удалён'})
