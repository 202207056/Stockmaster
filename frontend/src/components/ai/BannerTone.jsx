import './BannerTone.css';

const TONE_CLASS = { 호재: 'text-up-600', 악재: 'text-down-600', 엇갈림: 'text-flat-500' };

// 카드 요약 소식의 성격(호재·악재·엇갈림). 주가가 반대로 움직였으면 '악재에도 상승'처럼 함께 알려 준다.
export default function BannerTone({ tone, rate }) {
  if (!TONE_CLASS[tone]) return null;
  const move = Number(rate) || 0;
  const opposite = (tone === '악재' && move > 0) || (tone === '호재' && move < 0);
  return <em className={`banner-tone ${TONE_CLASS[tone]}${opposite ? ' banner-tone--opposite' : ''}`}>
    {opposite ? (tone === '악재' ? '악재에도 상승' : '호재에도 하락') : tone}</em>;
}
