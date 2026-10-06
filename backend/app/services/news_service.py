"""
services/news_service.py - 뉴스 크롤링 서비스

네이버 금융에서 주식 관련 뉴스를 크롤링합니다.

크롤링(Crawling)이란?
    웹사이트의 HTML을 가져와서 원하는 정보를 추출하는 기술입니다.
    BeautifulSoup 라이브러리로 HTML을 파싱(분석)합니다.

주의사항:
    - 너무 자주 크롤링하면 해당 사이트에서 접근을 차단할 수 있습니다
    - 실제 서비스에서는 일정 간격으로 크롤링하고 DB에 저장하는 방식 권장
    - 네이버 금융 HTML 구조가 변경되면 크롤링 코드도 수정 필요

async/await 사용 이유:
    네트워크 요청(웹사이트 접속)은 시간이 걸리는 작업입니다.
    async/await로 처리하면 요청을 기다리는 동안 다른 요청도 처리 가능합니다.
"""

from urllib.parse import urljoin, urlsplit

import httpx
from bs4 import BeautifulSoup


class NewsUnavailable(Exception):
    """The upstream market news source could not be retrieved."""


MARKET_NEWS_URL = "https://news.naver.com/breakingnews/section/101/258"


def parse_market_news(html: str) -> list[dict]:
    """Extract each article and its own thumbnail without fetching article pages."""
    soup = BeautifulSoup(html, "html.parser")
    articles = []
    for item in soup.select("div.sa_text"):
        title_tag = item.select_one("a.sa_text_title")
        if title_tag is None or not title_tag.get_text(strip=True):
            continue
        card = item.find_parent(class_="sa_item_flex")
        image = card.select_one(".sa_thumb img") if card else None
        image_url = ""
        if image:
            for attribute in ("data-src", "src"):
                candidate = str(image.get(attribute) or "").strip()
                if not candidate:
                    continue
                candidate = urljoin(MARKET_NEWS_URL, candidate)
                parsed = urlsplit(candidate)
                if parsed.scheme in ("https", "http") and parsed.hostname:
                    image_url = candidate
                    break
        def text(selector):
            tag = item.select_one(selector)
            return tag.get_text(strip=True) if tag else ""
        articles.append({
            "title": title_tag.get_text(strip=True),
            "url": _news_url(title_tag.get("href", "")),
            "summary": text("div.sa_text_lede"),
            "source": text("div.sa_text_press"),
            "date": text("div.sa_text_datetime"),
            "image_url": image_url,
        })
    return articles


def _news_time(value: str) -> str:
    """202609271319 형태를 2026.09.27 13:19 로 바꾼다. 형식이 다르면 원문을 둔다."""
    text = (value or "").strip()
    if len(text) == 12 and text.isdigit():
        return f"{text[0:4]}.{text[4:6]}.{text[6:8]} {text[8:10]}:{text[10:12]}"
    return text


async def get_news_by_symbol(symbol_code: str, limit: int = 10) -> list[dict]:
    """
    특정 종목의 뉴스를 네이버 시세 뉴스 API에서 가져옵니다.

    예전 네이버 금융 종목 뉴스 페이지는 404라서 빈 배열이 됐습니다.
    이 API는 제목, 요약, 언론사, 시간, 링크를 JSON으로 줍니다.

    Args:
        symbol_code: 종목 코드 (예: "005930" = 삼성전자)
        limit: 가져올 뉴스 개수 (기본 10개)

    Returns:
        뉴스 목록. 실패하면 빈 리스트.
    """
    code = (symbol_code or "").strip()
    size = min(max(limit, 1), 20)
    url = f"https://m.stock.naver.com/api/news/stock/{code}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "application/json",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, headers=headers, params={"pageSize": size, "page": 1}, timeout=10)
        if resp.status_code >= 400:
            print(f"[뉴스] 종목 뉴스 조회 실패 code={code} status={resp.status_code}")
            return []

        payload = resp.json()
        groups = payload if isinstance(payload, list) else [payload]
        news_list = []
        seen = set()
        for group in groups:
            items = group.get("items") if isinstance(group, dict) else None
            if not isinstance(items, list):
                continue
            for item in items:
                if not isinstance(item, dict):
                    continue
                title = (item.get("titleFull") or item.get("title") or "").strip()
                link = (item.get("mobileNewsUrl") or "").strip()
                if not title or not link or link in seen:
                    continue
                seen.add(link)
                news_list.append({
                    "title": title,
                    "url": link,
                    "summary": (item.get("body") or "").strip(),
                    "source": (item.get("officeName") or "").strip(),
                    "date": _news_time(str(item.get("datetime") or "")),
                })
                if len(news_list) >= size:
                    break
            if len(news_list) >= size:
                break

        print(f"[뉴스] 종목 뉴스 code={code} status={resp.status_code} count={len(news_list)}")
        return news_list

    except Exception as e:
        print(f"[뉴스] 종목 뉴스 조회 실패 code={code} error={e}")
        return []


def _news_url(href: str) -> str:
    """이미 절대주소면 그대로 두고, 상대경로만 네이버 뉴스 도메인을 붙인다."""
    href = (href or "").strip()
    if href.startswith("https://") or href.startswith("http://"):
        return href
    if href.startswith("//"):
        return "https:" + href
    if href.startswith("/"):
        return "https://news.naver.com" + href
    return href


async def get_market_news(limit: int = 20) -> list[dict]:
    """
    증권 시장 뉴스를 네이버 뉴스 경제 면에서 가져옵니다.

    예전 네이버 금융 뉴스 목록은 기사 HTML이 없어 빈 배열이 됐습니다.
    이 페이지는 제목, 요약, 언론사, 시간이 본문에 있습니다.

    Args:
        limit: 가져올 뉴스 개수 (기본 20개)

    Returns:
        시장 뉴스 목록. 조회 실패 시 NewsUnavailable 예외.
    """
    # 101=경제, 258=증권
    url = MARKET_NEWS_URL
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    }

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            resp = await client.get(url, headers=headers, timeout=10)
        if resp.status_code >= 400:
            print(f"[뉴스] 시장 뉴스 조회 실패 status={resp.status_code}")
            raise NewsUnavailable("뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")

        news_list = parse_market_news(resp.text)[:limit]

        print(f"[뉴스] 시장 뉴스 status={resp.status_code} count={len(news_list)}")
        return news_list

    except Exception as e:
        print(f"[뉴스] 시장 뉴스 조회 실패: {e}")
        raise NewsUnavailable("뉴스를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.") from e
