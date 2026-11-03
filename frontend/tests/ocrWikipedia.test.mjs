import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {GLOSSARY,GLOSSARY_COUNT} from '../src/constants/glossary.js';
import {createWikiLookup,inspectWikiArticle,validateWikiTerm,WIKI_ENDPOINT,WIKI_AGENT} from '../src/components/ai/term-analyzer/wikiLookup.js';
import {selectedNewsTerm} from '../src/components/ai/term-analyzer/termSelection.js';
const financial=(title='듀레이션 (금융)',extra={})=>({query:{pages:[{pageid:205002,ns:0,title,extract:'채권의 듀레이션은 현금흐름의 회수 시점과 금리 변화의 영향을 살펴보는 금융 개념이다.',categories:[{title:'분류:금융'}],...extra}]}});
const missing=title=>({query:{pages:[{ns:0,title,missing:true}]}});
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json',...headers}});
const client=options=>createWikiLookup({enabled:true,...options});

test('all 125 known dictionary labels resolve locally without any external request',async()=>{
  let calls=0;const api=client({fetchImpl:()=>{calls++;throw new Error('No network allowed');}});
  assert.equal(GLOSSARY_COUNT,176);
  for(const [id,entry] of Object.entries(GLOSSARY))assert.equal((await api.lookup(entry.term)).glossaryId,id,entry.term);
  assert.equal((await api.lookup('Trading')).glossaryId,'trading');assert.equal(calls,0);
});

test('feature defaults disabled; invalid or sensitive input is never sent',async()=>{
  let calls=0;const fetchImpl=()=>{calls++;throw new Error('No network allowed');};
  assert.equal((await createWikiLookup({fetchImpl}).lookup('듀레이션')).status,'disabled');
  for(const term of ['', 'a', 'x'.repeat(61), '듀레이션\n계좌', '123456-123456', '홍길동님', '성명: 홍길동', '잔고 100만원', 'user@example.com', 'Bearer secret', 'AIza'+'x'.repeat(30), 'https://example.com', '용어|다른문서']) {
    assert.equal(validateWikiTerm(term),null,term);
    assert.equal((await client({fetchImpl}).lookup(term)).status,'invalid_input');
  }
  assert.equal(calls,0);
});

test('unregistered term uses fixed anonymous CORS endpoint and returns attributed plaintext',async()=>{
  const calls=[];const api=client({fetchImpl:async(url,options)=>{calls.push({url:new URL(url),options});return reply(financial());}});
  const result=await api.lookup('듀레이션 (금융)');assert.equal(result.status,'found');assert.equal(calls.length,1);
  const {url,options}=calls[0];assert.equal(url.origin+url.pathname,WIKI_ENDPOINT);
  assert.equal(url.searchParams.get('titles'),'듀레이션 (금융)');assert.equal(url.searchParams.get('origin'),'*');
  assert.equal(url.searchParams.get('explaintext'),'1');assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
  assert.equal(options.headers['Api-User-Agent'],WIKI_AGENT);assert.equal(options.headers.Authorization,undefined);
  assert.equal(result.license,'CC BY-SA 4.0');assert.equal(new URL(result.url).hostname,'ko.wikipedia.org');assert.match(result.historyUrl,/action=history/u);
});

test('same-term concurrent requests deduplicate; short cache expires without storage',async()=>{
  let time=0,calls=0,release;
  const api=client({now:()=>time,successTtlMs:50,fetchImpl:()=>{calls++;return new Promise(resolve=>{release=()=>resolve(reply(financial()));});}});
  const first=api.lookup('듀레이션 (금융)'),second=api.lookup('듀레이션 (금융)');assert.equal(calls,1);release();
  assert.equal((await first).status,'found');assert.equal((await second).status,'found');
  assert.equal((await api.lookup('듀레이션 (금융)')).cached,true);assert.equal(calls,1);
  time=51;const again=api.lookup('듀레이션 (금융)');assert.equal(calls,2);release();await again;
});

test('cancelling one duplicate consumer leaves the other request alive',async()=>{
  let release,networkSignal;
  const api=client({fetchImpl:(url,{signal})=>{networkSignal=signal;return new Promise(resolve=>{release=()=>resolve(reply(financial()));});}});
  const controller=new AbortController();const first=api.lookup('듀레이션 (금융)',{signal:controller.signal});const second=api.lookup('듀레이션 (금융)');
  controller.abort();await assert.rejects(first,{name:'AbortError'});assert.equal(networkSignal.aborted,false);release();assert.equal((await second).status,'found');
});

