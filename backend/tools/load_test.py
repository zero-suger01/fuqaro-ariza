"""Small public-submit load test. Run only against an isolated test stack.

Example: python backend/tools/load_test.py --url http://127.0.0.1:8001 --count 100
"""
import argparse
import asyncio
import time

import httpx


async def main(url: str, count: int) -> None:
    async with httpx.AsyncClient(timeout=60) as client:
        async def submit(index: int):
            response = await client.post(f"{url.rstrip('/')}/api/public/complaints", data={"description": f"Yuk testi murojaati {index} uchun yo'l chirog'i ishlamayapti", "first_name": "YukTest", "last_name": "Bot", "phone": f"+99890100{index:04d}", "language": "uz", "source": "web"})
            return response.status_code
        started = time.perf_counter()
        statuses = await asyncio.gather(*(submit(i) for i in range(count)))
    elapsed = time.perf_counter() - started
    print({"count": count, "elapsed_seconds": round(elapsed, 2), "2xx": sum(200 <= s < 300 for s in statuses), "429": statuses.count(429), "5xx": sum(s >= 500 for s in statuses)})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8001")
    parser.add_argument("--count", type=int, default=100)
    args = parser.parse_args()
    asyncio.run(main(args.url, args.count))
