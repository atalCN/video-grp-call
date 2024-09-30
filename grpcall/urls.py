from django.urls import path
from . import views

urlpatterns = [
    # path('', views.main_page, name='main_page'),
    # path('login/', views.login_view, name='login'),
    # path('register/', views.register_view, name='register'),
    # path('join/', views.join_room, name='join_room'),
    # path('room/', views.room_page, name='room_page'),
    # path('logout/', views.logout_view, name='logout'),
    path('', views.main_view, name='main'),
    # path('join/', views.join_room, name='join_room'),
    # path('room/<str:room_name>/', views.room_view, name='room'),
]
