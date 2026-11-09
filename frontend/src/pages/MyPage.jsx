import { useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { UserRound, SlidersHorizontal, Wallet, ShieldCheck, ChevronRight, Sun, Moon } from 'lucide-react';
import ProfileSettings from '../components/common/ProfileSettings';
import useTutorialSetting from '../hooks/useTutorialSetting';
import useAuth from '../hooks/useAuth';
import { num, won } from '../utils/format';
import HelpIcon from '../components/learn/HelpIcon';
import LoginNotice from '../components/common/LoginNotice';
import AccountPicker from '../components/common/AccountPicker';
import Avatar from '../components/common/Avatar';
import useMiniAssetsSetting from '../hooks/useMiniAssetsSetting';
import DeleteMembership from '../components/common/DeleteMembership';
import useTermAnalyzerSetting from '../components/ai/term-analyzer/useTermAnalyzerSetting';
import { getTheme, setTheme, subscribeTheme } from '../utils/theme';
import CreateAccount from '../components/common/CreateAccount';
import './MyPage.css';

const sections = [
  ['profile', '프로필', UserRound, '다른 회원에게 보여지는 내 모습을 관리하세요.'],
  ['display', '화면 및 도구', SlidersHorizontal, '나에게 편한 화면과 투자 도구를 선택하세요.'],
  ['investment', '투자 설정', Wallet, '투자성향과 사용 중인 모의투자 계좌를 확인하세요.'],
  ['account', '계정 관리', ShieldCheck, '로그인 정보와 계정 이용을 관리하세요.'],
];

export default function MyPage() {
  const [params, setParams] = useSearchParams();
  const section = sections.some(([id]) => id === params.get('section')) ? params.get('section') : 'profile';
  const current = sections.find(([id]) => id === section);
  const { user, account, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [tutorialsEnabled, setTutorialsEnabled] = useTutorialSetting();
  const [miniAssetsEnabled, setMiniAssetsEnabled] = useMiniAssetsSetting();
  const [termAnalyzerEnabled, setTermAnalyzerEnabled] = useTermAnalyzerSetting();
  const theme = useSyncExternalStore(subscribeTheme, getTheme, () => 'light');
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState('');
  const select = id => { setParams(previous => { const next = new URLSearchParams(previous); next.set('section', id); return next; }); setNotice(''); setResetting(false); };
  const reset = () => {
    setTheme('light'); setTutorialsEnabled(true); setMiniAssetsEnabled(true); setTermAnalyzerEnabled(false);
    setResetting(false); setNotice('화면 옵션을 초기화했어요.');
  };
  return <div className="mypage-page settings-page">
    <header className="settings-heading"><h1>내 정보</h1><p>프로필부터 화면 환경까지, 내게 맞게 설정하세요.</p></header>
    <div className="settings-layout">
      <aside className="settings-sidebar">
        <div className="settings-identity"><Avatar name={user?.user_name || '방문자'} src={user?.profile_image} /><div><strong>{user?.user_name || '방문자'}</strong><span>{isAuthenticated ? '내 계정 설정' : '로그인 전에도 화면 설정이 가능해요'}</span></div></div>
        <nav aria-label="내 정보 메뉴">{sections.map(([id, title, Icon]) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => select(id)}><Icon size={18} aria-hidden="true" /><span>{title}</span><ChevronRight size={15} className="settings-nav-arrow" aria-hidden="true" /></button>)}</nav>
      </aside>
      <div className="settings-content">
        <header className="settings-section-heading"><h2>{current[1]}</h2><p>{current[3]}</p></header>
        <div hidden={section !== 'profile'} className="settings-panel">
          {isAuthenticated ? <ProfileSettings key={user?.user_id} /> : <LoginNotice message="프로필은 로그인 후 관리할 수 있어요" />}
        </div>
        <div hidden={section !== 'display'} className="settings-stack">
          <section className="settings-panel" aria-labelledby="appearance-title"><h3 id="appearance-title">화면 테마</h3><p className="settings-caption">화면에 바로 적용되며 이 브라우저에 저장됩니다.</p>
            <div className="settings-themes" role="group" aria-label="화면 테마">{[['light', '라이트', Sun], ['dark', '다크', Moon]].map(([id, title, Icon]) => <button type="button" key={id} aria-pressed={theme === id} onClick={() => setTheme(id)}><Icon size={20} aria-hidden="true" /><span>{title}</span><span className="settings-radio" aria-hidden="true" /></button>)}</div>
          </section>
          <section className="settings-panel" aria-labelledby="tools-title"><h3 id="tools-title">편의 기능</h3>
            <SwitchRow id="mini-assets" title="미니 내 자산 탭" description="어느 화면에서든 내 자산을 빠르게 확인합니다." value={miniAssetsEnabled} onChange={setMiniAssetsEnabled} />
            <SwitchRow id="tutorial" title="튜토리얼 자동 안내" description="매수·차트·내 자산·미수거래를 처음 이용할 때 안내합니다." value={tutorialsEnabled} onChange={setTutorialsEnabled} />
            <SwitchRow id="term-analyzer" title="AI 용어 분석 · 실험 기능" description="화면의 어려운 투자 용어를 찾아 설명합니다. 실험 중인 기능으로 결과가 정확하지 않을 수 있습니다." value={termAnalyzerEnabled} onChange={setTermAnalyzerEnabled} />
            <p className="settings-caption">옵션은 변경 즉시 적용됩니다. 저장 공간을 사용할 수 없으면 현재 세션에만 유지됩니다.</p>
          </section>
          <section className="settings-panel"><h3>이용 안내</h3><Link className="settings-link-row" to="/dashboard?tour=start"><span>사이트 둘러보기 다시 시작</span><ChevronRight size={17} aria-hidden="true" /></Link><Link className="settings-link-row" to="/learn"><span>투자 학습 및 도움말</span><ChevronRight size={17} aria-hidden="true" /></Link></section>
          <section className="settings-reset"><div><h3>화면 옵션 초기화</h3><p>라이트 테마, 자산 탭·튜토리얼 켜짐, AI 용어 분석 꺼짐으로 돌아갑니다.</p></div><button type="button" className="settings-button" onClick={() => setResetting(true)}>초기화</button>
            {resetting && <div className="settings-reset-confirm"><p>화면 옵션을 초기화할까요? 프로필과 투자 기록은 유지됩니다.</p><div><button type="button" className="settings-button" onClick={() => setResetting(false)}>취소</button><button type="button" className="settings-button settings-button-primary" onClick={reset}>초기화하기</button></div></div>}
            <p role="status" className="settings-feedback">{notice}</p>
          </section>
        </div>
        <div hidden={section !== 'investment'} className="settings-stack">
          {!isAuthenticated ? <LoginNotice message="투자 설정은 로그인 후 확인할 수 있어요" /> : <>
            <section className="settings-panel"><h3>나의 투자성향 <HelpIcon termId="risk_profile" /></h3><p className="settings-investment-style">{user?.investment_style || '아직 투자성향을 확인하지 않았어요'}</p><p className="settings-caption">투자 경험과 선호도에 맞는 성향을 확인해 보세요.</p><Link className="settings-button" to="/survey?mode=edit">{user?.investment_style ? '투자성향 설문 다시하기' : '투자성향 알아보기'}</Link></section>
            <section className="settings-panel"><h3>모의투자 계좌</h3><p className="settings-caption">선택한 계좌가 거래 및 자산 화면에도 적용됩니다.</p><AccountPicker />{account ? <dl className="settings-details"><Row label="계좌명" value={account.account_name} /><Row label="모의투자 계좌번호" value={account.account_number} /><Row label={<>예수금 <HelpIcon termId="deposit" /></>} value={account.withdrawable_cash == null ? '—' : won(num(account.withdrawable_cash))} /><Row label={<>주문가능금액 <HelpIcon termId="orderable_cash" /></>} value={account.withdrawable_cash == null ? '—' : won(num(account.withdrawable_cash))} /></dl> : <p className="settings-caption">표시할 계좌 정보가 없습니다.</p>}<Link className="settings-link-row" to="/assets"><span>내 자산 자세히 보기</span><ChevronRight size={17} aria-hidden="true" /></Link></section>
            <CreateAccount key={user?.user_id} />
          </>}
        </div>
        <div hidden={section !== 'account'} className="settings-stack">
          {!isAuthenticated ? <LoginNotice message="계정 관리는 로그인 후 이용할 수 있어요" /> : <>
            <section className="settings-panel"><h3>로그인 정보</h3><dl className="settings-details"><Row label="아이디" value={user?.login_id} /><Row label="이메일" value={user?.email} /></dl></section>
            <section className="settings-panel settings-logout"><div><h3>로그아웃</h3><p className="settings-caption">이 브라우저에서 현재 계정의 접속을 종료합니다.</p></div><button type="button" className="settings-button" onClick={() => { logout(); navigate('/login'); }}>로그아웃</button></section>
            <div className="settings-panel settings-danger"><DeleteMembership /></div>
          </>}
        </div>
      </div>
    </div>
  </div>;
}
function SwitchRow({ id, title, description, value, onChange }) {
  return <div className="settings-option"><div><p id={`${id}-setting-label`}>{title}</p><p id={`${id}-setting-description`}>{description}</p></div><button type="button" className="settings-switch" role="switch" aria-checked={value} aria-labelledby={`${id}-setting-label`} aria-describedby={`${id}-setting-description`} onClick={() => onChange(!value)}><span aria-hidden="true" /></button></div>;
}
function Row({ label, value }) {
  return <div><dt>{label}</dt><dd>{value ?? '—'}</dd></div>;
}
