
import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createServer} from 'vite';
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost/assets?practice=account'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true,ResizeObserver:class {observe(){} disconnect(){}}});
const React=await import('react');
const {createRoot}=await import('react-dom/client');
const {MemoryRouter}=await import('react-router-dom');
const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(async()=>{await server.close();dom.window.close();});
const {default:Tour}=await server.ssrLoadModule('/src/components/learn/AssetsTour.jsx');
const {default:SitePractice}=await server.ssrLoadModule('/src/components/learn/SitePractice.jsx');
const {AuthContext}=await server.ssrLoadModule('/src/contexts/auth-context.js');
test('asset guide retains real account context and values, closes and never scrolls',async()=>{
 const container=document.getElementById('root'),root=createRoot(container);
 const account={account_id:77,account_name:'내 계좌',withdrawable_cash:123456};
 let selected=77;
 dom.window.HTMLElement.prototype.scrollIntoView=()=>assert.fail('must not scroll');
 function Screen(){
  const auth=React.useContext(AuthContext),surface=React.useRef(null);
  const [open,setOpen]=React.useState(true);
  return React.createElement('div',{ref:surface},
   React.createElement('div',{'data-assets-tour':'account'},React.createElement('select',{'aria-label':'내 계좌',onChange:()=>{selected=88;}},React.createElement('option',{},auth.account.account_name))),
   ...['total','investment','holdings'].map(id=>React.createElement('section',{key:id,'data-assets-tour':id},auth.account.withdrawable_cash)),
   open && React.createElement(Tour,{surfaceRef:surface,accountCount:1,onClose:()=>setOpen(false)}));
 }
 try{
  await React.act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:['/assets?practice=account']},React.createElement(AuthContext.Provider,{value:{account}},React.createElement(SitePractice,{},React.createElement(Screen))))));
  assert(container.textContent.includes('내 계좌'));
  assert(container.querySelector('.assets-tour-note').textContent.includes('현재 계좌는 하나'));
  assert(!container.textContent.includes('매매 연습 계좌'));
  for(let i=0;i<4;i++) await React.act(async()=>container.querySelector('.assets-tour-note p').click());
  assert(!container.querySelector('.assets-tour-note'));
  assert.equal(container.querySelector('[data-assets-tour="total"]').textContent,'123456');
  assert.equal(selected,77);
 }finally{await React.act(async()=>root.unmount());}
});
