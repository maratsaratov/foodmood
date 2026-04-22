#!/usr/bin/env python
"""Flask CLI entry point — используется flask db init/migrate/upgrade"""
from app import create_app, db
from app.models import User, MealLog, MoodLog, Place, Review, Like, Comment, Notification

app = create_app()

@app.shell_context_processor
def make_shell_context():
    return dict(db=db, User=User, MealLog=MealLog, MoodLog=MoodLog,
                Place=Place, Review=Review, Like=Like, Comment=Comment,
                Notification=Notification)
