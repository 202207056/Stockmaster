"""
models/order.py - 주문(Orders) 테이블 모델

매수/매도 주문 내역을 저장합니다.
시장가는 주문 즉시 체결하고, 지정가는 대기 상태로 남긴다.

주문 흐름:
    1. 사용자가 "삼성전자 10주 매수" 요청
    2. Orders 테이블에 status="대기" 로 저장
    3. 잔고 확인 후 체결 처리
    4. status="체결" 로 업데이트
    5. Portfolio(보유잔고) 업데이트
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import relationship

from app.database import Base


class Order(Base):
    """
    주문 테이블 모델.
    
    모든 매수/매도 기록이 여기에 남습니다.
    이것이 거래 내역 조회의 기반 데이터가 됩니다.
    """

    __tablename__ = "orders"

    # 주문 고유 번호 (자동 증가)
    order_id = Column(Integer, primary_key=True, index=True)

    # 어떤 계좌에서 주문했는지 (account 테이블 참조)
    account_id = Column(Integer, ForeignKey("account.account_id"), nullable=False)

    # 어떤 종목을 주문했는지 (item_master 테이블 참조)
    # 예: "005930" (삼성전자)
    symbol_code = Column(String(20), ForeignKey("item_master.symbol_code"), nullable=False)

    # 주문 종류: "매수" (사기), "매도" (팔기)
    order_type = Column(String(10), nullable=False)

    # 가격 종류: "시장가"는 현재가로 바로 체결, "지정가"는 대기
    price_type = Column(String(10), nullable=False, default="시장가", server_default="시장가")

    # 주문 단가 (1주당 가격). 시장가는 체결가, 지정가는 사용자가 지정한 가격.
    price = Column(Numeric(20, 2), nullable=False)

    # 이 주문에 계산한 수수료·세금. 지정가 대기는 예상 금액이고 잔고에는 반영하지 않는다.
    commission = Column(Numeric(20, 2), nullable=False, default=0, server_default="0")
    tax = Column(Numeric(20, 2), nullable=False, default=0, server_default="0")

    # 주문 수량 (몇 주 주문했는지)
    quantity = Column(Integer, nullable=False)

    # 주문 상태: "대기" → "체결" (또는 "취소", "거부")
    # 시장가는 "체결", 지정가는 "대기"
    status = Column(String(10), nullable=False, default="대기")

    # 주문 시간 (자동으로 현재 시간 저장)
    created_at = Column(DateTime, default=datetime.utcnow)

    # 관계 설정
    account = relationship("Account", back_populates="orders")
    item_master = relationship("ItemMaster", back_populates="orders")