test('explicit cancellation aborts transport and prevents late completion; new term supersedes old',async()=>{
  const signals=[];const api=client({fetchImpl:(url,{signal})=>{signals.push(signal);return new Promise(()=>{});}});
  const controller=new AbortController(),first=api.lookup('듀레이션 (금융)',{signal:controller.signal});controller.abort();
  await assert.rejects(first,{name:'AbortError'});assert.equal(signals[0].aborted,true);
  const old=api.lookup('듀레이션 (금융)');const latest=api.lookup('인플레이션');assert.equal((await old).status,'cancelled');
  api.cancel();assert.equal((await latest).status,'cancelled');
});

test('timeout settles even if a transport ignores abort; no automatic retries',async()=>{
  let calls=0;const api=client({timeoutMs:15,fetchImpl:()=>{calls++;return new Promise(()=>{});}});
  assert.equal((await api.lookup('듀레이션 (금융)')).status,'timeout');assert.equal(calls,1);
});

test('disambiguation without an exact finance candidate remains explicit',async()=>{
  let calls=0;const api=client({fetchImpl:async url=>{calls++;return reply(new URL(url).searchParams.has('list')?{query:{search:[]}}:financial('듀레이션',{pageprops:{disambiguation:''}}));}});
  assert.equal((await api.lookup('듀레이션')).status,'ambiguous');assert.equal(calls,2);
});

test('wrong title, nonfinancial article and person pages are rejected',()=>{
  assert.equal(inspectWikiArticle(financial('채권'),'듀레이션').status,'unrelated');
  assert.equal(inspectWikiArticle(financial('채권'),'채 권').status,'unrelated');
  assert.equal(inspectWikiArticle(financial('고양이',{extract:'고양이는 포유류 동물이다.',categories:[{title:'분류:고양이과 동물'}]}),'고양이').status,'not_financial');
  assert.equal(inspectWikiArticle(financial('경제학자명',{extract:'경제학자명은 경제학자이다.',categories:[{title:'분류:경제학자'}]}),'경제학자명').status,'not_financial');
});

test('only explicit API redirects establish a synonym',()=>{
  const data=financial();data.query.redirects=[{from:'채권 민감도',to:'듀레이션 (금융)'}];
  assert.equal(inspectWikiArticle(data,'채권 민감도').status,'found');
  assert.equal(inspectWikiArticle(financial(),'채권 민감도').status,'unrelated');
});

test('missing exact page may use a unique exact financial-qualified title from official search',async()=>{
  const responses=[missing('볼록성'),{query:{search:[{title:'볼록성 (금융)',ns:0}]}},financial('볼록성 (금융)')];
  let calls=0;const api=client({fetchImpl:async()=>reply(responses[calls++])});
  assert.equal((await api.lookup('볼록성')).status,'found');assert.equal(calls,3);
});

test('search rejects unrelated titles and presents multiple verified financial meanings',async()=>{
  const unrelated=client({fetchImpl:async url=>reply(new URL(url).searchParams.has('list')?{query:{search:[{title:'채권',ns:0}]}}:missing('듀레이션'))});
  assert.equal((await unrelated.lookup('듀레이션')).status,'not_found');
  const responses=[missing('볼록성'),{query:{search:[{title:'볼록성 (금융)',ns:0},{title:'볼록성 (경제)',ns:0}]}},
    {query:{pages:[financial('볼록성 (금융)').query.pages[0],financial('볼록성 (경제)',{pageid:205003}).query.pages[0]]}}];
  const ambiguous=client({fetchImpl:async()=>reply(responses.shift())});
  const result=await ambiguous.lookup('볼록성');assert.equal(result.status,'ambiguous');
  assert.deepEqual(result.candidates.map(item=>item.title),['볼록성 (금융)','볼록성 (경제)']);assert.equal(result.summary,undefined);
});

test('bare duration resolves a verified financial page in three requests with deduplication and cache',async()=>{
  const responses=[financial('듀레이션',{pageprops:{disambiguation:''}}),{query:{search:[{title:'듀레이션',ns:0},{title:'듀레이션 (금융)',ns:0},{title:'듀레이션 (음악)',ns:0}]}},financial()];
  const calls=[];const api=client({fetchImpl:async url=>{calls.push(new URL(url));return reply(responses.shift());}});
  const [first,second]=await Promise.all([api.lookup('듀레이션'),api.lookup('듀레이션')]);
  assert.equal(first.status,'found');assert.equal(first.title,'듀레이션 (금융)');assert.equal(first.term,'듀레이션');
  assert.equal(second.title,first.title);assert.equal(calls.length,3);
  assert.equal(calls[1].searchParams.get('srsearch'),'intitle:"듀레이션"');assert.equal(calls[1].searchParams.get('srlimit'),'5');
  assert.equal((await api.lookup('듀레이션')).cached,true);assert.equal(calls.length,3);
});

