from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    referral_code: str = None


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_verified: bool

    class Config:
        from_attributes = True


class SecureBookingRequest(BaseModel):
    bus_id: int
    bus_name: str
    origin: str
    destination: str
    departure: str
    arrival: str | None = None
    duration: str | None = None
    seat_number: str
    price: int