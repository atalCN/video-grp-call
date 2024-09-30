from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseRedirect
from django.urls import reverse

# def main_page(request):
#     # If user is already logged in, redirect to room entry
#     if request.user.is_authenticated:
#         return redirect('join_room')
#     return render(request, 'main.html')

# def login_view(request):
#     if request.method == 'POST':
#         username = request.POST.get('username')
#         password = request.POST.get('password')
#         user = authenticate(request, username=username, password=password)
#         if user is not None:
#             login(request, user)
#             return redirect('join_room')  # After login, redirect to room entry
#         else:
#             return render(request, 'main.html', {'error': 'Invalid login details'})
#     return render(request, 'main.html')

# def register_view(request):
#     if request.method == 'POST':
#         username = request.POST.get('username')
#         password = request.POST.get('password')
#         if not User.objects.filter(username=username).exists():
#             user = User.objects.create_user(username=username, password=password)
#             login(request, user)  # Automatically login after registration
#             return redirect('join_room')
#         else:
#             return render(request, 'register.html', {'error': 'Username already exists'})
#     return render(request, 'register.html')

# @login_required
# def join_room(request):
#     if request.method == 'POST':
#         room_name = request.POST.get('room')
#         # Store room name in session
#         request.session['room_name'] = room_name
#         return redirect('room_page')
#     return render(request, 'join_room.html')

# @login_required
# def room_page(request):
#     # Fetch the room name from the session
#     room_name = request.session.get('room_name')
    
#     if not room_name:
#         return redirect('join_room')  # Redirect if room name is not in the session

#     return render(request, 'room.html', {'room_name': room_name})

# @login_required
# def logout_view(request):
#     logout(request)
#     return redirect('main_page')

# from django.shortcuts import render, redirect

def main_view(request):
    return render(request, 'main.html')