test('an exact nonfinancial or empty-summary page may fall back to a verified same-base finance title',async()=>{
  for(const extra of [{extract:''},{extract:'개념은 동물이다.',categories:[{title:'분류:동물'}]}]){
    const responses=[financial('회수기간',extra),{query:{search:[{title:'회수기간 (금융)',ns:0}]}},financial('회수기간 (금융)')];
    let calls=0;const api=client({fetchImpl:async()=>{calls++;return reply(responses.shift());}});
    assert.equal((await api.lookup('회수기간')).status,'found');assert.equal(calls,3);
  }
});

test('financial-looking titles with nonfinancial contents are rejected before choosing a unique candidate',async()=>{
  const rows=[{title:'민감도 (금융)',ns:0},{title:'민감도 (경제)',ns:0}];
  const pages=[financial('민감도 (금융)').query.pages[0],financial('민감도 (경제)',{pageid:205003,extract:'민감도는 동물의 감각이다.',categories:[{title:'분류:동물'}]}).query.pages[0]];
  const responses=[missing('민감도'),{query:{search:rows}},{query:{pages}}];
  const api=client({fetchImpl:async()=>reply(responses.shift())});
  const result=await api.lookup('민감도');assert.equal(result.status,'found');assert.equal(result.title,'민감도 (금융)');
});

test('incomplete search, incomplete category batch or unresolved meanings never auto-select a single visible candidate',async()=>{
  for(const mode of ['search-continuation','batch-continuation','empty-summary']){
    const rows=[{title:'민감도 (금융)',ns:0}],pages=[financial('민감도 (금융)').query.pages[0]];
    if(mode==='empty-summary'){rows.push({title:'민감도 (경제)',ns:0});pages.push(financial('민감도 (경제)',{pageid:205003,extract:''}).query.pages[0]);}
    const search={query:{search:rows}},batch={query:{pages}};
    if(mode==='search-continuation')search.continue={sroffset:5};
    if(mode==='batch-continuation')batch.continue={clcontinue:'remaining'};
    const responses=[missing('민감도'),search,batch];let calls=0;
    const result=await client({fetchImpl:async()=>{calls++;return reply(responses.shift());}}).lookup('민감도');
    assert.equal(result.status,'ambiguous',mode);assert.equal(result.candidates.length,1);assert.equal(result.summary,undefined);assert.equal(calls,3);
    if(mode==='empty-summary')assert.deepEqual(result.unverifiedTitles,['민감도 (경제)']);
  }
});

test('candidate batch is bounded at five documents and three GETs without recursive search',async()=>{
  const titles=['금융','경제학','채권','주식','증권'].map(field=>`검증개념 (${field})`);
  const responses=[missing('검증개념'),{query:{search:titles.map(title=>({ns:0,title}))}},
    {query:{pages:titles.map((title,index)=>financial(title,{pageid:205002+index}).query.pages[0])}}];
  const calls=[];const result=await client({fetchImpl:async url=>{calls.push(new URL(url));return reply(responses.shift());}}).lookup('검증개념');
  assert.equal(result.status,'ambiguous');assert.equal(result.candidates.length,5);assert.equal(calls.length,3);
  assert.equal(calls[2].searchParams.get('titles'),titles.join('|'));
});

test('batch candidates redirected to the same financial page do not become duplicate choices',async()=>{
  const responses=[missing('검증개념'),{query:{search:[{ns:0,title:'검증개념 (금융)'},{ns:0,title:'검증개념 (경제)'}]}},
    {query:{redirects:[{from:'검증개념 (경제)',to:'검증개념 (금융)'}],pages:financial('검증개념 (금융)').query.pages}}];
  const result=await client({fetchImpl:async()=>reply(responses.shift())}).lookup('검증개념');
  assert.equal(result.status,'found');assert.equal(result.title,'검증개념 (금융)');
});

test('a missing or malformed batch member prevents claiming a unique financial result',async()=>{
  for(const pages of [[financial('검증개념 (금융)').query.pages[0]], [null]]){
    const responses=[missing('검증개념'),{query:{search:[{ns:0,title:'검증개념 (금융)'},{ns:0,title:'검증개념 (경제)'}]}},{query:{pages}}];
    const result=await client({fetchImpl:async()=>reply(responses.shift())}).lookup('검증개념');
    assert.equal(result.status,'invalid_response');assert.equal(result.summary,undefined);
  }
});

