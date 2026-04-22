from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import MoodLog
from datetime import datetime

moods_bp = Blueprint('moods', __name__)


@moods_bp.route('/', methods=['GET'])
@jwt_required()
def get_moods():
    user_id = int(get_jwt_identity())
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    page = request.args.get('page', 1, type=int)

    query = MoodLog.query.filter_by(user_id=user_id)
    if date_from:
        query = query.filter(MoodLog.logged_at >= datetime.fromisoformat(date_from))
    if date_to:
        query = query.filter(MoodLog.logged_at <= datetime.fromisoformat(date_to))

    moods = query.order_by(MoodLog.logged_at.desc()).paginate(page=page, per_page=30)
    return jsonify({
        'items': [m.to_dict() for m in moods.items],
        'total': moods.total,
        'pages': moods.pages,
        'page': page
    })


@moods_bp.route('/', methods=['POST'])
@jwt_required()
def create_mood():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    mood_score = data.get('mood_score')
    if mood_score is None or not (1 <= int(mood_score) <= 10):
        return jsonify({'error': 'Оценка настроения должна быть от 1 до 10'}), 400

    logged_at_str = data.get('logged_at')
    logged_at = datetime.fromisoformat(logged_at_str) if logged_at_str else datetime.utcnow()

    mood = MoodLog(
        user_id=user_id,
        mood_score=int(mood_score),
        description=data.get('description', ''),
        logged_at=logged_at
    )
    db.session.add(mood)
    db.session.commit()
    return jsonify(mood.to_dict()), 201


@moods_bp.route('/<int:mood_id>', methods=['PUT'])
@jwt_required()
def update_mood(mood_id):
    user_id = int(get_jwt_identity())
    mood = MoodLog.query.get_or_404(mood_id)
    if mood.user_id != user_id:
        return jsonify({'error': 'Нет доступа'}), 403

    data = request.get_json()
    if 'mood_score' in data:
        if not (1 <= int(data['mood_score']) <= 10):
            return jsonify({'error': 'Оценка настроения должна быть от 1 до 10'}), 400
        mood.mood_score = int(data['mood_score'])
    if 'description' in data:
        mood.description = data['description']

    db.session.commit()
    return jsonify(mood.to_dict())


@moods_bp.route('/<int:mood_id>', methods=['DELETE'])
@jwt_required()
def delete_mood(mood_id):
    user_id = int(get_jwt_identity())
    mood = MoodLog.query.get_or_404(mood_id)
    if mood.user_id != user_id:
        return jsonify({'error': 'Нет доступа'}), 403
    db.session.delete(mood)
    db.session.commit()
    return jsonify({'message': 'Запись удалена'})
