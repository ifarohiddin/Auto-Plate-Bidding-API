from sqlalchemy.orm import Session
from .models import User, AutoPlate, Bid
from .schemas import UserCreate, AutoPlateCreate, BidCreate
from datetime import datetime
from .auth import get_password_hash

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_plate(db: Session, plate: AutoPlateCreate, user_id: int):
    if db.query(AutoPlate).filter(AutoPlate.plate_number == plate.plate_number).first():
        raise HTTPException(status_code=400, detail="Plate number already exists")
    if plate.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Deadline must be in the future")
    db_plate = AutoPlate(**plate.dict(), created_by_id=user_id)
    db.add(db_plate)
    db.commit()
    db.refresh(db_plate)
    return db_plate

def get_plates(db: Session, skip: int = 0, limit: int = 100, order_by: str = None, plate_filter: str = None):
    query = db.query(AutoPlate).filter(AutoPlate.is_active == True)
    if plate_filter:
        query = query.filter(AutoPlate.plate_number.contains(plate_filter))
    if order_by:
        query = query.order_by(order_by)
    return query.offset(skip).limit(limit).all()

def get_plate(db: Session, plate_id: int):
    return db.query(AutoPlate).filter(AutoPlate.id == plate_id).first()

def delete_plate(db: Session, plate_id: int):
    plate = get_plate(db, plate_id)
    if not plate:
        raise HTTPException(status_code=404, detail="Plate not found")
    if plate.bids:
        raise HTTPException(status_code=400, detail="Cannot delete plate with active bids")
    db.delete(plate)
    db.commit()
    return plate

def create_bid(db: Session, bid: BidCreate, user_id: int):
    plate = db.query(AutoPlate).filter(AutoPlate.id == bid.plate_id).first()
    if not plate or not plate.is_active or plate.deadline <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="Bidding is closed")
    if db.query(Bid).filter(Bid.user_id == user_id, Bid.plate_id == bid.plate_id).first():
        raise HTTPException(status_code=400, detail="You already have a bid on this plate")
    highest_bid = db.query(Bid).filter(Bid.plate_id == bid.plate_id).order_by(Bid.amount.desc()).first()
    if highest_bid and bid.amount <= highest_bid.amount:
        raise HTTPException(status_code=400, detail="Bid must exceed current highest bid")
    db_bid = Bid(amount=bid.amount, user_id=user_id, plate_id=bid.plate_id)
    db.add(db_bid)
    db.commit()
    db.refresh(db_bid)
    return db_bid

def get_user_bids(db: Session, user_id: int):
    return db.query(Bid).filter(Bid.user_id == user_id).all()

def get_bid(db: Session, bid_id: int):
    return db.query(Bid).filter(Bid.id == bid_id).first()

def update_bid(db: Session, bid_id: int, amount: float, user_id: int):
    bid = get_bid(db, bid_id)
    if not bid or bid.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your bid")
    if bid.plate.deadline <= datetime.utcnow():
        raise HTTPException(status_code=403, detail="Bidding period has ended")
    bid.amount = amount
    db.commit()
    db.refresh(bid)
    return bid

def delete_bid(db: Session, bid_id: int, user_id: int):
    bid = get_bid(db, bid_id)
    if not bid or bid.user_id != user_id:
        raise HTTPException(status_code=403, detail="Not your bid")
    if bid.plate.deadline <= datetime.utcnow():
        raise HTTPException(status_code=403, detail="Bidding period has ended")
    db.delete(bid)
    db.commit()
    return bid