test('nonfinancial input cannot adopt a related financial word or a longer title',async()=>{
  let calls=0;const api=client({fetchImpl:async url=>{calls++;return reply(new URL(url).searchParams.has('list')
    ?{query:{search:[{ns:0,title:'고양이 (음악)'},{ns:0,title:'고양이 투자 (금융)'},{ns:0,title:'채권 (금융)'}]}}
    :financial('고양이',{extract:'고양이는 동물이다.',categories:[{title:'분류:동물'}]}));}});
  assert.equal((await api.lookup('고양이')).status,'not_financial');assert.equal(calls,2);
});

test('cancelling a candidate batch stops the whole lookup without retries',async()=>{
  let calls=0,batchSignal;const controller=new AbortController();
  const api=client({fetchImpl:async(url,{signal})=>{
    calls++;if(calls===1)return reply(missing('검증개념'));
    if(calls===2)return reply({query:{search:[{ns:0,title:'검증개념 (금융)'}]}});
    batchSignal=signal;controller.abort();return new Promise(()=>{});
  }});
  await assert.rejects(api.lookup('검증개념',{signal:controller.signal}),{name:'AbortError'});
  assert.equal(calls,3);assert.equal(batchSignal.aborted,true);
});

test('empty result, missing summary, malformed JSON and bad page schemas are safe',async()=>{
  assert.equal(inspectWikiArticle(financial('듀레이션 (금융)',{extract:''}),'듀레이션 (금융)').status,'no_summary');
  for(const data of [{},null,{query:{pages:[null]}},{query:{pages:[]}}])assert.equal(inspectWikiArticle(data,'듀레이션').status,'invalid_response');
  assert.equal((await client({fetchImpl:async()=>new Response('{not json')}).lookup('듀레이션')).status,'invalid_response');
  const api=client({fetchImpl:async url=>reply(new URL(url).searchParams.has('list')?{query:{search:[]}}:missing('없는금융용어'))});
  assert.equal((await api.lookup('없는금융용어')).status,'not_found');
});

test('offline error and HTTP failure never fabricate a definition',async()=>{
  for(const fetchImpl of [()=>Promise.reject(new TypeError('offline')),async()=>reply({},500)]){
    const result=await client({fetchImpl}).lookup('듀레이션');assert.equal(result.status,'unavailable');assert.equal(result.summary,undefined);
  }
});

test('Retry-After is respected without automatic retry and local request budget is bounded',async()=>{
  let time=0,calls=0;
  const api=client({now:()=>time,fetchImpl:async()=>{calls++;return calls===1?reply({},429,{'Retry-After':'120'}):reply(financial());}});
  assert.equal((await api.lookup('듀레이션')).status,'rate_limited');assert.equal((await api.lookup('듀레이션 (금융)')).status,'rate_limited');assert.equal(calls,1);
  time=121000;assert.equal((await api.lookup('듀레이션 (금융)')).status,'found');assert.equal(calls,2);
  calls=0;const budget=client({maxRequestsPerMinute:1,fetchImpl:async()=>{calls++;return reply(financial());}});
  assert.equal((await budget.lookup('듀레이션 (금융)')).status,'found');assert.equal((await budget.lookup('인플레이션')).status,'rate_limited');assert.equal(calls,1);
});

test('only selected news words are retained; account areas, inputs, panels and whole paragraphs are rejected',()=>{
  const dom=new JSDOM('<div id="root"><section data-site-tour="news"><p id="news">새로운 듀레이션 개념</p><input id="input" value="듀레이션"></section><div id="account">계좌 잔고</div></div><div data-ocr-widget><p id="panel">듀레이션</p></div>');
  const {document}=dom.window;
  function select(id,start=0,end){const node=document.getElementById(id).firstChild;const range=document.createRange();range.setStart(node,start);range.setEnd(node,end??node.length);const selection=dom.window.getSelection();selection.removeAllRanges();selection.addRange(range);return selectedNewsTerm(document,selection);}
  try{
    assert.equal(select('news',4,8),'듀레이션');assert.equal(select('account'),'');assert.equal(select('panel'),'');
    document.getElementById('news').textContent='듀레이션\n원문 전체';assert.equal(select('news'),'');
    document.getElementById('news').textContent='123456-123456';assert.equal(select('news'),'');
  }finally{dom.window.close();}
});
