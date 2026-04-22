import pytest
from app import create_app, db
from app.models import User, MealLog, MoodLog


@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """Регистрируем пользователя и получаем токен"""
    res = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'username': 'testuser'
    })
    token = res.get_json()['token']
    return {'Authorization': f'Bearer {token}'}


# ---- Auth tests ----

def test_register(client):
    res = client.post('/api/auth/register', json={
        'email': 'new@example.com',
        'password': 'password123',
        'username': 'newuser'
    })
    assert res.status_code == 201
    data = res.get_json()
    assert 'token' in data
    assert data['user']['email'] == 'new@example.com'


def test_register_duplicate_email(client, auth_headers):
    res = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'password': 'password123',
        'username': 'otheruser'
    })
    assert res.status_code == 409


def test_login(client, auth_headers):
    res = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'password123'
    })
    assert res.status_code == 200
    assert 'token' in res.get_json()


def test_login_wrong_password(client, auth_headers):
    res = client.post('/api/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrongpassword'
    })
    assert res.status_code == 401


# ---- Meal tests ----

def test_create_meal(client, auth_headers):
    res = client.post('/api/meals/', json={
        'food_name': 'Гречка',
        'calories': 350,
        'meal_type': 'обед'
    }, headers=auth_headers)
    assert res.status_code == 201
    data = res.get_json()
    assert data['food_name'] == 'Гречка'
    assert data['calories'] == 350


def test_create_meal_invalid_calories(client, auth_headers):
    res = client.post('/api/meals/', json={
        'food_name': 'Тест',
        'calories': -100
    }, headers=auth_headers)
    assert res.status_code == 400


def test_create_meal_missing_name(client, auth_headers):
    res = client.post('/api/meals/', json={
        'calories': 200
    }, headers=auth_headers)
    assert res.status_code == 400


def test_get_meals(client, auth_headers):
    client.post('/api/meals/', json={'food_name': 'Овсянка', 'calories': 200}, headers=auth_headers)
    res = client.get('/api/meals/', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['total'] >= 1


def test_delete_meal(client, auth_headers):
    create_res = client.post('/api/meals/', json={
        'food_name': 'Суп', 'calories': 150
    }, headers=auth_headers)
    meal_id = create_res.get_json()['id']
    del_res = client.delete(f'/api/meals/{meal_id}', headers=auth_headers)
    assert del_res.status_code == 200


# ---- Mood tests ----

def test_create_mood(client, auth_headers):
    res = client.post('/api/moods/', json={
        'mood_score': 8,
        'description': 'Хорошее настроение'
    }, headers=auth_headers)
    assert res.status_code == 201
    assert res.get_json()['mood_score'] == 8


def test_create_mood_invalid_score(client, auth_headers):
    res = client.post('/api/moods/', json={'mood_score': 15}, headers=auth_headers)
    assert res.status_code == 400


# ---- Correlation test ----

def test_correlation_not_enough_data(client, auth_headers):
    res = client.get('/api/analytics/correlation', headers=auth_headers)
    assert res.status_code == 200
    assert res.get_json()['enough_data'] == False


def test_health(client):
    res = client.get('/api/health')
    assert res.status_code == 200
