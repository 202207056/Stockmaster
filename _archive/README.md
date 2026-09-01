# _archive — 정리 과정에서 걷어낸 파일 보관소

2026-08-26 저장소 정리 시, 루트에서 제거한 파일의 원본 내용을 여기에 옮겨 두었습니다.
현재 git 추적 대상이 아닙니다. 저장소에 함께 올릴지 여부는 미정입니다.

| 파일 | 원래 위치 | 제거 이유 |
|---|---|---|
| `초기_설계_ERD.dbml` | `Database/Table` | 설계 단계 산출물. 실제 스키마와 이미 어긋남 (아래 참고) |
| `구_backend_requirements.txt` | `backend/requirements.txt` | gp-mock-inv 이전에 만들다 만 초기 뼈대. 실제 백엔드와 의존성 불일치 |

## 현재 스키마의 정본

이 저장소가 아니라 백엔드 저장소에 있습니다.

- 모델: `gp-mock-inv/backend/app/models/*.py`
- 변경 이력: `gp-mock-inv/backend/alembic/versions/`
- 백엔드 저장소: https://github.com/202207048/gp-mock-inv

`초기_설계_ERD.dbml`이 실제와 다른 부분:

- 문서에 없음: `posts`, `comments`, `post_likes`, `follows` (커뮤니티·팔로우)
- 문서에만 있음: `ai_news_summary` (실제로는 모델 없이 실시간 크롤링)
- 가격 컬럼: 문서는 `decimal`, 실제는 정수 (`change_price_columns_to_integer` 마이그레이션)
- 테이블명: 문서는 `Account`/`Orders`/`PriceHistory`, 실제는 소문자 스네이크케이스

ERD가 필요하면 손으로 맞추지 말고 실제 DB에서 다시 뽑으세요.
