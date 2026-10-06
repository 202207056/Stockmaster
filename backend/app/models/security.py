"""
models/security.py - 종목(Security) 테이블 모델

주식, ELW, 선물옵션 등 거래 가능한 종목 정보를 저장합니다.
종목 코드(symbol_code)가 기본키이며 다른 테이블에서 참조합니다.

예시 데이터:
    symbol_code: "005930"
    name: "삼성전자"
    market_type: "국내주식"
    sector_code: "IT"
"""

from sqlalchemy import Column, String
from sqlalchemy.orm import relationship

from app.database import Base


class ItemMaster(Base):
    """
    종목 테이블 모델.
    
    주문 시 표에 없으면 한국 이름을 확인한 뒤 한 줄을 넣고 거래한다.
    초기 데이터는 DB팀 또는 증권 API에서 가져와서 채워야 합니다.
    """

    __tablename__ = "item_master"

    # 종목 코드 (기본키, 예: "005930" = 삼성전자)
    # 숫자처럼 보이지만 String으로 저장 (앞에 0이 있을 수 있음)
    symbol_code = Column(String(20), primary_key=True, index=True)

    # 종목명 (예: "삼성전자", "SK하이닉스")
    name = Column(String(100), nullable=False)

    # 시장 구분 (국내주식, ELW, 선물옵션 중 하나)
    market_type = Column(String(20), nullable=False)

    # 업종 코드 (예: IT, 금융, 바이오 등)
    # nullable=True: 없어도 됨
    sector_code = Column(String(20), nullable=True)

    # 관계 설정
    orders = relationship("Order", back_populates="item_master")
    portfolios = relationship("Portfolio", back_populates="item_master")
    price_histories = relationship("PriceHistory", back_populates="item_master")
