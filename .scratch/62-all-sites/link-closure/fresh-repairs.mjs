import fs from 'node:fs';
import crypto from 'node:crypto';
import {parseLinkTree,descendants} from '../../../m1/eval/link-owners.mjs';
const proofs=[];
function load(page){const file=`m1/curated/${page}.json`,dom=fs.readFileSync(`corpus/${page}/dom.html`,'utf8');return {page,file,model:JSON.parse(fs.readFileSync(file)),tree:parseLinkTree(dom),sourceHash:crypto.createHash('sha256').update(dom).digest('hex')};}
function save(x){fs.writeFileSync(x.file,JSON.stringify(x.model,null,2)+'\n');}
function witness(x,node,owner){return {page:x.page,sourceHash:x.sourceHash,address:node.address,tag:node.tag,attributes:node.attrs,text:node.text,ownerAddress:owner.address,ownerText:owner.text};}
let x=load('36kr-com/home');
const flash=descendants(x.tree).filter(n=>n.tag==='a'&&n.text==='查看更多'&&n.attrs.href==='/newsflashes');if(flash.length!==1)throw Error('flash witness ambiguous');
proofs.push({...witness(x,flash[0],flash[0].parent),path:'flash._action',old:x.model.flash._action.to});x.model.flash._action.to='https://36kr.com'+flash[0].attrs.href;
const n=x.model.enterprise._items[0];const institute=descendants(x.tree).filter(a=>a.tag==='a'&&a.text.includes(n._detail.text));if(institute.length!==1)throw Error('institute witness ambiguous');const card=institute[0].parent.parent.parent.parent;const article=descendants(card).find(a=>a.tag==='a'&&new URL(a.attrs.href,'https://36kr.com').href===n._action.to);if(!article)throw Error('article witness missing');
proofs.push({...witness(x,institute[0],card),path:'enterprise._items[0].instituteLink',article:witness(x,article,card)});
n._action.label=article.text;n.instituteLink={_intent:'保留机构介绍本身的捕获作者主页入口，与最近发布的文章入口分开。',_name:{text:n._name.text},_action:{verb:'navigate',label:n._name.text,to:'https://36kr.com'+institute[0].attrs.href}};save(x);
x=load('sspai-com/post-114716');for(const i of [1,2]){const n=x.model._lines[12]._lines[4]._items[i];const owners=descendants(x.tree).filter(p=>p.tag==='p'&&p.text.includes(n._name?.text??n._title?.text)&&p.text.includes(n._detail?.text??''));if(owners.length!==1)throw Error('trailer owner ambiguous '+i);const owner=owners[0],links=descendants(owner).filter(a=>a.tag==='a');const heading=links.find(a=>a.text!=='来源'),source=links.find(a=>a.text==='来源');if(!heading||!source)throw Error('distinct trailer capability absent');proofs.push({...witness(x,source,owner),path:`_lines[12]._lines[4]._items[${i}].sourceLink`,heading:witness(x,heading,owner)});n._action.label=heading.text;n.sourceLink={_intent:'保留该预告段落独立的原始来源入口，不将预告视频与来源混为同一动作。',_name:{text:'来源'},_action:{verb:'open',label:'来源',to:source.attrs.href}};}save(x);
x=load('xiaomi-account/login');const tabs=descendants(x.tree).filter(n=>n.attrs.role==='button'&&n.text==='注册');if(tabs.length!==1||tabs[0].attrs.href)throw Error('signup source tab ambiguous');proofs.push({...witness(x,tabs[0],tabs[0].parent.parent),path:'login.signup._action',old:x.model.login.signup._action});x.model.login.signup._action={verb:'operate',label:'注册'};save(x);
fs.writeFileSync('.scratch/62-all-sites/link-closure/fresh-source-repairs.json',JSON.stringify(proofs,null,2)+'\n');
console.log('source-backed corrections',proofs.length);
