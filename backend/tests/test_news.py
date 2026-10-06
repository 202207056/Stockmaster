import unittest
from unittest.mock import AsyncMock, patch
import httpx
from fastapi.testclient import TestClient
from app.news_preview import app
from app.services import news_service as news


def card(title, image=""):
    return f'''<div class="sa_item_flex"><div class="sa_thumb">{image}</div>
    <div class="sa_text"><a class="sa_text_title" href="/article/{title}">{title}</a>
    <div class="sa_text_lede">Summary</div><div class="sa_text_press">Source</div>
    <div class="sa_text_datetime">1 minute ago</div></div></div>'''


HTML = (card("First", '<img data-src="https://example.com/first.jpg" src="placeholder.gif">')
        + card("NoImage") + card("Third", '<img src="//example.com/third.jpg">')
        + card("Unsafe", '<img data-src="javascript:alert(1)">'))


class NewsTests(unittest.IsolatedAsyncioTestCase):
    def test_images_stay_with_articles_and_lazy_source_wins(self):
        result = news.parse_market_news(HTML)
        self.assertEqual([item['image_url'] for item in result], [
            'https://example.com/first.jpg', '', 'https://example.com/third.jpg', ''])
        self.assertEqual(result[0]['summary'], 'Summary')
        self.assertEqual(result[0]['source'], 'Source')
        self.assertEqual(result[0]['url'], 'https://news.naver.com/article/First')

    async def test_market_limit_and_api_image_response(self):
        response = httpx.Response(200, text=HTML, request=httpx.Request('GET', news.MARKET_NEWS_URL))
        with patch.object(httpx.AsyncClient, 'get', new_callable=AsyncMock, return_value=response):
            self.assertEqual(len(await news.get_market_news(2)), 2)
            with TestClient(app) as client:
                result = client.get('/api/news/market?limit=1')
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json()[0]['image_url'], 'https://example.com/first.jpg')

    async def test_failure_does_not_masquerade_as_empty_success(self):
        with patch.object(httpx.AsyncClient, 'get', new_callable=AsyncMock, side_effect=httpx.ConnectError('offline')):
            with self.assertRaises(news.NewsUnavailable):
                await news.get_market_news()

    def test_api_validation_and_error(self):
        with TestClient(app) as client:
            self.assertEqual(client.get('/api/news/market?limit=0').status_code, 422)
            with patch('app.routers.news.get_market_news', new_callable=AsyncMock, side_effect=news.NewsUnavailable('unavailable')):
                self.assertEqual(client.get('/api/news/market').status_code, 502)


if __name__ == '__main__':
    unittest.main()
