from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .schemas import UserCreate, User, AutoPlateCreate, AutoPlate, BidCreate, Bid
from .crud import create_user, get_user_by_username, create_plate, get_plates, get_plate, delete_plate, create_bid, get_user_bids, get_bid, update_bid, delete_bid
from .auth import verify_password, create_access_token, get_current_user, get_current_admin
from typing import List

app = FastAPI(title="Auto Plate Bidding API")

Base.metadata.create_all(bind=engine)

# Authentication
@app.post("/login/", response_model=dict)
def login(username: str, password: str, db: Session = Depends(get_db)):
    user = get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"token": access_token}

# User Registration (for testing)
@app.post("/register/", response_model=User)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    return create_user(db, user)

# Auto Plate Endpoints
@app.get("/plates/", response_model=List[AutoPlate])
def read_plates(ordering: str = None, plate_number__contains: str = None, db: Session = Depends(get_db)):
    plates = get_plates(db, order_by=ordering, plate_filter=plate_number__contains)
    for plate in plates:
        highest_bid = max([bid.amount for bid in plate.bids], default=None)
        plate.highest_bid = highest_bid
    return plates

@app.post("/plates/", response_model=AutoPlate)
def create_auto_plate(plate: AutoPlateCreate, user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return create_plate(db, plate, user.id)

@app.get("/plates/{plate_id}/", response_model=AutoPlate)
def read_plate(plate_id: int, db: Session = Depends(get_db)):
    plate = get_plate(db, plate_id)
    if not plate:
        raise HTTPException(status_code=404, detail="Plate not found")
    plate.highest_bid = max([bid.amount for bid in plate.bids], default=None) if plate.bids else None
    return plate

@app.delete("/plates/{plate_id}/")
def delete_auto_plate(plate_id: int, user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    return delete_plate(db, plate_id)

# Bid Endpoints
@app.get("/bids/", response_model=List[Bid])
def read_user_bids(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return get_user_bids(db, user.id)

@app.post("/bids/", response_model=Bid)
def create_user_bid(bid: BidCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return create_bid(db, bid, user.id)

@app.get("/bids/{bid_id}/", response_model=Bid)
def read_bid(bid_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bid = get_bid(db, bid_id)
    if not bid or bid.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your bid")
    return bid

@app.put("/bids/{bid_id}/", response_model=Bid)
def update_user_bid(bid_id: int, amount: float, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return update_bid(db, bid_id, amount, user.id)

@app.delete("/bids/{bid_id}/")
def delete_user_bid(bid_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return delete_bid(db, bid_id, user.id)