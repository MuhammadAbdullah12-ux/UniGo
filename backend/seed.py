"""
Database seeder script for UniGo Transport Management System (Day 21).
Populates administrative accounts (Transport Admin, Accounts Officer),
sample student account (Muhammad Abdullah), and official FAST-NUCES bus routes.

Usage:
  python seed.py           # Idempotent seed: inserts missing accounts & routes
  python seed.py --reset   # Clean reset: drops tables, recreates schema, seeds fresh data
"""

import sys
from app.database import engine, SessionLocal, Base
from app.models import User, Route, Fee, FeeReceipt, Registration, Notification
from app.security import hash_password


def reset_schema():
    """Drops and recreates all database tables for a clean slate."""
    print("⚠️  Dropping all database tables...")
    Base.metadata.drop_all(bind=engine)
    print("🔨 Recreating fresh database schema...")
    Base.metadata.create_all(bind=engine)
    print("✓ Schema reset complete.")


def seed_database():
    """Executes the seeding transaction across demo accounts and transport routes."""
    db = SessionLocal()

    try:
        print("==================================================")
        print("🌱 Seeding UniGo PostgreSQL Database...")
        print("==================================================")

        # ----------------------------------------------------------------------
        # 1. Staff and Demo Accounts
        # ----------------------------------------------------------------------
        demo_accounts = [
            {
                "reg_no": None,
                "full_name": "Transport Administrator",
                "email": "admin@unigo.test",
                "password": "admin123",
                "role": "admin",
                "student_type": None,
                "phone": "0300-1112233"
            },
            {
                "reg_no": None,
                "full_name": "Accounts Officer",
                "email": "accounts@unigo.test",
                "password": "accounts123",
                "role": "accounts",
                "student_type": None,
                "phone": "0300-4445566"
            },
            {
                "reg_no": "23F-0509",
                "full_name": "Muhammad Abdullah",
                "email": "student@unigo.test",
                "password": "student123",
                "role": "student",
                "student_type": "day_scholar",
                "phone": "0301-7788990"
            }
        ]

        print("\n[1/2] Seeding Demo User Accounts:")
        for account in demo_accounts:
            existing_user = db.query(User).filter(User.email == account["email"]).first()
            if not existing_user:
                new_user = User(
                    reg_no=account["reg_no"],
                    full_name=account["full_name"],
                    email=account["email"],
                    password_hash=hash_password(account["password"]),
                    role=account["role"],
                    student_type=account["student_type"],
                    phone=account["phone"]
                )
                db.add(new_user)
                print(f"  ✓ Created: {account['role'].upper()} ({account['email']} / {account['password']})")
            else:
                # Refresh password to ensure known credentials work
                existing_user.password_hash = hash_password(account["password"])
                print(f"  ✓ Updated credentials: {account['role'].upper()} ({account['email']} / {account['password']})")

        # ----------------------------------------------------------------------
        # 2. FAST-NUCES Official Campus Bus Routes (All Rs. 36,000 / 55 Seats)
        # ----------------------------------------------------------------------
        official_routes = [
            {
                "name": "Route - 01 (Chenab Garden / D-Type)",
                "pickup_points": "Chenab Garden (7:05 AM) -> Korian Pull (7:11 AM) -> D-Type (7:12 AM) -> Waris Pura (7:17 AM) -> Raja Chowk (7:19 AM) -> Pahari Chowk (7:23 AM) -> Babar Chowk (7:24 AM) -> Hameed Palace (7:25 AM) -> McDonald's (7:26 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 02 (Nishatabad / Tariqabad)",
                "pickup_points": "Nishatabad (7:10 AM) -> Chowki Bazzar (7:12 AM) -> Nigahban Pura Phatak (7:13 AM) -> Tariqabad Phatak (7:15 AM) -> Rafhan Mills (7:20 AM) -> Treat Bakers (7:22 AM) -> Kashmir Pull (7:25 AM) -> Amin Town (7:28 AM) -> 66 Foot Bazar (7:31 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 03 (Millat Town / Green Town)",
                "pickup_points": "Millat Town (7:25 AM) -> Total Pump (7:27 AM) -> Green Town (7:29 AM) -> Family Mart (7:40 AM) -> Haq Bahu Chowk (7:43 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 04 (Samundari Road / BC Tower)",
                "pickup_points": "4 Season (7:00 AM) -> Total Pump Sumandari Road (7:07 AM) -> Care Pharmacy (7:17 AM) -> Madni Chowk (7:19 AM) -> Ideal Baker (7:20 AM) -> BC Tower (7:36 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 05 (Raza Abad / Jail Road)",
                "pickup_points": "Jawad Club Chowk (7:10 AM) -> Marzi Pura (7:15 AM) -> Kashmir Road (7:20 AM) -> Nashasta Chowk (7:23 AM) -> Mandi Morr (7:25 AM) -> Awan Chowk (7:28 AM) -> Kabootra Wala Chowk (7:30 AM) -> Chuhar Majra Mor (7:32 AM) -> Raza Abad (7:35 AM) -> Pakistan Chowk (7:37 AM) -> Bara Qabristan Mor (7:38 AM) -> SB Store (7:39 AM) -> University Gate (7:42 AM) -> Total Pump (7:44 AM) -> Saeed Autos (7:46 AM) -> Main Gate (7:48 AM) -> Small State Bypass (8:00 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 06 (Koh-e-Noor / Abdullah Pur)",
                "pickup_points": "Koh-e-Noor Flat (7:25 AM) -> Abdullah Pur Pull (7:34 AM) -> Tariqabad (7:35 AM) -> FDA Office (7:40 AM) -> Jamia Chishtia (7:48 AM) -> Kohlo Wali Galli (7:50 AM) -> Usman Colony (7:52 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 07 (Wapda City / Canal Road)",
                "pickup_points": "Faisal Garden (7:00 AM) -> Paradise Valley (7:05 AM) -> Wapda City (7:10 AM) -> Ghatt Wala Pull (7:20 AM) -> Beaconhouse (7:23 AM) -> SOS Pull (7:26 AM) -> Raza Garden (7:28 AM) -> Char Chak Pul (7:30 AM) -> Chamber Pull (7:32 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 08 (Chiniot City)",
                "pickup_points": "Station Chowk (7:35 AM) -> Shimla Pahari (7:40 AM) -> Embassy Morr (7:42 AM) -> Usman Abad (8:05 AM) -> Mustafa Abad (8:06 AM) -> Mandar Bazar (8:07 AM) -> Tehsil Chowk (8:08 AM) -> Ghala Mandi (8:09 AM) -> Khadija Tul Kubra Hospital (8:10 AM) -> Shamas Ul Hassan Town (8:11 AM) -> Din Garden (8:12 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 10 (Excise Office / Mujahid Hospital)",
                "pickup_points": "Social Security (7:25 AM) -> Qabristan Morr (7:26 AM) -> Mujahid Hospital (7:29 AM) -> Green Belt (7:31 AM) -> Faizan e Madina (7:33 AM) -> Lasania Morr (7:35 AM) -> Excise Office (7:45 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 11 (Airport / Gulshan Mor / Jail Road)",
                "pickup_points": "Bypass (6:55 AM) -> Airport (7:05 AM) -> Air Avenue (7:15 AM) -> Model Bazar Pull (7:20 AM) -> Saifabad Chungi (7:23 AM) -> Shadab Morr (7:24 AM) -> Gulfishan Mor (7:25 AM) -> 1122 (7:26 AM) -> Lakar Mandi (7:27 AM) -> BC Tower (7:35 AM) -> Total Pump Jail Road (7:40 AM) -> KIPS College (7:41 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 14 (Rachna Town / Gourmet Bakery)",
                "pickup_points": "Rachna Town (7:13 AM) -> Nadeem Cafe (7:15 AM) -> Muhammad Abad (7:16 AM) -> Saleemi Chowk (7:20 AM) -> Gourmet Bakery (7:21 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 16 (FDA City / Citi Housing / Motorway)",
                "pickup_points": "PMC Bridge (7:50 AM) -> Muslim Town 2 (7:55 AM) -> Bawa Chak (7:56 AM) -> Dawood Mill (7:57 AM) -> KIA Showroom (7:58 AM) -> Samana Pull (7:59 AM) -> FDA City (8:03 AM) -> Motorway City (8:05 AM) -> Citi Housing (8:08 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            },
            {
                "name": "Route - 17 (Chenab Chowk / National Hospital)",
                "pickup_points": "Abdullah Pull (7:10 AM) -> Navalti Pull (7:15 AM) -> Gao Shala (7:20 AM) -> Khawaja Travel (7:23 AM) -> Chenab Chowk (7:25 AM) -> Khawaja Medical (7:26 AM) -> Bakar Mandi (7:28 AM) -> National Hospital (7:30 AM) -> Riaz-Ul-Jannah (7:45 AM) -> Campus (8:25 AM)",
                "fee_amount": 36000.0,
                "seats_total": 55
            }
        ]

        print("\n[2/2] Seeding FAST-NUCES Transport Routes (Rs. 36,000 / 55 Seats):")
        for route_info in official_routes:
            existing_route = db.query(Route).filter(Route.name == route_info["name"]).first()
            if not existing_route:
                new_route = Route(
                    name=route_info["name"],
                    pickup_points=route_info["pickup_points"],
                    fee_amount=route_info["fee_amount"],
                    seats_total=route_info["seats_total"],
                    is_active=True
                )
                db.add(new_route)
                print(f"  ✓ Added: {route_info['name']}")
            else:
                print(f"  - Exists: {route_info['name']}")

        db.commit()
        print("\n==================================================")
        print("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("   Admin Account:    admin@unigo.test   / admin123")
        print("   Accounts Officer: accounts@unigo.test / accounts123")
        print("   Student Account:  student@unigo.test  / student123")
        print("==================================================")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Seeding failed with error: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    if "--reset" in sys.argv:
        reset_schema()
    seed_database()
