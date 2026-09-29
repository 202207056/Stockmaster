# 오늘의 뉴스

시장 뉴스 API는 네이버 증권 뉴스 목록에서 제목, 요약, 원문 링크, 언론사,
발행 시간과 기사별 썸네일 주소(`image_url`)를 가져옵니다. 이미지 파일은 저장하지 않고
브라우저에서 해당 주소로 불러옵니다. 이미지가 없거나 로딩에 실패하면 신문 아이콘을 표시합니다.

운영 사이트에는 별도 백엔드 저장소 `gp-mock-inv`의 변경 사항을 배포해야 합니다.
기존 `GET /api/news/market` 응답 필드는 유지하고 `image_url`을 추가합니다.

## 로컬 확인

DB 없이 뉴스 기능만 확인할 때 백엔드 의존성을 설치한 Python 환경으로
`gp-mock-inv/backend`에서 실행합니다.

```powershell
python -m uvicorn app.news_preview:app --host 127.0.0.1 --port 8001
```

프론트 `frontend/.env.local`에 다음 값을 추가하면 뉴스만 로컬 API로 연결됩니다.
나머지 기능은 기존 `VITE_API_BASE_URL`을 계속 사용합니다.

```dotenv
VITE_NEWS_API_BASE_URL=http://127.0.0.1:8001/api
```

Vite를 실행하고 `/dashboard`의 오늘의 뉴스에서 기사 3개와 원문 링크를 확인합니다.
로컬 뉴스 서버를 종료하면 뉴스 조회가 실패하므로, 운영 백엔드 배포 후에는
위 환경변수를 제거하세요. 이 설정은 개발 모드에서만 적용되며 배포 빌드는 기존 백엔드를 사용합니다.

백엔드 회귀 테스트: `python -m unittest discover -s tests -p test_news.py -v`
