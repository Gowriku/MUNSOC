"""
MUNPortal Seed Script — uses raw SQL to avoid ORM mapper config issues.
Run inside the backend container:
  docker exec -it munportal_backend python seed.py
"""

import asyncio
import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


COMMITTEES = [
    {
        "name": "United Nations Security Council",
        "abbreviation": "UNSC",
        "description": "The primary organ responsible for maintaining international peace and security.",
        "topics": "Conflict in the Middle East,Nuclear Non-Proliferation Treaty",
        "portfolios": [
            ("United States", "https://flagcdn.com/w40/us.png"),
            ("China",         "https://flagcdn.com/w40/cn.png"),
            ("Russia",        "https://flagcdn.com/w40/ru.png"),
            ("United Kingdom","https://flagcdn.com/w40/gb.png"),
            ("France",        "https://flagcdn.com/w40/fr.png"),
            ("India",         "https://flagcdn.com/w40/in.png"),
            ("Brazil",        "https://flagcdn.com/w40/br.png"),
            ("Germany",       "https://flagcdn.com/w40/de.png"),
            ("Japan",         "https://flagcdn.com/w40/jp.png"),
            ("South Africa",  "https://flagcdn.com/w40/za.png"),
        ],
    },
    {
        "name": "United Nations General Assembly",
        "abbreviation": "UNGA",
        "description": "The main deliberative, policymaking and representative organ of the UN.",
        "topics": "Climate Finance for Developing Nations,Regulation of Artificial Intelligence",
        "portfolios": [
            ("Australia",    "https://flagcdn.com/w40/au.png"),
            ("Canada",       "https://flagcdn.com/w40/ca.png"),
            ("Mexico",       "https://flagcdn.com/w40/mx.png"),
            ("Indonesia",    "https://flagcdn.com/w40/id.png"),
            ("Nigeria",      "https://flagcdn.com/w40/ng.png"),
            ("Pakistan",     "https://flagcdn.com/w40/pk.png"),
            ("Bangladesh",   "https://flagcdn.com/w40/bd.png"),
            ("Saudi Arabia", "https://flagcdn.com/w40/sa.png"),
            ("Egypt",        "https://flagcdn.com/w40/eg.png"),
            ("Turkey",       "https://flagcdn.com/w40/tr.png"),
            ("Argentina",    "https://flagcdn.com/w40/ar.png"),
            ("South Korea",  "https://flagcdn.com/w40/kr.png"),
        ],
    },
    {
        "name": "United Nations Human Rights Council",
        "abbreviation": "UNHRC",
        "description": "Responsible for promoting and protecting human rights around the globe.",
        "topics": "Rights of Refugees and Stateless Persons,Digital Surveillance and Privacy",
        "portfolios": [
            ("Netherlands", "https://flagcdn.com/w40/nl.png"),
            ("Sweden",      "https://flagcdn.com/w40/se.png"),
            ("Norway",      "https://flagcdn.com/w40/no.png"),
            ("Switzerland", "https://flagcdn.com/w40/ch.png"),
            ("Spain",       "https://flagcdn.com/w40/es.png"),
            ("Italy",       "https://flagcdn.com/w40/it.png"),
            ("Portugal",    "https://flagcdn.com/w40/pt.png"),
            ("Poland",      "https://flagcdn.com/w40/pl.png"),
        ],
    },
    {
        "name": "International Press Corps",
        "abbreviation": "IPC",
        "description": "Delegates act as journalists covering the conference and publishing news.",
        "topics": "Media Freedom in Conflict Zones,Combating Disinformation",
        "portfolios": [
            ("Reuters",          None),
            ("BBC World",        None),
            ("Al Jazeera",       None),
            ("The Hindu",        None),
            ("CNN International",None),
            ("AFP",              None),
        ],
    },
]

FEE_TIERS = [
    {"name": "Early Bird", "tier_key": "early_bird", "amount": 599.0, "days": 7},
    {"name": "Round 1",    "tier_key": "round1",     "amount": 699.0, "days": 14},
    {"name": "Round 2",    "tier_key": "round2",     "amount": 799.0, "days": 21},
]


async def seed():
    async with AsyncSessionLocal() as db:
        now = datetime.utcnow()

        # ── Check if already seeded ────────────────────────────────
        result = await db.execute(text("SELECT COUNT(*) FROM fee_tiers"))
        tier_count = result.scalar()
        if tier_count > 0:
            print("⏭  Fee tiers already exist, skipping...")
        else:
            for t in FEE_TIERS:
                await db.execute(text("""
                    INSERT INTO fee_tiers (id, name, tier_key, amount, deadline, is_active, created_at)
                    VALUES (:id, :name, :tier_key, :amount, :deadline, true, :now)
                """), {
                    "id":       str(uuid.uuid4()),
                    "name":     t["name"],
                    "tier_key": t["tier_key"],
                    "amount":   t["amount"],
                    "deadline": now + timedelta(days=t["days"]),
                    "now":      now,
                })
            print(f"✅ Created {len(FEE_TIERS)} fee tiers")

        # ── Committees & Portfolios ────────────────────────────────
        result = await db.execute(text("SELECT COUNT(*) FROM committees"))
        committee_count = result.scalar()
        if committee_count > 0:
            print("⏭  Committees already exist, skipping...")
        else:
            total_portfolios = 0
            for c in COMMITTEES:
                committee_id = str(uuid.uuid4())
                await db.execute(text("""
                    INSERT INTO committees (id, name, abbreviation, description, topics, is_active, created_at, updated_at)
                    VALUES (:id, :name, :abbr, :desc, :topics, true, :now, :now)
                """), {
                    "id":     committee_id,
                    "name":   c["name"],
                    "abbr":   c["abbreviation"],
                    "desc":   c["description"],
                    "topics": c["topics"],
                    "now":    now,
                })

                for country_name, flag_url in c["portfolios"]:
                    await db.execute(text("""
                        INSERT INTO portfolios (id, committee_id, country_name, flag_url, is_assigned, created_at, updated_at)
                        VALUES (:id, :committee_id, :country, :flag, false, :now, :now)
                    """), {
                        "id":           str(uuid.uuid4()),
                        "committee_id": committee_id,
                        "country":      country_name,
                        "flag":         flag_url,
                        "now":          now,
                    })
                    total_portfolios += 1

            print(f"✅ Created {len(COMMITTEES)} committees with {total_portfolios} portfolios")

        await db.commit()

    print("\n🎉 Seed complete!")
    print("\nNext step — make yourself admin:")
    print('  docker exec -it munportal_db psql -U munuser -d munportal \\')
    print('    -c "UPDATE users SET role = \'admin\' WHERE email = \'you@gmail.com\';"')


if __name__ == "__main__":
    asyncio.run(seed())