import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createServer} from 'vite';
import {aggregateMarketMood} from '../src/utils/marketMood.js';
const news=Array.from({length:12},(_,i)=>({title:`기사 ${i}`}));
const row=(id,label='POSITIVE',level='HIGH')=>({article_id:String(id),sentiment:{label},importance:{label:level}});
test('empty, failed, duplicate and outside range results',()=>{
 assert.equal(aggregateMarketMood().total,0);
 assert.equal(aggregateMarketMood(news,[row(0),row(0),row(1,'BAD'),row(2,'POSITIVE','BAD'),row(10)]).total,1);
});
test('mixed labels and HIGH follows input order',()=>{
 const m=aggregateMarketMood(news,[row(2,'NEGATIVE'),row(1,'NEUTRAL','LOW'),row(0)]);
 assert.deepEqual(m.counts,{POSITIVE:1,NEUTRAL:1,NEGATIVE:1});assert.equal(m.highTitle,'기사 0');
 assert.ok(Math.abs(Object.values(m.percentages).reduce((a,b)=>a+b,0)-100)<1e-9);
 assert.equal(aggregateMarketMood(news,[row(0,'NEUTRAL','LOW')]).highTitle,null);
});
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(async()=>server.close());
const {default:Card}=await server.ssrLoadModule('/src/components/dashboard/MarketMoodCard.jsx');
const data=[row(0),row(1,'NEUTRAL','LOW'),row(2,'NEGATIVE','MEDIUM')];
const render=(props={})=>renderToStaticMarkup(React.createElement(Card,{news,authenticated:true,resource:{data},...props}));
test('card normal render',()=>{const h=render();assert.match(h,/오늘의 시장 분위기/);assert.match(h,/AI 뉴스 분석 3건 기준/);assert.match(h,/호재 1 · 중립 1 · 악재 1/);assert.match(h,/기사 0/);assert.match(h,/시장 전망이나 투자 조언이 아닙니다/);});
test('card hides for short results, errors, logout',()=>{assert.equal(render({resource:{data:data.slice(0,2)}}),'');assert.equal(render({resource:{data,error:true}}),'');assert.equal(render({authenticated:false}),'');});
test('skeleton and no HIGH',()=>{assert.match(render({resource:{loading:true}}),/aria-busy/);assert.doesNotMatch(render({resource:{data:[row(0,'NEUTRAL','LOW'),row(1,'NEUTRAL','LOW'),row(2,'NEUTRAL','LOW')]}}),/중요도 높은 뉴스/);});
