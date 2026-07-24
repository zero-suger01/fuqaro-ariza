"""Import neighborhoods (mahalla) from a CSV file with a `name` column.

Run with: python -m app.tools.import_neighborhoods data/uychi_mfy.csv
"""
import csv
import sys

from app.database import SessionLocal
from app.models.neighborhood import Neighborhood


def run(csv_path: str) -> None:
    db = SessionLocal()
    try:
        added = 0
        with open(csv_path, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                name = (row.get("name") or "").strip()
                if not name:
                    continue
                if db.query(Neighborhood).filter(Neighborhood.name == name).first():
                    continue
                db.add(Neighborhood(name=name))
                added += 1
        db.commit()
        print(f"Imported {added} neighborhoods from {csv_path}")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python -m app.tools.import_neighborhoods <csv_path>")
        sys.exit(1)
    run(sys.argv[1])
