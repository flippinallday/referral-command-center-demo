const key='referral-command-center-v1';
const cfgKey='referral-command-center-supabase';
const defaultSupabase={
  url:'https://khvginairqgfkumtwzmg.supabase.co',
  anon:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodmdpbmFpcnFnZmt1bXR3em1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNjM0OTEsImV4cCI6MjA5MzgzOTQ5MX0.fsABU9RCjcbB-TtwlOli_Io776cRW99oElIp_k_nwyI'
};
const statuses=['New Referral','Under Clinical Review','Need More Info','Accepted','Pending Auth','Admitted','Lost / Declined'];
let data=[];
let sb=null;
let cfg=readConfig();

const sample=[
 {id:1,patient:'J.S.',source:'Henry Mayo',contact:'CM Sarah',received:new Date(Date.now()-2.3*3600000).toISOString(),payer:'Medicare',diagnosis:'Hip fracture',need:'PT/OT skilled rehab',admitDate:todayPlus(1),status:'Pending Auth',assigned:'Admissions Coordinator',followup:dtLocal(Date.now()-20*60000),missing:'Auth approval',notes:'Strong ortho-to-home candidate',responseMinutes:18,priority:'High Priority'},
 {id:2,patient:'M.L.',source:'Providence',contact:'Discharge planner',received:new Date(Date.now()-70*60000).toISOString(),payer:'Medicare Advantage',diagnosis:'Wound infection',need:'Wound care, IV antibiotics',admitDate:todayPlus(0),status:'Need More Info',assigned:'Admissions Coordinator',followup:dtLocal(Date.now()+25*60000),missing:'Wound notes/photos, IV orders',notes:'Need MA docs fast',responseMinutes:22,priority:'High Priority'},
 {id:3,patient:'R.C.',source:'Kaiser',contact:'MA case manager',received:new Date(Date.now()-35*60000).toISOString(),payer:'HMO',diagnosis:'Deconditioning',need:'PT/OT',admitDate:todayPlus(2),status:'Under Clinical Review',assigned:'DON review',followup:dtLocal(Date.now()+55*60000),missing:'Therapy notes',notes:'Possible admit within 48 hours',responseMinutes:9,priority:'Medium Priority'},
 {id:4,patient:'A.P.',source:'UCLA',contact:'CM Desk',received:new Date(Date.now()-4*3600000).toISOString(),payer:'Medicare',diagnosis:'CHF exacerbation',need:'Skilled nursing, cardiac monitoring',admitDate:todayPlus(0),status:'Accepted',assigned:'Admissions Coordinator',followup:'',missing:'',notes:'Accepted, awaiting transport',responseMinutes:12,priority:'High Priority'},
 {id:5,patient:'T.B.',source:'Hospital B',contact:'',received:new Date(Date.now()-5*3600000).toISOString(),payer:'Medi-Cal',diagnosis:'Custodial placement',need:'Long-term care',admitDate:todayPlus(3),status:'Lost / Declined',assigned:'Admissions Coordinator',followup:'',missing:'',notes:'Out of scope for skilled push',responseMinutes:80,priority:'Low Priority',lostReason:'Payer issue'}
];

