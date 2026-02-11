"""
Authentication router for user registration and login.
Implements JWT-based authentication flow.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import timedelta

from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, Token, LoginRequest
from app.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.config import settings


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Register a new user account.
    
    Args:
        user_data: User registration data including email, password, and phone
        db: Database session
        
    Returns:
        Created user object
        
    Raises:
        HTTPException: If email already exists
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        phone_number=user_data.phone_number,
        hashed_password=hashed_password,
        timezone=user_data.timezone,
        preferred_call_time=user_data.preferred_call_time,
        voice_persona=user_data.voice_persona
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db)
) -> Token:
    """
    Login with email and password to receive JWT token.
    
    Args:
        credentials: Login credentials (email and password)
        db: Database session
        
    Returns:
        JWT access token
        
    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated user information.
    
    Args:
        current_user: Current authenticated user from JWT token
        
    Returns:
        User object
    """
    return current_user
