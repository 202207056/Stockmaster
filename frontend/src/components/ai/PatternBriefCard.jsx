import { comma } from '../../utils/format';
import { useEffect, useRef, useState } from 'react';
import { fetchPatternBrief } from '../../api/data';
import { LearningButton, LearningCard } from '../learn/LearningUI';

const confidenceLabels = { preliminary: '초기 표본', moderate: '중간 표본', sufficient: '충분한 표본' };

export default function PatternBriefCard({ accountId, practice = false }) {
  return <LearningCard title="AI 매매 패턴 회고">
    {practice ? <p className="text-sm text-gray-500">연습모드에서는 AI 회고를 요청하지 않습니다.</p>
      : !accountId ? <p className="text-sm text-gray-500">계좌를 선택해 주세요.</p>
        : <PatternRequest key={accountId} accountId={accountId} />}
  </LearningCard>;
}

function PatternRequest({ accountId }) {
  const controller = useRef(null);
  const [state, setState] = useState({ loading: false, data: null, error: false });
  useEffect(() => {
    const reset = () => {
      controller.current?.abort();
      controller.current = null;
      setState({ loading: false, data: null, error: false });
    };
    window.addEventListener('orders:changed', reset);
    return () => {
      controller.current?.abort();
      window.removeEventListener('orders:changed', reset);
    };
  }, []);

  async function generate() {
    if (controller.current) return;
    const current = new AbortController();
    controller.current = current;
    setState({ loading: true, data: null, error: false });
    try {
      const data = await fetchPatternBrief(accountId, current.signal);
      if (!current.signal.aborted) setState({ loading: false, data, error: false });
    } catch {
      if (!current.signal.aborted) setState({ loading: false, data: null, error: true });
    } finally {
      if (controller.current === current) controller.current = null;
    }
  }

  return <div className="space-y-4 text-sm leading-relaxed">
    <p className="text-gray-500">선택한 계좌의 체결 기록을 바탕으로 매매 습관과 투자성향을 돌아봅니다.</p>
    <LearningButton onClick={generate} disabled={state.loading}>
      {state.loading ? '회고 생성 중...' : state.data || state.error ? 'AI 회고 다시 보기' : 'AI 회고 보기'}
    </LearningButton>
    <p role="status" className="text-gray-500">{state.loading ? '체결 기록을 살펴보고 있어요.'
      : state.data?.status === 'insufficient' ? `체결 기록이 3건 이상 필요해요. 현재 ${comma(state.data.filled_count)}건입니다.`
        : state.data ? '회고 생성이 완료됐어요.' : ''}</p>
    {state.error && <p role="alert" className="text-gray-600">AI 회고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
    {state.data && state.data.status !== 'insufficient' && <PatternResult data={state.data} />}
  </div>;
}

function PatternResult({ data }) {
  return <div className="space-y-5 break-words [overflow-wrap:anywhere]">
    <h3 className="text-base font-bold text-gray-900">{data.headline}</h3>
    <p className="text-xs text-gray-500">체결 {comma(data.filled_count)}건 · {confidenceLabels[data.data_confidence]}</p>
    {data.data_confidence === 'preliminary' && <p className="text-gray-500">아직 기록이 적어 지속적인 매매 습관으로 단정하기 어려워요.</p>}
    {data.style_tags.length > 0 && <ul className="flex flex-wrap gap-2" aria-label="관찰된 매매 유형">
      {data.style_tags.map(tag => <li key={tag.code} className="rounded-full bg-gray-100 px-3 py-1 text-xs">{tag.label}</li>)}
    </ul>}
    <section><h4 className="mb-2 font-bold">관찰된 매매 패턴</h4>
      <ul className="space-y-3">{data.observed_patterns.map((item, index) => <li key={index}>
        <p className="font-medium">{item.title}</p><p className="text-gray-600">{item.evidence}</p>
      </li>)}</ul>
    </section>
    {data.investment_style_description && <p className="text-gray-600">설문 투자성향: {data.investment_style_description}</p>}
    {data.style_comparison === null ? <p className="text-gray-500">비교할 투자성향 정보가 없어요. 투자성향 설문을 완료하면 함께 돌아볼 수 있어요.</p>
      : [['matches', '투자성향과 일치하는 점'], ['differs', '투자성향과 다른 점']].map(([key, title]) =>
        data.style_comparison[key].length > 0 && <section key={key}><h4 className="mb-2 font-bold">{title}</h4>
          <ul className="space-y-3">{data.style_comparison[key].map(item => <li key={item.code}>
            <p>{item.text}</p>{item.note && <div className="mt-1 rounded-lg bg-gray-50 p-3 text-gray-600">
              <p>{item.note.reason}</p>{item.note.option && <p className="mt-1">{item.note.option}</p>}
            </div>}
          </li>)}</ul>
        </section>)}
    {data.limitations.length > 0 && <section className="text-xs text-gray-500"><h4 className="mb-2 font-bold">데이터 안내</h4>
      <ul className="list-disc space-y-1 pl-5">{data.limitations.map((text, index) => <li key={index}>{text}</li>)}</ul>
    </section>}
    <p className="border-t border-gray-100 pt-3 text-xs text-gray-500">{data.disclaimer}</p>
  </div>;
}