function readConfig(){
  const stored=JSON.parse(localStorage.getItem(cfgKey)||'{}');
  return {
    url:stored.url||defaultSupabase.url,
    anon:stored.anon||defaultSupabase.anon,
    facilityId:stored.facilityId||''
  };
}
function initSupabase(){
  cfg=readConfig();
  if(cfg.url&&cfg.anon&&window.supabase){sb=window.supabase.createClient(cfg.url,cfg.anon)}
  document.getElementById('supabaseUrl').value=cfg.url||'';
  document.getElementById('supabaseAnon').value=cfg.anon||'';
  document.getElementById('facilityId').value=cfg.facilityId||'';
  setConnectionStatus();
}
function usingSupabase(){return !!(sb&&cfg.facilityId)}
function setConnectionStatus(extra=''){
  const el=document.getElementById('connectionStatus');
  if(!el)return;
  if(usingSupabase()){el.textContent='Supabase connected'+(extra?` · ${extra}`:'');el.className='pill high'}
  else if(sb&&!cfg.facilityId){el.textContent='Supabase key loaded · needs facility ID'+(extra?` · ${extra}`:'');el.className='pill medium'}
  else {el.textContent='Local demo mode'+(extra?` · ${extra}`:'');el.className='pill low'}
}
async function load(){
  if(usingSupabase()){
    const {data:rows,error}=await sb.from('referrals').select('*').eq('facility_id',cfg.facilityId).order('received_at',{ascending:false});
    if(error){console.error(error);setConnectionStatus('load failed: '+error.message);data=[];render();return}
    data=(rows||[]).map(fromDb);
  } else data=JSON.parse(localStorage.getItem(key)||'[]');
  render();
}
async function persistLocal(){localStorage.setItem(key,JSON.stringify(data))}
async function insertReferral(r){
  if(usingSupabase()){
    const {data:row,error}=await sb.from('referrals').insert(toDb(r)).select().single();
    if(error) return alert('Supabase insert failed: '+error.message);
    data.unshift(fromDb(row));
  } else {data.unshift(r);await persistLocal()}
}
async function updateReferral(r){
  r.updatedAt=new Date().toISOString();
  if(usingSupabase()){
    const {data:row,error}=await sb.from('referrals').update(toDb(r)).eq('id',r.id).select().single();
    if(error) return alert('Supabase update failed: '+error.message);
    data=data.map(x=>x.id==r.id?fromDb(row):x);
  } else {data=data.map(x=>x.id==r.id?r:x);await persistLocal()}
}
async function removeReferral(id){
  if(usingSupabase()){
    const {error}=await sb.from('referrals').delete().eq('id',id);
    if(error) return alert('Supabase delete failed: '+error.message);
  }
  data=data.filter(r=>r.id!==id);await persistLocal();render();
}
function toDb(r){return {
  facility_id:cfg.facilityId,
  patient_initials:r.patient,
  referral_source:r.source,
  hospital_contact:r.contact||null,
  received_at:r.received||new Date().toISOString(),
  payer:r.payer,
  diagnosis:r.diagnosis||null,
  skilled_need:r.need||null,
  requested_admit_date:r.admitDate||null,
  status:r.status,
  priority:r.priority||priorityFor(r),
  missing_documents:r.missing||null,
  next_follow_up_at:r.followup?new Date(r.followup).toISOString():null,
  accepted_at:r.acceptedDate||null,
  admitted_at:r.admittedAt||null,
  lost_reason:r.lostReason||null,
  lost_notes:r.lostNotes||null,
  notes:r.notes||null,
  response_minutes:Number(r.responseMinutes)||0,
  updated_at:new Date().toISOString()
}}
function fromDb(r){return {
  id:r.id,patient:r.patient_initials,source:r.referral_source,contact:r.hospital_contact||'',received:r.received_at,payer:r.payer,diagnosis:r.diagnosis||'',need:r.skilled_need||'',admitDate:r.requested_admit_date||'',status:r.status,priority:r.priority,assigned:'',followup:r.next_follow_up_at?dtLocal(new Date(r.next_follow_up_at).getTime()):'',missing:r.missing_documents||'',notes:r.notes||'',responseMinutes:r.response_minutes||0,lostReason:r.lost_reason||'',lostNotes:r.lost_notes||'',acceptedDate:r.accepted_at||'',admittedAt:r.admitted_at||'',createdAt:r.created_at||r.received_at,updatedAt:r.updated_at||r.received_at
}}
function todayPlus(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)}
function dtLocal(ms){const d=new Date(ms);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)}
function priorityFor(r){const p=(r.payer||'').toLowerCase(), need=(r.need+' '+r.diagnosis).toLowerCase();const soon=!r.admitDate||((new Date(r.admitDate)-new Date())/86400000<=1.5);if((p.includes('medicare')||p.includes('advantage'))&&(soon||/(ortho|hip|wound|iv|trach|skilled|rehab|chf|cardiac)/.test(need)))return 'High Priority';if(p.includes('hmo')||p.includes('auth')||soon)return 'Medium Priority';return 'Low Priority'}
function render(){const today=new Date().toISOString().slice(0,10);const todayRefs=data.filter(r=>(r.received||'').slice(0,10)===today);const pending=data.filter(r=>['New Referral','Under Clinical Review','Need More Info','Pending Auth'].includes(r.status));const medicare=data.filter(r=>/medicare|advantage/i.test(r.payer));const accepted=data.filter(r=>['Accepted','Admitted'].includes(r.status));const lost=data.filter(r=>r.status==='Lost / Declined');const avg=Math.round(data.reduce((s,r)=>s+(Number(r.responseMinutes)||0),0)/Math.max(data.length,1));
 set('mTotal',todayRefs.length);set('mAccepted',accepted.length);set('mPending',pending.length);set('mLost',lost.length);set('mMedicare',medicare.length);set('mResponse',avg+'m');
 const f=document.getElementById('filter').value;const list=f==='All'?data:data.filter(r=>r.status===f);document.getElementById('referralList').innerHTML=list.map(card).join('')||'<p class="muted">No referrals yet.</p>';
 const urgent=pending.filter(r=>isUrgent(r)).sort((a,b)=>new Date(a.followup||a.received)-new Date(b.followup||b.received));document.getElementById('followupList').innerHTML=urgent.map(r=>`<div class="item"><div class="title">${esc(r.source)} · ${esc(r.payer)} · ${esc(r.diagnosis)}</div><div class="meta">Pending ${age(r.received)} · Missing: ${esc(r.missing||'none listed')}</div><div class="meta"><b>Follow up:</b> ${r.followup?new Date(r.followup).toLocaleString():'Now'}</div></div>`).join('')||'<p class="muted">No urgent follow-ups.</p>';
 document.getElementById('lostList').innerHTML=lost.map(r=>`<div class="item"><div class="title">${esc(r.source)} · ${esc(r.patient)} · ${esc(r.diagnosis)}</div><div class="meta"><b>Reason:</b> ${esc(r.lostReason||'Missing reason')} · <b>Payer:</b> ${esc(r.payer)}</div><div class="meta">${esc(r.lostNotes||r.notes||'')}</div></div>`).join('')||'<p class="muted">No lost referrals logged.</p>';
 document.getElementById('dailyReport').textContent=report();setConnectionStatus();}
