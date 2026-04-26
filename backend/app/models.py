from app import db
from datetime import datetime
import bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(100), unique=True, nullable=False)
    bio = db.Column(db.Text, default='')
    avatar_url = db.Column(db.String(500), default='')
    is_admin = db.Column(db.Boolean, default=False)
    notifications_enabled = db.Column(db.Boolean, default=True)
    two_factor_enabled = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    meal_logs = db.relationship('MealLog', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    reviews = db.relationship('Review', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    notifications = db.relationship('Notification', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    likes = db.relationship('Like', backref='user', lazy='dynamic', cascade='all, delete-orphan')
    comments = db.relationship('Comment', backref='user', lazy='dynamic', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'username': self.username,
            'bio': self.bio,
            'avatar_url': self.avatar_url,
            'is_admin': self.is_admin,
            'notifications_enabled': self.notifications_enabled,
            'created_at': self.created_at.isoformat()
        }


class MealLog(db.Model):
    __tablename__ = 'meal_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    food_name = db.Column(db.String(255), nullable=False)
    calories = db.Column(db.Float, nullable=False)
    proteins = db.Column(db.Float, default=0)
    fats = db.Column(db.Float, default=0)
    carbs = db.Column(db.Float, default=0)
    mood_score = db.Column(db.Integer, nullable=True)  # 1-10, настроение во время/после еды
    meal_time = db.Column(db.DateTime, default=datetime.utcnow)
    meal_type = db.Column(db.String(50), default='обед')  # завтрак, обед, ужин, перекус
    notes = db.Column(db.Text, default='')
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Likes/comments are queried directly via Like/Comment models

    def to_dict(self, current_user_id=None):
        likes_count = Like.query.filter_by(target_type='meal', target_id=self.id).count()
        liked = False
        if current_user_id:
            liked = Like.query.filter_by(
                user_id=current_user_id, target_type='meal', target_id=self.id
            ).first() is not None
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username,
            'food_name': self.food_name,
            'calories': self.calories,
            'proteins': self.proteins,
            'fats': self.fats,
            'carbs': self.carbs,
            'mood_score': self.mood_score,
            'meal_time': self.meal_time.isoformat(),
            'meal_type': self.meal_type,
            'notes': self.notes,
            'is_public': self.is_public,
            'likes_count': likes_count,
            'liked': liked,
            'created_at': self.created_at.isoformat()
        }


class MoodLog(db.Model):
    __tablename__ = 'mood_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    mood_score = db.Column(db.Integer, nullable=False)  # 1-10
    description = db.Column(db.Text, default='')
    logged_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'mood_score': self.mood_score,
            'description': self.description,
            'logged_at': self.logged_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }


class Place(db.Model):
    __tablename__ = 'places'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    address = db.Column(db.String(500), default='')
    description = db.Column(db.Text, default='')
    menu_info = db.Column(db.Text, default='')
    email = db.Column(db.String(255), default='')
    is_verified = db.Column(db.Boolean, default=False)
    added_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    reviews = db.relationship('Review', backref='place', lazy='dynamic', cascade='all, delete-orphan')

    def average_mood_impact(self):
        reviews = self.reviews.filter(Review.mood_impact.isnot(None)).all()
        if not reviews:
            return None
        return sum(r.mood_impact for r in reviews) / len(reviews)

    def to_dict(self):
        avg = self.average_mood_impact()
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'description': self.description,
            'menu_info': self.menu_info,
            'is_verified': self.is_verified,
            'average_mood_impact': round(avg, 2) if avg else None,
            'reviews_count': self.reviews.count(),
            'created_at': self.created_at.isoformat()
        }


class Review(db.Model):
    __tablename__ = 'reviews'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True)
    food_name = db.Column(db.String(255), default='')  # если отзыв о продукте
    text = db.Column(db.Text, nullable=False)
    mood_impact = db.Column(db.Integer)  # 1-10 (влияние на настроение)
    is_approved = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username,
            'place_id': self.place_id,
            'food_name': self.food_name,
            'text': self.text,
            'mood_impact': self.mood_impact,
            'is_approved': self.is_approved,
            'created_at': self.created_at.isoformat()
        }


class Like(db.Model):
    __tablename__ = 'likes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)  # 'meal', 'review'
    target_id = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'target_type', 'target_id', name='unique_like'),
    )


class Comment(db.Model):
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)  # 'meal', 'review'
    target_id = db.Column(db.Integer, nullable=False)
    text = db.Column(db.Text, nullable=False)
    is_approved = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'username': self.user.username,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'text': self.text,
            'created_at': self.created_at.isoformat()
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'like', 'comment', 'reminder', 'recommendation'
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }
