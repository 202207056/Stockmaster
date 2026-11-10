import useTutorialSetting from '../hooks/useTutorialSetting';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import AssetsTour from '../components/learn/AssetsTour';
import HelpIconButton from '../components/learn/HelpIconButton';
import { useCallback, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { comma, won, wonSigned, signTextClass, rate } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import useSiteResource from '../hooks/useSiteResource';
import { useSitePractice } from '../contexts/site-practice';
import { PracticeTarget } from '../components/learn/SitePractice';
import { fetchValuedPortfolio } from '../api/data';
import { numberOrNull, portfolioTotals, quotePrice } from '../api/normalize';
import AccountPicker from '../components/common/AccountPicker';
import StockLogo from '../components/common/StockLogo';
import AssetCharts from '../components/common/AssetCharts';
import RemoteState from '../components/common/RemoteState';
import PortfolioBriefCard from '../components/ai/PortfolioBriefCard';
import AssetPnlAdvice from '../components/ai/AssetPnlAdvice';
import './Assets.css';
import useMobileLayout from '../hooks/useMobileLayout';
import MobileSectionNav from '../components/common/MobileSectionNav';

/** Account-scoped balances, valuation and holdings; tutorial targets remain on their real controls. */
export default function Assets() {
  const practice = useSitePractice();
  const mobile = useMobileLayout() && !practice;
  const [mobileSection, setMobileSection] = useState('holdings');
  const surface = useRef(null);
  const [tutorialsEnabled] = useTutorialSetting();
  const [params] = useSearchParams();
  const [tourOverride,setTourOpen] = useState(null);
  const tourOpen = !params.has('tour') && (tourOverride ?? (tutorialsEnabled || params.get('practice') === 'account'));
  const { accounts = [], account, accountId, isAuthenticated, hasCachedSession } = useAuth();
  const [advice, setAdvice] = useState({ accountId, visible: false });
  if (advice.accountId !== accountId) setAdvice({ accountId, visible: false });
  const adviceVisible = advice.accountId === accountId && advice.visible;
  const setAdviceVisible = visible => setAdvice({ accountId, visible });
  const adviceId = useId();
  const resource = useSiteResource('portfolio', useCallback((signal) => fetchValuedPortfolio(accountId, signal), [accountId]), isAuthenticated && !!accountId, { keepPreviousData: true, cacheKey: JSON.stringify(['portfolio', accountId]), cachePreview: true });
  const totals = portfolioTotals(resource.data);

  const pending = !isAuthenticated ? '로그인 후 확인' : !accountId ? '계좌 선택 후 확인' : resource.loading ? '불러오는 중' : '조회 불가';
  const holdings = resource.data?.holdings ?? [];
  const cash = totals?.cash ?? numberOrNull(account?.withdrawable_cash);
  const returnRate = totals?.cost > 0 && totals?.unrealized != null ? totals.unrealized / totals.cost * 100 : null;
  const tradingHref = practice ? practice.href('/trading', holdings[0]?.symbol_code || '990001') : '/trading';

  return (
    <div ref={surface} className="assets-page">
      <header className="assets-heading">
        <div><h1>내 자산{!practice && isAuthenticated && accounts.length > 0 && <HelpIconButton open={tourOpen} aria-label="계좌 선택과 자산 조회 안내" onClick={() => setTourOpen(!tourOpen)} />}</h1></div>
        <div className="assets-toolbar">
          {(isAuthenticated || hasCachedSession) && <div data-assets-tour="account"><AccountPicker showLabel={false} /></div>}
        </div>
      </header>

      {!isAuthenticated && !hasCachedSession && <div className="assets-login"><p>로그인하면 모의투자 계좌의 잔액과 보유종목을 확인할 수 있어요.</p><Link to="/login">로그인 <ArrowUpRight size={16} aria-hidden="true" /></Link></div>}
      {holdings.some(holding => holding.quoteError) && <div role="status" className="assets-notice"><strong>일부 시세를 불러오지 못했어요.</strong><p>누락된 시세가 있어 총자산과 평가손익을 표시하지 않습니다.</p><ul>{holdings.filter(holding => holding.quoteError).map(holding => <li key={holding.portfolio_id ?? holding.symbol_code}>{holding.security_name || holding.symbol_code}: {holding.quoteError}</li>)}</ul><button disabled={resource.loading} onClick={resource.reload}>시세 다시 조회</button></div>}

      <div className={`assets-overview${!resource.data ? ' is-pending' : ''}`}>
        <div className="assets-balance-column"><PracticeTarget id="asset-total"><section data-assets-tour="total" className="assets-balance">
          <div className="assets-section-title"><h2>총자산 <HelpIcon termId="total_asset" /></h2></div>
          <p className="assets-total">{totals?.total != null ? won(totals.total) : <span className="assets-pending">{pending}</span>}</p>
          {resource.data && (resource.stale || resource.preview) && <p className="assets-stale" role="status">이전 조회 결과입니다.</p>}
          {(totals?.debt > 0 || totals?.pendingProceeds > 0) && <p className="assets-debt">미수 부족금 {won(totals.debt)} 차감 · 결제 대기 매도대금 {won(totals.pendingProceeds)} 포함. <Link to={tradingHref}>결제 내역 확인</Link></p>}
          <dl className="assets-stats">
            <AssetStat label="예수금" term="deposit" value={cash !== null ? won(cash) : null} pending={pending} />
            <AssetStat label="주문가능금액" term="orderable_cash" value={numberOrNull(account?.withdrawable_cash) !== null ? won(account.withdrawable_cash) : null} pending={pending} />
            <AssetStat label="평가손익" term="eval_pnl" value={totals?.unrealized != null ? wonSigned(totals.unrealized) : null} pending={pending} tone={totals?.unrealized != null ? signTextClass(totals.unrealized) : ''} onClick={() => setAdviceVisible(!adviceVisible)} expanded={adviceVisible} controls={adviceId} />
          </dl>
        </section></PracticeTarget>
        {adviceVisible && totals?.unrealized != null && <AssetPnlAdvice key={`${accountId}:${Math.sign(totals.unrealized)}`} id={adviceId} amount={totals.unrealized} accountId={accountId} practice={!!practice} />}
        </div>

        {mobile && <MobileSectionNav label="자산 보기" items={[["holdings", "보유종목"], ["detail", "잔고 상세"], ["analysis", "자산 분석"]]} value={mobileSection} onChange={setMobileSection} />}
        <PracticeTarget id="asset-investment"><section hidden={mobile && mobileSection !== 'detail' && !tourOpen && !params.has('tour')} data-assets-tour="investment" className="assets-investment">
          <div className="assets-section-title"><h2>내 투자 <HelpIcon termId="portfolio" /></h2></div>
          <dl className="assets-investment-list">
            <InvestmentRow label="매입금액" term="buy_amount" value={totals?.cost != null ? won(totals.cost) : null} pending={pending} />
            <InvestmentRow label="평가금액" term="eval_amount" value={totals?.market != null ? won(totals.market) : null} pending={pending} />
            <InvestmentRow label="평가손익" term="eval_pnl" value={totals?.unrealized != null ? wonSigned(totals.unrealized) : null} pending={pending} tone={totals?.unrealized != null ? signTextClass(totals.unrealized) : ''} />
            <InvestmentRow label="보유자산 수익률" value={returnRate !== null ? rate(returnRate) : null} pending={totals?.cost === 0 ? '매입금액 없음' : pending} tone={returnRate !== null ? signTextClass(returnRate) : ''} />
          </dl>
        </section></PracticeTarget>
      </div>

      <div className="mts-analysis-panel" hidden={mobile && mobileSection === 'detail'}><AssetCharts key={accountId} accountId={accountId} resource={resource} practice={!!practice} /></div>

      <PracticeTarget id="asset-holdings"><section hidden={mobile && mobileSection !== 'holdings' && !tourOpen && !params.has('tour')} data-assets-tour="holdings" className="assets-holdings">
        <div className="assets-section-title"><h2>보유종목 <HelpIcon termId="hold_quantity" />{resource.data && <span className="assets-count">{comma(holdings.length)}종목</span>}</h2><PracticeTarget id="trading-link"><Link to={tradingHref} onClick={() => practice?.event('trading')} className="assets-trading-link">트레이딩 <ArrowUpRight size={16} aria-hidden="true" /></Link></PracticeTarget></div>
        {isAuthenticated || hasCachedSession ? <RemoteState resource={resource} authenticated={isAuthenticated}>
          {holdings.length ? <div className="assets-table-wrap"><table className="assets-table"><caption className="sr-only">보유종목별 수량, 평균단가, 현재가와 평가손익</caption><thead><tr>{['종목', '보유수량', '평균단가', '현재가', '평가손익'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{holdings.map(holding => {
            const price = quotePrice(holding.quote);
            const changeRate = price !== null ? numberOrNull(holding.quote?.change_rate) : null;
            const average = numberOrNull(holding.avg_price);
            const quantity = numberOrNull(holding.hold_quantity);
            const pnl = price !== null && average !== null && quantity !== null ? (price - average) * quantity : null;
            return <tr key={holding.portfolio_id ?? holding.symbol_code}>
              <th scope="row"><PracticeTarget id="trading-link"><Link to={practice ? practice.href('/trading', holding.symbol_code) : `/trading?code=${encodeURIComponent(holding.symbol_code)}`} onClick={() => practice?.event('trading')}><StockLogo code={holding.symbol_code} name={holding.security_name} className="h-9 w-9" /><span className="assets-stock-name"><strong>{holding.security_name || holding.symbol_code}</strong><span className="assets-stock-code">{holding.symbol_code}</span></span></Link></PracticeTarget></th>
              <td data-label="보유수량">{quantity === null ? '—' : `${comma(quantity)}주`}</td><td data-label="평균단가">{average === null ? '—' : won(average)}</td><td data-label="현재가">{price === null ? <span className="assets-missing">시세 이용 불가</span> : won(price)}<span className={`assets-stock-change ${changeRate === null ? 'assets-missing' : signTextClass(changeRate)}`}>{changeRate === null ? <span aria-label="등락률 정보 없음">—</span> : rate(changeRate)}</span></td><td data-label="평가손익" className={pnl !== null ? signTextClass(pnl) : ''}>{pnl === null ? '—' : wonSigned(pnl)}</td>
            </tr>;
          })}</tbody></table></div> : <div className="assets-empty"><p>{accountId ? '보유한 종목이 없어요.' : '계좌를 선택해 주세요.'}</p><span>{accountId ? '매수한 종목의 수량과 평가손익이 여기에 표시됩니다.' : '위에서 조회할 계좌를 선택하면 자산을 확인할 수 있어요.'}</span></div>}
        </RemoteState> : <div className="assets-empty"><p>보유종목은 로그인 후 확인할 수 있어요.</p></div>}
      </section></PracticeTarget>

      {!practice && isAuthenticated && accounts.length > 0 && tourOpen && <AssetsTour surfaceRef={surface} accountCount={accounts.length} onClose={() => setTourOpen(false)} />}
      {isAuthenticated && <div hidden={mobile && mobileSection !== 'analysis'} className="assets-briefings"><PortfolioBriefCard accountId={accountId} holdings={holdings} practice={!!practice} /></div>}
    </div>
  );
}

function AssetStat({ label, term, value, pending, tone = '', onClick, expanded, controls }) {
  const trigger = { type: 'button', className: 'assets-pnl-trigger', onClick, disabled: value === null, 'aria-expanded': expanded, 'aria-controls': controls };
  return <div><dt>{onClick ? <button {...trigger}>{label}</button> : label}<HelpIcon termId={term} /></dt><dd className={value !== null ? tone : 'assets-missing'}>{onClick ? <button {...trigger} aria-label={`${label} ${value ?? pending}, AI 투자 조언`}>{value ?? <span aria-label={pending}>—</span>}</button> : value ?? <span aria-label={pending}>—</span>}</dd></div>;
}

function InvestmentRow({ label, term, value, pending, tone = '' }) {
  return <div><dt>{label}{term && <HelpIcon termId={term} />}</dt><dd className={value !== null ? tone : 'assets-missing'}>{value ?? <span aria-label={pending}>—</span>}</dd></div>;
}