function card(r){const pr=r.priority||priorityFor(r);return `<div class="item"><div class="itemTop"><div><div class="title">${esc(r.patient)} · ${esc(r.source)} · ${esc(r.diagnosis)}</div><div class="meta">${esc(r.payer)} · ${esc(r.need)} · Received ${age(r.received)} · Response ${r.responseMinutes||0}m</div><div class="meta"><b>Status:</b> ${esc(r.status)} · <b>Assigned:</b> ${esc(r.assigned||'Unassigned')} · <b>Missing:</b> ${esc(r.missing||'none')}</div><div class="meta"><b>Created:</b> ${fmt(r.createdAt||r.received)} · <b>Updated:</b> ${fmt(r.updatedAt||r.received)}</div></div><span class="pill ${pr.split(' ')[0].toLowerCase()} ${r.status==='Lost / Declined'?'lost':''}">${esc(pr)}</span></div><div class="actions"><button onclick="editReferral('${r.id}')">Edit</button>${statuses.map(s=>`<button onclick="setStatus('${r.id}','${s.replace(/'/g,'&#39;')}')">${s.replace('Under Clinical Review','Review')}</button>`).join('')}<button class="danger" onclick="deleteReferral('${r.id}')">Delete</button></div></div>`}
function isUrgent(r){if(!r.followup)return ageHours(r.received)>=1;return new Date(r.followup)<=new Date()||ageHours(r.received)>=2}
function ageHours(iso){return (Date.now()-new Date(iso).getTime())/3600000}function age(iso){const h=ageHours(iso);return h<1?Math.round(h*60)+' min ago':h.toFixed(1)+' hrs ago'}
window.setStatus=async(id,status)=>{const r=data.find(x=>String(x.id)===String(id));if(status==='Lost / Declined'){document.getElementById('lostId').value=id;document.getElementById('lostDialog').showModal();return}r.status=status;if(['Accepted','Admitted'].includes(status))r.acceptedDate=new Date().toISOString();await updateReferral(r);render()};
document.getElementById('saveLost').onclick=async()=>{const r=data.find(x=>String(x.id)===String(document.getElementById('lostId').value));r.status='Lost / Declined';r.lostReason=document.getElementById('lostReason').value;r.lostNotes=document.getElementById('lostNotes').value;await updateReferral(r);setTimeout(render,0)};
document.getElementById('intakeForm').onsubmit=async e=>{e.preventDefault();const editing=val('editId');const existing=editing?data.find(x=>String(x.id)===String(editing)):null;const r={id:existing?.id||Date.now(),patient:val('patient'),source:val('source'),contact:val('contact'),received:existing?.received||new Date().toISOString(),payer:val('payer'),diagnosis:val('diagnosis'),need:val('need'),admitDate:val('admitDate'),status:val('status'),assigned:val('assigned'),followup:val('followup'),missing:val('missing'),notes:val('notes'),responseMinutes:Number(val('responseMinutes')||0),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString(),lostReason:existing?.lostReason,lostNotes:existing?.lostNotes,acceptedDate:existing?.acceptedDate};r.priority=priorityFor(r);if(existing)await updateReferral(r);else await insertReferral(r);resetForm(e.target);render();location.hash='#referrals'};
document.getElementById('filter').onchange=render;document.getElementById('seedBtn').onclick=async()=>{const rows=sample.map(r=>({...r,id:Date.now()+Math.random(),createdAt:r.received,updatedAt:r.received}));if(usingSupabase()){for(const r of rows)await insertReferral(r)}else{data=rows;await persistLocal()}render()};
document.getElementById('cancelEdit').onclick=()=>resetForm(document.getElementById('intakeForm'));
document.getElementById('exportCsv').onclick=()=>downloadCsv();
document.getElementById('copyReport').onclick=async()=>{await navigator.clipboard.writeText(report());document.getElementById('copyReport').textContent='Copied';setTimeout(()=>document.getElementById('copyReport').textContent='Copy report',1200)};
document.getElementById('summarizeBtn').onclick=()=>{const t=val('aiNotes');document.getElementById('aiOutput').textContent=summarize(t)};
document.getElementById('saveSupabase').onclick=async()=>{cfg={url:val('supabaseUrl')||defaultSupabase.url,anon:val('supabaseAnon')||defaultSupabase.anon,facilityId:val('facilityId')};localStorage.setItem(cfgKey,JSON.stringify(cfg));initSupabase();await load()};
document.getElementById('clearSupabase').onclick=async()=>{localStorage.removeItem(cfgKey);sb=null;cfg={...defaultSupabase};initSupabase();await load()};
document.getElementById('signInSupabase').onclick=async()=>{if(!sb){alert('Save Supabase URL and anon key first.');return}const {error}=await sb.auth.signInWithPassword({email:val('loginEmail'),password:val('loginPassword')});if(error) alert('Sign in failed: '+error.message); else {setConnectionStatus('signed in'); await load();}};
function summarize(t){const lower=t.toLowerCase();const payer=/medicare advantage|medicare|hmo|medi-cal|kaiser|humana|united|blue shield/.exec(lower)?.[0]||'Not clearly stated';const dx=/(hip fracture|chf|wound|infection|stroke|pneumonia|deconditioning|joint replacement|iv antibiotics|ortho|cardiac)/.exec(lower)?.[0]||'Needs review';const skilled=[];if(/pt|ot|therapy|rehab/.test(lower))skilled.push('PT/OT therapy');if(/wound/.test(lower))skilled.push('Wound care');if(/iv|antibiotic/.test(lower))skilled.push('IV antibiotics');if(/chf|cardiac/.test(lower))skilled.push('Cardiac/skilled nursing monitoring');const missing=[];['h&p','therapy notes','pt notes','ot notes','mar','wound photos','iv orders','discharge summary','auth'].forEach(x=>{if(!lower.includes(x))missing.push(x)});const urgent=/today|tomorrow|asap|discharge/.test(lower);const priority=(/medicare|humana|united|kaiser|advantage/.test(lower)&&(/wound|iv|hip|ortho|rehab|chf|cardiac/.test(lower)||urgent))?'High':urgent?'Medium':'Medium/Review';return `Referral Summary:\n- Payer: ${cap(payer)}\n- Diagnosis: ${cap(dx)}\n- Skilled Need: ${skilled.join(', ')||'Not clearly stated'}\n- Admit Urgency: ${urgent?'High — discharge timing mentioned':'Not clearly stated'}\n- Missing Documents: ${missing.slice(0,6).join(', ')}\n- Recommended Priority: ${priority}\n- Suggested Follow-Up: Request missing clinical/auth documents and confirm bed/clinical review status.\n\nNote: This summary organizes information only and does not make clinical acceptance decisions.`}
function report(){const total=data.length, accepted=data.filter(r=>['Accepted','Admitted'].includes(r.status)).length, admitted=data.filter(r=>r.status==='Admitted').length, pending=data.filter(r=>['New Referral','Under Clinical Review','Need More Info','Pending Auth'].includes(r.status)).length, lost=data.filter(r=>r.status==='Lost / Declined'), medicare=data.filter(r=>/medicare|advantage/i.test(r.payer)), medAcc=medicare.filter(r=>['Accepted','Admitted'].includes(r.status)).length;const reasons={};lost.forEach(r=>reasons[r.lostReason||'Missing reason']=(reasons[r.lostReason||'Missing reason']||0)+1);const reasonLines=Object.entries(reasons).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>`${i+1}. ${k}: ${v}`).join('\n')||'None';const urgent=data.filter(r=>['New Referral','Under Clinical Review','Need More Info','Pending Auth'].includes(r.status)&&isUrgent(r)).map(r=>`- ${r.source} / ${r.payer} / ${r.diagnosis} / pending ${age(r.received)}`).join('\n')||'None';return `Daily Referral Report\nTotal referrals: ${total}\nAccepted: ${accepted}\nAdmitted: ${admitted}\nPending: ${pending}\nLost: ${lost.length}\nMedicare referrals: ${medicare.length}\nMedicare accepted: ${medAcc}\n\nTop lost reasons:\n${reasonLines}\n\nUrgent pending referrals:\n${urgent}`}
window.editReferral=(id)=>{const r=data.find(x=>String(x.id)===String(id));if(!r)return;['patient','source','contact','payer','diagnosis','need','admitDate','status','assigned','followup','missing','notes','responseMinutes'].forEach(k=>{const el=document.getElementById(k);if(el)el.value=r[k]||''});document.getElementById('editId').value=r.id;document.getElementById('saveReferralBtn').textContent='Update Referral';document.getElementById('cancelEdit').classList.remove('hidden');location.hash='#intake'};
window.deleteReferral=async(id)=>{if(!confirm('Delete this referral?'))return;await removeReferral(id)};
function resetForm(form){form.reset();document.getElementById('editId').value='';document.getElementById('responseMinutes').value=0;document.getElementById('saveReferralBtn').textContent='Save Referral';document.getElementById('cancelEdit').classList.add('hidden')}
function downloadCsv(){const cols=['id','patient','source','contact','received','payer','diagnosis','need','admitDate','status','priority','assigned','followup','missing','notes','responseMinutes','lostReason','acceptedDate','createdAt','updatedAt'];const rows=[cols.join(','),...data.map(r=>cols.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(','))];const blob=new Blob([rows.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='referrals-export.csv';a.click();URL.revokeObjectURL(a.href)}
function fmt(iso){return iso?new Date(iso).toLocaleString():'—'}function set(id,v){document.getElementById(id).textContent=v}function val(id){return document.getElementById(id).value.trim()}function esc(s){return String(s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function cap(s){return String(s).replace(/\b\w/g,c=>c.toUpperCase())}
initSupabase();load();
