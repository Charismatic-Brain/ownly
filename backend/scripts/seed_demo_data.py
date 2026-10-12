import asyncio
import os
import sys
from datetime import datetime, timezone, timedelta
from bson import ObjectId

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from app.security.password import hash_password
from app.storage.gridfs import GridFSStorage
from app.db.indexes import create_indexes


async def seed_data():
    print(f"Connecting to MongoDB at {settings.MONGODB_URI} (db: {settings.MONGODB_DATABASE})...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DATABASE]

    print("Ensuring database indexes...")
    await create_indexes(db)

    print("Clearing prior synthetic demo records...")
    demo_emails = ["demo@ownly.dev", "partner@ownly.dev"]
    demo_users = await db["users"].find({"email": {"$in": demo_emails}}).to_list(10)
    user_ids = [u["_id"] for u in demo_users]

    if user_ids:
        await db["users"].delete_many({"_id": {"$in": user_ids}})
        await db["vault_collections"].delete_many({"ownerId": {"$in": user_ids}})
        await db["items"].delete_many({"ownerId": {"$in": user_ids}})
        await db["file_assets"].delete_many({"ownerId": {"$in": user_ids}})
        await db["reminders"].delete_many({"ownerId": {"$in": user_ids}})
        await db["transactions"].delete_many({"ownerId": {"$in": user_ids}})
        await db["bills"].delete_many({"ownerId": {"$in": user_ids}})
        await db["albums"].delete_many({"ownerId": {"$in": user_ids}})
        await db["media_assets"].delete_many({"ownerId": {"$in": user_ids}})
        await db["families"].delete_many({"createdBy": {"$in": user_ids}})
        await db["family_members"].delete_many({"userId": {"$in": user_ids}})
        await db["shares"].delete_many({"ownerId": {"$in": user_ids}})
        await db["shares"].delete_many({"recipientUserId": {"$in": user_ids}})
        await db["audit_logs"].delete_many({"actorUserId": {"$in": user_ids}})

    now = datetime.now(timezone.utc)
    gridfs_storage = GridFSStorage(db)

    # 1. Create Demo Users
    print("Creating demo accounts...")
    hashed_pwd = hash_password("DemoPassword123!")

    primary_user_doc = {
        "_id": ObjectId(),
        "email": "demo@ownly.dev",
        "passwordHash": hashed_pwd,
        "displayName": "Demo User",
        "createdAt": now - timedelta(days=60),
        "updatedAt": now - timedelta(days=60),
        "settings": {"timezone": "Asia/Kolkata", "theme": "system"},
    }
    await db["users"].insert_one(primary_user_doc)
    demo_user_id = primary_user_doc["_id"]

    partner_user_doc = {
        "_id": ObjectId(),
        "email": "partner@ownly.dev",
        "passwordHash": hashed_pwd,
        "displayName": "Sarah Miller",
        "createdAt": now - timedelta(days=45),
        "updatedAt": now - timedelta(days=45),
        "settings": {"timezone": "Asia/Kolkata", "theme": "system"},
    }
    await db["users"].insert_one(partner_user_doc)
    partner_user_id = partner_user_doc["_id"]

    # 2. Collections
    print("Creating structured vault collections...")
    col_identity = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "name": "Identity & Legal Records",
        "description": "Passports, driver license, and official synthetic identity documents",
        "icon": "shield-check",
        "parentId": None,
        "fieldDefinitions": [],
        "createdAt": now - timedelta(days=55),
        "updatedAt": now - timedelta(days=55),
        "deletedAt": None,
    }
    col_healthcare = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "name": "Healthcare & Medical",
        "description": "Family health records, insurance policies, and prescription cards",
        "icon": "heart-pulse",
        "parentId": None,
        "fieldDefinitions": [],
        "createdAt": now - timedelta(days=50),
        "updatedAt": now - timedelta(days=50),
        "deletedAt": None,
    }
    await db["vault_collections"].insert_many([col_identity, col_healthcare])

    col_prescriptions = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "name": "Prescriptions & Reports",
        "description": "Diagnostic lab results and active prescription cards",
        "icon": "file-text",
        "parentId": col_healthcare["_id"],
        "fieldDefinitions": [],
        "createdAt": now - timedelta(days=48),
        "updatedAt": now - timedelta(days=48),
        "deletedAt": None,
    }
    col_finance = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "name": "Financial & Investments",
        "description": "Tax returns, insurance certificates, and investment notes",
        "icon": "wallet",
        "parentId": None,
        "fieldDefinitions": [],
        "createdAt": now - timedelta(days=45),
        "updatedAt": now - timedelta(days=45),
        "deletedAt": None,
    }
    await db["vault_collections"].insert_many([col_prescriptions, col_finance])

    # 3. GridFS Files and Linked Items
    print("Uploading synthetic PDF documents to GridFS...")
    # Synthetic Passport PDF
    passport_pdf_content = (
        b"%PDF-1.4\n1 0 obj\n<< /Title (Synthetic Demo Passport Bio-Page) /Author (Ownly Demo) >>\n"
        b"endobj\nstream\nSYNTHETIC CITIZEN PASSPORT\nNumber: P99887722\nHolder: DEMO USER\n"
        b"Nationality: IN\nDOB: 15-AUG-1992\nValid Until: 31-DEC-2032\nendstream\n%%EOF"
    )

    async def passport_stream():
        yield passport_pdf_content

    passport_grid_id = await gridfs_storage.upload_stream(
        filename="Synthetic_Passport_BioPage.pdf",
        stream=passport_stream(),
        metadata={"ownerId": str(demo_user_id), "mimeType": "application/pdf"},
    )

    file_asset_passport = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "itemId": ObjectId(),  # will set to item id below
        "originalName": "Synthetic_Passport_BioPage.pdf",
        "mimeType": "application/pdf",
        "sizeBytes": len(passport_pdf_content),
        "storage": "gridfs",
        "gridFsId": passport_grid_id,
        "scanStatus": "clean",
        "uploadedAt": now - timedelta(days=40),
        "deletedAt": None,
    }

    item_passport = {
        "_id": file_asset_passport["itemId"],
        "ownerId": demo_user_id,
        "collectionId": col_identity["_id"],
        "title": "International Passport Scan (Synthetic)",
        "kind": "file",
        "description": "10-year official travel passport bio-data page scan.",
        "tags": ["identity", "travel", "passport"],
        "customFields": {"documentNumber": "P99887722", "issuingAuthority": "Regional Passport Office"},
        "content": None,
        "url": None,
        "fileIds": [file_asset_passport["_id"]],
        "favorite": True,
        "eventDate": None,
        "expiresAt": now + timedelta(days=2200),
        "createdAt": now - timedelta(days=40),
        "updatedAt": now - timedelta(days=40),
        "deletedAt": None,
    }
    await db["file_assets"].insert_one(file_asset_passport)
    await db["items"].insert_one(item_passport)

    # 4. Additional Items (Notes, Links, Records)
    print("Creating notes, bookmarks, and structured records...")
    item_wifi = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "collectionId": None,
        "title": "Home Wi-Fi & Smart Devices Passcode",
        "kind": "note",
        "description": "Dual-band mesh Wi-Fi network credentials and guest access.",
        "tags": ["home", "credentials", "devices"],
        "customFields": {},
        "content": (
            "SSID: MillerHome_5GHz\nPassword: MapleSyrup#2026\nGuest SSID: MillerGuest\n"
            "Guest Pass: WelcomeHome2026\nSmart Hub IP: 192.168.1.1"
        ),
        "url": None,
        "fileIds": [],
        "favorite": True,
        "eventDate": None,
        "expiresAt": None,
        "createdAt": now - timedelta(days=35),
        "updatedAt": now - timedelta(days=35),
        "deletedAt": None,
    }

    item_medical_record = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "collectionId": col_healthcare["_id"],
        "title": "Family Comprehensive Health Shield 2026",
        "kind": "record",
        "description": "Star Health family floater policy certificate details.",
        "tags": ["healthcare", "insurance", "family"],
        "customFields": {
            "policyNumber": "SYN-HLTH-99412",
            "sumInsured": "₹15,00,000",
            "provider": "Star Health & Allied Synthetic",
            "tpaHelpline": "1800-425-2255",
            "cashlessNetwork": "Apollo & Fortis Network",
        },
        "content": "Comprehensive cashless hospitalization coverage with zero room rent capping.",
        "url": None,
        "fileIds": [],
        "favorite": True,
        "eventDate": None,
        "expiresAt": now + timedelta(days=75),
        "createdAt": now - timedelta(days=30),
        "updatedAt": now - timedelta(days=30),
        "deletedAt": None,
    }

    item_tax_portal = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "collectionId": col_finance["_id"],
        "title": "Income Tax Department E-Filing Portal",
        "kind": "link",
        "description": "Annual Income Tax Return (ITR) filings and Form 26AS verification.",
        "tags": ["finance", "tax", "gov"],
        "customFields": {"pan": "ABCDE1234F"},
        "content": None,
        "url": "https://eportal.incometax.gov.in",
        "fileIds": [],
        "favorite": False,
        "eventDate": None,
        "expiresAt": None,
        "createdAt": now - timedelta(days=25),
        "updatedAt": now - timedelta(days=25),
        "deletedAt": None,
    }

    item_car_insurance = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "collectionId": col_finance["_id"],
        "title": "Motor Vehicle Comprehensive Insurance",
        "kind": "record",
        "description": "Honda City 2024 zero-depreciation policy and roadside assistance.",
        "tags": ["automobile", "insurance", "vehicle"],
        "customFields": {
            "policyNumber": "MOT-POL-4412",
            "vehicleReg": "DL-01-AB-1234",
            "idvValue": "₹11,50,000",
            "roadsideAssistNumber": "1800-102-1234",
        },
        "content": "Includes engine protector, tire secure, and zero depreciation cover.",
        "url": None,
        "fileIds": [],
        "favorite": False,
        "eventDate": None,
        "expiresAt": now + timedelta(days=14),  # due in 14 days!
        "createdAt": now - timedelta(days=20),
        "updatedAt": now - timedelta(days=20),
        "deletedAt": None,
    }

    await db["items"].insert_many([item_wifi, item_medical_record, item_tax_portal, item_car_insurance])

    # 5. Reminders
    print("Creating active deadline reminders...")
    reminders = [
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "itemId": item_car_insurance["_id"],
            "title": "Renew Vehicle Insurance Policy",
            "description": "Compare zero-dep add-on renewal quotes before policy expiration.",
            "remindAt": now + timedelta(days=12),
            "status": "pending",
            "priority": "high",
            "channel": "in_app",
            "createdAt": now - timedelta(days=10),
            "updatedAt": now - timedelta(days=10),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "itemId": None,
            "title": "Pay Monthly Electricity Bill (BSES)",
            "description": "Pay before late fee assessment on electricity account.",
            "remindAt": now + timedelta(days=2),
            "status": "pending",
            "priority": "urgent",
            "channel": "in_app",
            "createdAt": now - timedelta(days=5),
            "updatedAt": now - timedelta(days=5),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "itemId": None,
            "title": "Annual Full-Body Health Checkup Appointment",
            "description": "Fasting blood sugar and lipid profile test at diagnostic center.",
            "remindAt": now + timedelta(days=5),
            "status": "pending",
            "priority": "medium",
            "channel": "in_app",
            "createdAt": now - timedelta(days=7),
            "updatedAt": now - timedelta(days=7),
        },
    ]
    await db["reminders"].insert_many(reminders)

    # 6. Personal Finance (Transactions & Bills)
    print("Populating personal finance transactions and recurring bills...")
    transactions = [
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "type": "income",
            "amountPaise": 12500000,  # ₹1,25,000.00
            "currency": "INR",
            "category": "Salary",
            "description": "Monthly Salary Credit - Tech Corp India",
            "occurredAt": now - timedelta(days=12),
            "createdAt": now - timedelta(days=12),
            "updatedAt": now - timedelta(days=12),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "type": "expense",
            "amountPaise": 845000,  # ₹8,450.00
            "currency": "INR",
            "category": "Groceries",
            "description": "Monthly Organic Groceries & Household Essentials",
            "occurredAt": now - timedelta(days=9),
            "createdAt": now - timedelta(days=9),
            "updatedAt": now - timedelta(days=9),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "type": "expense",
            "amountPaise": 234000,  # ₹2,340.00
            "currency": "INR",
            "category": "Utilities",
            "description": "Electricity Bill Payment (BSES)",
            "occurredAt": now - timedelta(days=6),
            "createdAt": now - timedelta(days=6),
            "updatedAt": now - timedelta(days=6),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "type": "expense",
            "amountPaise": 385000,  # ₹3,850.00
            "currency": "INR",
            "category": "Dining",
            "description": "Weekend Family Dinner & Celebrations",
            "occurredAt": now - timedelta(days=4),
            "createdAt": now - timedelta(days=4),
            "updatedAt": now - timedelta(days=4),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "type": "expense",
            "amountPaise": 450000,  # ₹4,500.00
            "currency": "INR",
            "category": "Transportation",
            "description": "Monthly Fuel & Express Highway Toll Recharge",
            "occurredAt": now - timedelta(days=2),
            "createdAt": now - timedelta(days=2),
            "updatedAt": now - timedelta(days=2),
        },
    ]
    await db["transactions"].insert_many(transactions)

    bills = [
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "name": "BSES Yamuna Electricity",
            "amountPaise": 234000,  # ₹2,340.00
            "currency": "INR",
            "frequency": "monthly",
            "nextDueAt": now + timedelta(days=8),
            "status": "pending",
            "category": "Utilities",
            "createdAt": now - timedelta(days=30),
            "updatedAt": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "name": "Airtel Xstream Fiber (300 Mbps)",
            "amountPaise": 117900,  # ₹1,179.00
            "currency": "INR",
            "frequency": "monthly",
            "nextDueAt": now + timedelta(days=2),
            "status": "pending",
            "category": "Utilities",
            "createdAt": now - timedelta(days=30),
            "updatedAt": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "name": "Health Shield Quarterly Premium",
            "amountPaise": 650000,  # ₹6,500.00
            "currency": "INR",
            "frequency": "quarterly",
            "nextDueAt": now + timedelta(days=45),
            "status": "pending",
            "category": "Insurance",
            "createdAt": now - timedelta(days=40),
            "updatedAt": now - timedelta(days=40),
        },
    ]
    await db["bills"].insert_many(bills)

    # 7. Memories & Albums
    print("Creating photo album and synthetic media assets...")
    album_kerala = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "title": "Family Holiday to Kerala 2026",
        "description": "Munnar tea plantations, Alleppey backwaters houseboat, and Kochi sunset.",
        "eventDate": now - timedelta(days=28),
        "tags": ["travel", "kerala", "family", "vacation"],
        "createdAt": now - timedelta(days=25),
        "updatedAt": now - timedelta(days=25),
    }
    await db["albums"].insert_one(album_kerala)

    # 1x1 synthetic PNG bytes for media assets
    png_bytes = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06"
        b"\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf"
        b"\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    async def media_stream():
        yield png_bytes

    media_grid_id = await gridfs_storage.upload_stream(
        filename="alleppey_backwaters_sunset.png",
        stream=media_stream(),
        metadata={"ownerId": str(demo_user_id), "mimeType": "image/png"},
    )

    media_asset = {
        "_id": ObjectId(),
        "ownerId": demo_user_id,
        "albumId": album_kerala["_id"],
        "itemId": None,
        "originalName": "alleppey_backwaters_sunset.png",
        "mimeType": "image/png",
        "sizeBytes": len(png_bytes),
        "gridFsId": media_grid_id,
        "caption": "Golden hour from the houseboat deck in Alleppey",
        "takenAt": now - timedelta(days=28),
        "tags": ["backwaters", "sunset", "houseboat"],
        "createdAt": now - timedelta(days=25),
    }
    await db["media_assets"].insert_one(media_asset)

    # 8. Family Group & Granular Item Sharing
    print("Establishing family group and granular share grants...")
    family_doc = {
        "_id": ObjectId(),
        "name": "Miller Household Vault",
        "createdBy": demo_user_id,
        "createdAt": now - timedelta(days=20),
        "updatedAt": now - timedelta(days=20),
    }
    await db["families"].insert_one(family_doc)

    members = [
        {
            "_id": ObjectId(),
            "familyId": family_doc["_id"],
            "userId": demo_user_id,
            "role": "admin",
            "status": "accepted",
            "invitedBy": demo_user_id,
            "createdAt": now - timedelta(days=20),
        },
        {
            "_id": ObjectId(),
            "familyId": family_doc["_id"],
            "userId": partner_user_id,
            "role": "member",
            "status": "accepted",
            "invitedBy": demo_user_id,
            "createdAt": now - timedelta(days=19),
        },
    ]
    await db["family_members"].insert_many(members)

    # Share Health Record and Home Wi-Fi with Partner
    shares = [
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "resourceType": "item",
            "resourceId": item_medical_record["_id"],
            "recipientUserId": partner_user_id,
            "permissions": "view",
            "expiresAt": now + timedelta(days=90),
            "revokedAt": None,
            "createdAt": now - timedelta(days=18),
        },
        {
            "_id": ObjectId(),
            "ownerId": demo_user_id,
            "resourceType": "item",
            "resourceId": item_wifi["_id"],
            "recipientUserId": partner_user_id,
            "permissions": "edit",
            "expiresAt": None,
            "revokedAt": None,
            "createdAt": now - timedelta(days=15),
        },
    ]
    await db["shares"].insert_many(shares)

    # 9. Audit Logs
    print("Generating immutable security audit logs...")
    audit_logs = [
        {
            "_id": ObjectId(),
            "actorUserId": demo_user_id,
            "action": "auth.register",
            "resourceType": "user",
            "resourceId": str(demo_user_id),
            "outcome": "success",
            "metadata": {"displayName": "Demo User"},
            "createdAt": now - timedelta(days=60),
        },
        {
            "_id": ObjectId(),
            "actorUserId": demo_user_id,
            "action": "auth.login",
            "resourceType": "user",
            "resourceId": str(demo_user_id),
            "outcome": "success",
            "metadata": {"method": "password"},
            "createdAt": now - timedelta(days=1),
        },
        {
            "_id": ObjectId(),
            "actorUserId": demo_user_id,
            "action": "item.create",
            "resourceType": "item",
            "resourceId": str(item_medical_record["_id"]),
            "outcome": "success",
            "metadata": {"title": item_medical_record["title"], "kind": "record"},
            "createdAt": now - timedelta(days=30),
        },
        {
            "_id": ObjectId(),
            "actorUserId": demo_user_id,
            "action": "family.create",
            "resourceType": "family",
            "resourceId": str(family_doc["_id"]),
            "outcome": "success",
            "metadata": {"name": "Miller Household Vault"},
            "createdAt": now - timedelta(days=20),
        },
        {
            "_id": ObjectId(),
            "actorUserId": demo_user_id,
            "action": "share.create",
            "resourceType": "item",
            "resourceId": str(item_medical_record["_id"]),
            "outcome": "success",
            "metadata": {"recipientEmail": "partner@ownly.dev", "permissions": "view"},
            "createdAt": now - timedelta(days=18),
        },
    ]
    await db["audit_logs"].insert_many(audit_logs)

    print("\n=======================================================")
    print(" DEMO SEED DATA CREATED SUCCESSFULLY!")
    print("=======================================================")
    print("Primary Demo Account:")
    print("  Email:    demo@ownly.dev")
    print("  Password: DemoPassword123!")
    print("\nPartner Account (Family Member):")
    print("  Email:    partner@ownly.dev")
    print("  Password: DemoPassword123!")
    print("=======================================================\n")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_data())
