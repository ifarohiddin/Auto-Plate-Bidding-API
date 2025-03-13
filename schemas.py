from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    username: str
    email: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_staff: bool
    class Config:
        orm_mode = True

class AutoPlateBase(BaseModel):
    plate_number: str = Field(..., max_length=10)
    description: str
    deadline: datetime

class AutoPlateCreate(AutoPlateBase):
    pass

class AutoPlate(AutoPlateBase):
    id: int
    is_active: bool
    highest_bid: Optional[float] = None
    bids: List["Bid"] = []
    class Config:
        orm_mode = True

class BidBase(BaseModel):
    amount: float = Field(..., gt=0)
    plate_id: int

class BidCreate(BidBase):
    pass

class Bid(BidBase):
    id: int
    user_id: int
    created_at: datetime
    class Config:
        orm_mode = True