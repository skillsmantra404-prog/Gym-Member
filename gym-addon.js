/* Gym Manager add-on v2: policy on receipts + reminders, rich-text editors, 7-working-day rule, announcements. */
(function(){"use strict";
if(window.__gymAddonV2)return;window.__gymAddonV2=1;
var K="gym_announcements_v1",PK="gym_policy_v1",TK="gym_reminder_tpl_v1",MK="gym_members_v1",SK="gym_settings_v1";
var P=JSON.parse,OB=window.Blob,OO=window.open.bind(window);
var HI=["किसी भी परिस्थिति में Membership या Fee को अतिरिक्त दिनों या महीनों के लिए Extend नहीं किया जाएगा।","Membership पूरी तरह Non-Transferable है। इसे किसी अन्य व्यक्ति के नाम पर Transfer नहीं किया जा सकता।","एक बार जमा की गई Membership Fee किसी भी परिस्थिति में Refund नहीं की जाएगी।","Membership समाप्त होने के बाद यदि सदस्य 7 Working Days के भीतर दोबारा आता है, तो उसकी Membership मूल निर्धारित तारीखों के अनुसार ही मान्य रहेगी। कोई अतिरिक्त दिन या महीने नहीं जोड़े जाएंगे।","Membership समाप्त होने के 7 Working Days के बाद वापस आने पर पुरानी Membership समाप्त मानी जाएगी और नई Membership वास्तविक Rejoining Date से शुरू होगी।"];
var EN=["Membership or fee validity will not be extended under any circumstances.","Membership is strictly non-transferable and cannot be transferred to another person.","Once paid, the membership fee is non-refundable under any circumstances.","If a member rejoins within 7 working days after membership expiry, the membership will continue according to the original membership dates. No additional days or months will be added.","If a member rejoins after 7 working days from membership expiry, the previous membership will be discontinued and a new membership will start from the actual rejoining date."];
var SH=["Membership Extend नहीं होगी।","Membership Transfer नहीं की जा सकती।","जमा की गई Fee Refund नहीं होगी।","Expiry के बाद 7 Working Days के भीतर वापस आने पर पुरानी Membership Dates लागू रहेंगी।","7 Working Days के बाद नई Membership वास्तविक Rejoining Date से शुरू होगी।"];
var SE=["Membership cannot be extended.","Membership is non-transferable.","Fees are non-refundable.","Rejoining within 7 working days after expiry follows the original membership dates.","Rejoining after 7 working days requires a new membership from the actual rejoining date."];
var TYPES=[["general","General Notice / सामान्य सूचना","📢"],["holiday","Holiday / अवकाश","🎉"],["closed","Gym Closed / जिम बंद","🚫"],["maint","Maintenance / रखरखाव","🛠️"],["timing","Timing Change / समय परिवर्तन","⏰"],["important","Important Notice / महत्वपूर्ण सूचना","❗"]];
var DAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
var $=function(s){return document.querySelector(s)};
var E=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var rd=function(k,d){try{var v=P(localStorage.getItem(k));return v==null?d:v}catch(e){return d}};
var wr=function(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){alert("Could not save — storage may be full. Export a backup.");return false}};
var isD=function(s){return typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(new Date(s+"T00:00:00"))};
var fmtD=function(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
var td=function(){return fmtD(new Date())};
var show=function(s){return s?new Date(s+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"—"};
var addDays=function(s,n){var d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return fmtD(d)};
var okList=function(a){return Array.isArray(a)&&a.length>0&&a.every(function(x){return typeof x==="string"&&x.trim()})};
function note(m){var s=$("#toastStack");if(!s){alert(m);return}var t=document.createElement("div");t.className="toast";t.textContent=m;s.appendChild(t);setTimeout(function(){t.remove()},3200)}
/* ---------- rich text: sanitize (allow-list), WhatsApp conversion ---------- */
var TAGS={B:1,STRONG:1,I:1,EM:1,U:1,S:1,STRIKE:1,BR:1,DIV:1,P:1,UL:1,OL:1,LI:1,SPAN:1};
var body=function(h){return new DOMParser().parseFromString(String(h||""),"text/html").body};
function sty(c){var s=c.style,r=[],t=s.textDecorationLine||s.textDecoration||"",bg=s.backgroundColor||"";
if(/^(left|center|right|justify)$/.test(s.textAlign))r.push("text-align:"+s.textAlign);
if(s.fontWeight==="bold"||+s.fontWeight>=600)r.push("font-weight:700");
if(s.fontStyle==="italic")r.push("font-style:italic");
var d=[];if(/underline/.test(t))d.push("underline");if(/line-through/.test(t))d.push("line-through");if(d.length)r.push("text-decoration:"+d.join(" "));
if(/^(rgba?\(\d+, ?\d+, ?\d+(, ?[\d.]+)?\)|#[0-9a-f]{3,8})$/i.test(bg))r.push("background-color:"+bg);return r.join(";")}
function clean(n){var o="";n.childNodes.forEach(function(c){
if(c.nodeType===3)o+=E(c.nodeValue);
else if(c.nodeType===1){var t=c.tagName;if(t==="BR"){o+="<br>";return}
if(!TAGS[t]){o+=clean(c);return}var s=sty(c),l=t.toLowerCase();o+="<"+l+(s?' style="'+s+'"':"")+">"+clean(c)+"</"+l+">"}});return o}
var san=function(h){return clean(body(h))};
var htm=function(s){s=String(s==null?"":s);return/<[a-z][\s\S]*>/i.test(s)?san(s):E(s).replace(/\n/g,"<br>")};
function mk(m,t){var a=t.match(/^(\s*)([\s\S]*?)(\s*)$/);return a[2]?a[1]+m+a[2]+m+a[3]:t}
function wa(n){var o="";n.childNodes.forEach(function(c){
if(c.nodeType===3){o+=c.nodeValue.replace(/\u00a0/g," ");return}
if(c.nodeType!==1)return;var t=c.tagName,s=c.style,i;if(t==="BR"){o+="\n";return}
i=wa(c);var blk=/^(DIV|P|LI|UL|OL)$/.test(t);
if(blk){if(i!=="\n")i=i.replace(/\n+$/,"");if(i==="\n")i=""}
if(t==="LI")i="• "+i;
if(t==="B"||t==="STRONG"||s.fontWeight==="bold"||+s.fontWeight>=600)i=mk("*",i);
if(t==="I"||t==="EM"||s.fontStyle==="italic")i=mk("_",i);
if(t==="S"||t==="STRIKE"||/line-through/.test(s.textDecorationLine||s.textDecoration||""))i=mk("~",i);
o+=blk?(o&&o.slice(-1)!=="\n"?"\n":"")+i+"\n":i});return o}
var waText=function(h){return wa(body(h)).replace(/[ \t]+\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim()};
var plain=function(h){return body(h).textContent.trim()};
/* editor widget: toolbar + contenteditable box */
var BAR='<button type="button" data-cmd="bold" title="Bold"><b>B</b></button><button type="button" data-cmd="italic" title="Italic"><i>I</i></button><button type="button" data-cmd="underline" title="Underline"><u>U</u></button><button type="button" data-cmd="strikeThrough" title="Strikethrough"><s>S</s></button><button type="button" data-cmd="justifyLeft" title="Align left">⬅</button><button type="button" data-cmd="justifyCenter" title="Center">↔</button><button type="button" data-cmd="justifyRight" title="Align right">➡</button><button type="button" data-cmd="insertUnorderedList" title="Bullets">•≡</button><button type="button" data-cmd="hiliteColor" title="Highlight">🖍</button><button type="button" data-cmd="removeFormat" title="Clear formatting">✕</button>';
function ed(id,html,h,ins){return'<div class="rte"><div class="rte__bar" data-for="'+id+'">'+BAR+(ins||[]).map(function(x){return'<button type="button" class="rte__ins" data-ins="'+x+'">'+x+"</button>"}).join("")+'</div><div class="rte__box" id="'+id+'" contenteditable="true" style="min-height:'+(h||120)+'px">'+html+"</div></div>"}
document.addEventListener("mousedown",function(e){if(e.target.closest&&e.target.closest(".rte__bar"))e.preventDefault()});
document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".rte__bar button");if(!b)return;
var box=document.getElementById(b.parentNode.dataset.for);if(!box)return;box.focus();
if(b.dataset.ins)document.execCommand("insertText",false,b.dataset.ins);
else{var c=b.dataset.cmd,hl=c==="hiliteColor";document.execCommand("styleWithCSS",false,hl);document.execCommand(c,false,hl?"#fff176":null)}
box.dispatchEvent(new Event("input",{bubbles:true}))});
document.addEventListener("paste",function(e){var b=e.target.closest&&e.target.closest(".rte__box");if(!b)return;e.preventDefault();document.execCommand("insertText",false,(e.clipboardData||window.clipboardData).getData("text"))});
/* ---------- policy + templates ---------- */
var ol=function(a){return"<ol>"+a.map(function(x){return"<li>"+E(x)+"</li>"}).join("")+"</ol>"};
function ph(html,arr,def){if(typeof html==="string"&&plain(html))return san(html);return ol(okList(arr)?arr:def)}
function pol(){var p=rd(PK,{});p=p&&typeof p==="object"?p:{};
return{hi:ph(p.hiHtml,p.hi,HI),en:ph(p.enHtml,p.en,EN),holidays:Array.isArray(p.holidays)?p.holidays.filter(function(x){return x>=1&&x<=6}):[]}}
var savePol=function(hi,en,h){return wr(PK,{hiHtml:hi,enHtml:en,holidays:h})};
var line=function(a){return a.map(function(x,i){return"<div>"+(i+1)+". "+E(x)+"</div>"}).join("")};
var DEFTPL='<div><b>Reminder</b> :- Hi {name}, your gym fee of <b>{amount}</b> was due on <b>{dueDate}</b>. Please pay at the earliest. - {gymName}</div><div><br></div><div><b>ध्यान दें:</b></div>'+line(SH)+'<div><br></div><div><b>Please Note:</b></div>'+line(SE);
function tpl(){var t=rd(TK,"");return typeof t==="string"&&plain(t)?san(t):DEFTPL}
function polHtml(){var p=pol();return'<div class="pol" id="rcPol"><div class="pol__t">Gym Membership &amp; Fee Policy / जिम सदस्यता एवं शुल्क नीति</div><div class="pol__b">'+p.hi+'</div><div class="pol__b">'+p.en+"</div></div>"}
var gym=function(){var s=rd(SK,{});return s&&s.gymName?s.gymName:"Gym"};
var inr=function(n){return"₹"+Number(n||0).toLocaleString("en-IN")};
function amt(m){var mo=+m.billingMonths===3?3:1;if(mo===3&&+m.quarterlyTotal>0)return+m.quarterlyTotal;return((+m.gymFee||+m.fee||0)+(m.hasTreadmill?+m.treadmillFee||0:0))*mo}
function dueShort(s){var d=new Date(s+"T00:00:00"),o={day:"numeric",month:"short"};if(d.getFullYear()!==new Date().getFullYear())o.year="numeric";return d.toLocaleDateString("en-IN",o)}
function fill(t,v){return t.replace(/\{(name|amount|dueDate|plan|gymName)\}/g,function(_,k){return v[k]})}
function remMsg(m){return fill(waText(tpl()),{name:m.name,amount:inr(amt(m)),dueDate:dueShort(m.nextDueDate),plan:(m.hasTreadmill?"Gym + Treadmill":"Gym only")+" · "+(+m.billingMonths===3?"Quarterly":"Monthly"),gymName:gym()})}
/* ---------- extra message templates, fill helper, compose-before-send ---------- */
var RK="gym_receipt_tpl_v1";
var DEFREC='<div>✅ <b>Payment Receipt</b> — {gymName}</div><div>Receipt No: <b>{receiptNo}</b></div><div>Member: <b>{name}</b></div><div>Plan: {plan}</div><div>Joining Date: {joiningDate}</div><div>Amount Paid: <b>{amount}</b></div><div>Paid On: {paidOn}</div><div>Received Via: {via}</div><div>Period: {period}</div><div>Next Due: <b>{nextDue}</b></div><div>Thank you! 🙏</div><div><br></div><div><b>ध्यान दें:</b></div>'+line(SH)+'<div><br></div><div><b>Please Note:</b></div>'+line(SE);
var TPLS={rem:{k:TK,def:DEFTPL,title:"Reminder message",need:"{name}",ph:["{name}","{amount}","{dueDate}","{plan}","{gymName}"],sample:function(){return{name:"Ashwin",amount:"₹1,000",dueDate:dueShort(addDays(td(),-2)),plan:"Gym only · Monthly",gymName:gym()}}},
rec:{k:RK,def:DEFREC,title:"Payment receipt message",need:"{amount}",ph:["{receiptNo}","{name}","{plan}","{joiningDate}","{amount}","{paidOn}","{via}","{period}","{nextDue}","{gymName}"],sample:function(){var t=td();return{gymName:gym(),receiptNo:"RCPT-0001",name:"Ashwin",plan:"Gym only · Monthly",joiningDate:show(addDays(t,-60)),amount:"₹1,000",paidOn:show(t),via:"Online",period:show(t)+" - "+show(addDays(t,29)),nextDue:show(addDays(t,30))}}}};
function tplOf(c){var t=rd(TPLS[c].k,"");return typeof t==="string"&&plain(t)?san(t):TPLS[c].def}
/* fills {placeholders}; any line whose value is empty is dropped (e.g. no "Received Via") */
function fillL(t,v){return t.replace(/\{(\w+)\}/g,function(m,k){return k in v?(v[k]||"\u0000"):m}).split("\n").filter(function(l){return l.indexOf("\u0000")<0}).join("\n").replace(/\n{3,}/g,"\n\n").trim()}
function recMsg(t){var g=function(l){var m=t.match(new RegExp("^"+l+": (.*)$","m"));return m?m[1].trim():""};
return fillL(waText(tplOf("rec")),{gymName:gym(),receiptNo:g("Receipt No"),name:g("Member"),plan:g("Plan"),joiningDate:g("Joining Date"),amount:g("Amount Paid"),paidOn:g("Paid On"),via:g("Received Via"),period:g("Period"),nextDue:g("Next Due")})}
function w2h(t){var h=E(t).replace(/\*([^*\n]+)\*/g,"<b>$1</b>").replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g,"$1<i>$2</i>").replace(/~([^~\n]+)~/g,"<s>$1</s>");return h.split("\n").map(function(l){return"<div>"+(l||"<br>")+"</div>"}).join("")}
var cmpUrl="";
function compose(u,t){cmpUrl=u.slice(0,u.indexOf("?text=")+6);$("#pCmpB").innerHTML='<div class="field__hint" style="margin:0 2px 10px;">Edit the message if you like, then send. Bold, italic and strikethrough are kept in WhatsApp.</div>'+ed("mE",w2h(t),260)+'<div class="btn-row" style="margin-top:14px;"><button class="btn btn--secondary" id="mCancel">Cancel</button><button class="btn btn--whatsapp" id="mSend">Send on WhatsApp</button></div>';$("#pCmp").classList.add("active")}
/* ---------- 7-working-day rule (from expiry date, never attendance; Sundays + configured holidays skipped) ---------- */
function isWork(d,h){var w=d.getDay();return w!==0&&h.indexOf(w)<0}
function wdays(exp,to,h){var d=new Date(exp+"T00:00:00"),t=new Date(to+"T00:00:00"),n=0;while(d<t){d.setDate(d.getDate()+1);if(isWork(d,h))n++}return n}
function winEnd(exp,h){var d=new Date(exp+"T00:00:00"),n=0;while(n<7){d.setDate(d.getDate()+1);if(isWork(d,h))n++}return fmtD(d)}
function rejoin(exp,to){var h=pol().holidays;if(to<=exp)return{n:0,state:"active",text:"Membership still valid / Membership अभी मान्य है."};
var n=wdays(exp,to,h),end=winEnd(exp,h);
return n<=7?{n:n,state:"within",end:end,text:"Within 7 working days — original membership dates continue. No extra days added. / 7 Working Days के भीतर — मूल Dates लागू।"}:{n:n,state:"after",end:end,text:"After 7 working days — old membership discontinued; new membership starts from the actual rejoining date. / नई Membership वास्तविक Rejoining Date से।"}}
function expiryOf(m){var p=Array.isArray(m.payments)&&m.payments.length?m.payments[m.payments.length-1]:null;if(p&&isD(p.periodEnd))return p.periodEnd;return isD(m.nextDueDate)?addDays(m.nextDueDate,-1):null}
function member(ph){var a=rd(MK,[]);return Array.isArray(a)?a.filter(function(m){return m&&m.whatsapp===ph})[0]:null}
/* ---------- styles (incl. print: ONE receipt only) ---------- */
var st=document.createElement("style");
st.textContent=".pol{margin-top:14px;padding-top:10px;border-top:1.5px dashed var(--border);font-size:10.5px;line-height:1.5;color:var(--text-2);break-inside:avoid;page-break-inside:avoid}.pol__t{font-weight:800;font-size:11.5px;color:var(--text);margin-bottom:4px}.pol__b{margin-bottom:6px}.pol ol,.ann__m ol,.ann__m ul{margin:2px 0 4px;padding-left:18px}.ann{background:var(--surface);border-radius:var(--radius-lg);padding:14px;margin-bottom:10px;border-left:4px solid var(--primary)}.ann--hot{border-left-color:var(--overdue)}.ann--warn{border-left-color:var(--due)}.ann__t{font-weight:800;font-size:14.5px;margin:6px 0 3px}.ann__m{font-size:13px;line-height:1.55;color:var(--text-2)}.ann__d{font-size:11.5px;color:var(--text-3);margin-top:6px}.ann__b{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.ann__b .btn{height:38px;width:auto;flex:1;padding:0 10px;font-size:13px}.ann--off{opacity:.55}.rj{font-size:12px;line-height:1.55;margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);text-align:left;color:var(--text-2)}.chk{display:inline-flex;align-items:center;gap:6px;margin:0 12px 8px 0;font-size:13px;font-weight:600}.chk input{width:18px;height:18px}.rte{border:1.5px solid var(--border);border-radius:var(--radius-md);background:var(--surface);overflow:hidden}.rte__bar{display:flex;flex-wrap:wrap;gap:4px;padding:6px;background:var(--surface-alt);border-bottom:1px solid var(--border)}.rte__bar button{min-width:34px;height:34px;border-radius:8px;background:var(--surface);border:1px solid var(--border);font-size:13px;padding:0 8px}.rte__bar .rte__ins{font-size:11.5px;color:var(--primary-dark);font-weight:700}.rte__box{padding:12px;font-size:14px;line-height:1.55;outline:none;overflow-wrap:anywhere}.rte__box ol,.rte__box ul{margin:2px 0;padding-left:20px}.wapre{white-space:pre-wrap;background:var(--surface-alt);border-radius:var(--radius-md);padding:12px;font-size:13px;line-height:1.55}"+
"@media print{@page{size:A4;margin:12mm}html,body{height:auto!important;overflow:visible!important;background:#fff!important}#app,.bottom-nav,.fab,.bottom-action-bar,.overlay,.toast-stack,.onboard,.page:not(#pageReceipt){display:none!important}#pageReceipt{position:static!important;display:block!important;transform:none!important;animation:none!important;max-width:none!important;background:#fff!important;--bg:#fff;--surface:#fff;--text:#000;--text-2:#333;--text-3:#555;--border:#bbb}#pageReceipt .page__header,#pageReceipt .page__body>.section{display:none!important}#pageReceipt .page__body{overflow:visible!important;padding:0!important}#print-area{position:static!important;padding:0!important}.receipt{break-inside:avoid;page-break-inside:avoid;box-shadow:none!important}.pol{font-size:9.5px;color:#222}}";
document.head.appendChild(st);
/* receipt: policy on every new + renewal receipt */
var rn=$("#rcNumber");
if(rn)new MutationObserver(function(){var c=$("#receiptCard");if(!c)return;var o=c.querySelector("#rcPol");if(o)o.remove();var d=document.createElement("div");d.innerHTML=polHtml();c.insertBefore(d.firstChild,c.querySelector(".receipt-foot"))}).observe(rn,{childList:true,characterData:true,subtree:true});
/* member detail: expiry / working days / rejoin status */
var md=$("#mdDueDate");
if(md)new MutationObserver(function(){var ph=($("#mdPhone").textContent||"").replace(/\D/g,"").slice(-10),m=member(ph);if(!m)return;
var x=$("#rjBox");if(!x){x=document.createElement("div");x.id="rjBox";x.className="rj";md.parentElement.appendChild(x)}
var e=expiryOf(m);if(!e){x.innerHTML="";return}var r=rejoin(e,td());
x.innerHTML="<b>Expiry date:</b> "+show(e)+(r.state==="active"?"":"<br><b>Working days elapsed:</b> "+r.n+" / 7<br><b>Original dates valid until:</b> "+show(r.end))+"<br><b>Rejoining status:</b> "+E(r.text)}).observe(md,{childList:true,characterData:true,subtree:true});
/* outgoing WhatsApp links: reminders + receipts use editable templates; diet / progress / welcome open an edit-before-send screen */
var OTHER=/^\*(Diet Plan|Progress Report)|welcome to|weeks in|almost a month/;
window.open=function(u){var a=[].slice.call(arguments);try{if(typeof u==="string"&&u.indexOf("https://wa.me/91")===0){var i=u.indexOf("?text=");
if(i>0){var t=decodeURIComponent(u.slice(i+6)),m=member(u.slice(16,26));
if(/^Payment Receipt —/.test(t))a[0]=u.slice(0,i+6)+encodeURIComponent(recMsg(t));
else if(OTHER.test(t)){compose(u,t);return null}
else if(m&&isD(m.nextDueDate)&&t.indexOf(show(m.nextDueDate))>=0){
if(m.status==="inactive"||m.nextDueDate>td()){note("Skipped "+m.name+" — "+(m.status==="inactive"?"inactive member":"already paid up"));return null}
a[0]=u.slice(0,i+6)+encodeURIComponent(remMsg(m))}}}}catch(e){}return OO.apply(window,a)};
/* backup / restore */
var W=function(parts,o){try{if(o&&o.type==="application/json"&&parts&&typeof parts[0]==="string"){var j=P(parts[0]);
if(j&&Array.isArray(j.members)){j.announcements=anns();j.policy=pol();j.reminderTemplate=tpl();j.receiptTemplate=tplOf("rec");parts=[JSON.stringify(j,null,2)]}}}catch(e){}return new OB(parts,o)};
W.prototype=OB.prototype;window.Blob=W;
JSON.parse=function(){var r=P.apply(JSON,arguments);try{if(r&&typeof r==="object"&&Array.isArray(r.members)&&r.exportedAt){
if(Array.isArray(r.announcements))wr(K,r.announcements.filter(function(x){return x&&typeof x.title==="string"&&x.id}).map(function(x){return{id:String(x.id),title:String(x.title).slice(0,100),occ:String(x.occ||"").slice(0,60),msg:htm(String(x.msg||"").slice(0,6000)),type:TYPES.some(function(t){return t[0]===x.type})?x.type:"general",date:isD(x.date)?x.date:td(),start:isD(x.start)?x.start:"",end:isD(x.end)?x.end:"",active:x.active!==false}}));
var p=r.policy;if(p&&typeof p==="object"){var h=Array.isArray(p.holidays)?p.holidays.filter(function(x){return x>=1&&x<=6}):[];
wr(PK,{hiHtml:typeof p.hi==="string"?san(p.hi):"",enHtml:typeof p.en==="string"?san(p.en):"",hi:Array.isArray(p.hi)?p.hi:[],en:Array.isArray(p.en)?p.en:[],holidays:h})}
if(typeof r.reminderTemplate==="string"&&plain(r.reminderTemplate))wr(TK,san(r.reminderTemplate));if(typeof r.receiptTemplate==="string"&&plain(r.receiptTemplate))wr(RK,san(r.receiptTemplate))}}catch(e){}return r};
/* ---------- announcements ---------- */
function anns(){var a=rd(K,[]);return Array.isArray(a)?a.filter(function(x){return x&&typeof x.title==="string"&&typeof x.id==="string"}):[]}
var typ=function(k){return TYPES.filter(function(t){return t[0]===k})[0]||TYPES[0]};
var isActive=function(a){var t=td();return a.active!==false&&(!a.start||a.start<=t)&&(!a.end||a.end>=t)};
var cls=function(a){return a.type==="important"||a.type==="closed"?"ann--hot":a.type==="holiday"||a.type==="maint"||a.type==="timing"?"ann--warn":""};
var dates=function(a){return a.start||a.end?"Applies: "+show(a.start||a.date)+(a.end?" – "+show(a.end):" onwards"):""};
function card(a,admin){var t=typ(a.type),id=E(a.id);return'<div class="ann '+cls(a)+(admin&&!isActive(a)?" ann--off":"")+'"><span class="pill '+(cls(a)==="ann--hot"?"pill--overdue":cls(a)?"pill--due":"pill--paid")+'">'+t[2]+" "+E(t[1])+'</span><div class="ann__t">'+E(a.title)+'</div><div class="ann__m">'+htm(a.msg)+'</div><div class="ann__d">Posted '+show(a.date)+(dates(a)?" · "+dates(a):"")+(admin?" · "+(a.active!==false?(isActive(a)?"Live":"Scheduled/expired"):"Inactive"):"")+"</div>"+
(admin?'<div class="ann__b"><button class="btn btn--whatsapp" data-a="send" data-id="'+id+'">Send to members</button><button class="btn btn--secondary" data-a="share" data-id="'+id+'">Quick share</button><button class="btn btn--secondary" data-a="edit" data-id="'+id+'">Edit</button><button class="btn btn--secondary" data-a="tog" data-id="'+id+'">'+(a.active!==false?"Deactivate":"Activate")+'</button><button class="btn btn--danger" data-a="del" data-id="'+id+'">Delete</button></div>':"")+"</div>"}
var wrap=document.createElement("div");
var pg=function(id,t,b){return'<div class="page" id="'+id+'"><div class="page__header"><button class="back-btn" id="'+id+'Back" aria-label="Back">‹</button><div class="page__header-title" id="'+id+'T">'+t+'</div></div><div class="page__body" id="'+id+'B"></div></div>'};
wrap.innerHTML=pg("pAnn","Gym Announcements")+pg("pPol","Membership &amp; Fee Policy")+pg("pTpl","Reminder message")+pg("pSend","Send announcement")+pg("pCmp","Edit message");
document.body.appendChild(wrap);
function board(){var sec=$("#nbSec"),host=$("#dashNewJoinersSection");if(!host)return;
if(!sec){sec=document.createElement("div");sec.id="nbSec";sec.className="section";host.parentNode.insertBefore(sec,host)}
var l=anns().filter(isActive).sort(function(a,b){return b.date.localeCompare(a.date)||b.id.localeCompare(a.id)});
sec.innerHTML='<div class="section__row"><div class="section__title" style="margin-bottom:0;">Notice Board</div><button style="font-size:12.5px;font-weight:700;color:var(--text-2);" id="nbManage">Manage</button></div>'+(l.length?l.map(function(a){return card(a,false)}).join(""):'<div class="card" style="font-size:13px;color:var(--text-2);">No active notices.</div>');
$("#nbManage").onclick=openAnn}
var dv=$("#viewDashboard");if(dv){new MutationObserver(function(){if(dv.classList.contains("active"))board()}).observe(dv,{attributes:true,attributeFilter:["class"]});board()}
var cur=null,ATITLE={general:"Notice",holiday:"Holiday — Gym Closed",closed:"Gym Closed",maint:"Maintenance Notice",timing:"Timing Change",important:"Important Notice"};
function when(v){var s=v.start,e=v.end,x=s||e||v.date||td();if(s&&e&&s!==e)return{en:"from "+dueShort(s)+" to "+dueShort(e),hi:dueShort(s)+" से "+dueShort(e)+" तक",d:dueShort(s)};return{en:"on "+dueShort(x),hi:dueShort(x)+" को",d:dueShort(x)}}
var OL={holiday:["Festival / occasion name","e.g. Diwali / दीवाली"],closed:["Reason for closure (optional)","e.g. personal reasons / निजी कारण"],maint:["What is being maintained (optional)","e.g. treadmill servicing"],timing:["Reason for the change (optional)","e.g. summer schedule"],important:["Subject (optional)","e.g. Fee revision"],general:["Subject (optional)","e.g. New batch starting"]};
function atitle(t,o){o=(o||"").trim();return t==="holiday"?(o?o+" Holiday — Gym Closed":ATITLE.holiday):(o?ATITLE[t]+" — "+o:ATITLE[t])}
/* ready-made messages, English + Hindi. v.occ = festival / reason typed by the admin; [bracketed] parts must be filled in */
function annTpl(t,v){var w=when(v),o=(v.occ||"").trim(),eo=E(o),g="<b>"+E(gym())+"</b>",bi=function(en,hi){return en+"<div><br></div>"+hi};
var T={
holiday:bi("<div>🎉 <b>Happy "+(o?eo:"Holiday")+"!</b></div><div>Warm wishes from "+g+" to you and your family.</div><div>Please note: the gym will remain <b>closed "+w.en+"</b>"+(o?" on account of "+eo:"")+". We reopen as usual afterwards. Enjoy the day! 🙏</div>","<div>🎉 <b>"+(o?eo+" की हार्दिक शुभकामनाएँ!":"छुट्टी की हार्दिक शुभकामनाएँ!")+"</b></div><div>"+g+" की ओर से आपको और आपके परिवार को शुभकामनाएँ। कृपया ध्यान दें: जिम <b>"+w.hi+" बंद</b> रहेगा"+(o?" ("+eo+")":"")+"।</div>"),
closed:bi("<div>🚫 <b>Gym Closed</b></div><div>Dear members, "+g+" will remain <b>closed "+w.en+"</b>"+(o?" due to "+eo:"")+". Sorry for the inconvenience.</div>","<div>🚫 <b>जिम बंद</b></div><div>प्रिय सदस्यगण, "+g+" <b>"+(o?eo+" के कारण ":"")+w.hi+" बंद</b> रहेगा। असुविधा के लिए खेद है।</div>"),
maint:bi("<div>🛠️ <b>Maintenance Notice</b></div><div>Dear members, maintenance work"+(o?" ("+eo+")":"")+" will be carried out at "+g+" <b>"+w.en+"</b>. Some equipment or areas may be unavailable. Thank you for your patience.</div>","<div>🛠️ <b>रखरखाव सूचना</b></div><div>प्रिय सदस्यगण, "+g+" में <b>"+w.hi+"</b> रखरखाव का कार्य"+(o?" ("+eo+")":"")+" होगा। कुछ उपकरण या क्षेत्र उपलब्ध नहीं रहेंगे। सहयोग के लिए धन्यवाद।</div>"),
timing:bi("<div>⏰ <b>Timing Change</b></div><div>Dear members, the new gym timings are <b>[add new timings]</b>, effective from <b>"+w.d+"</b>."+(o?" Reason: "+eo+".":"")+"</div>","<div>⏰ <b>समय में बदलाव</b></div><div>प्रिय सदस्यगण, जिम का नया समय <b>[नया समय लिखें]</b> है, जो <b>"+w.d+"</b> से लागू होगा।"+(o?" कारण: "+eo+"।":"")+"</div>"),
important:bi("<div>❗ <b>Important Notice"+(o?": "+eo:"")+"</b></div><div>Dear members, [write your notice here].</div><div>— "+g+"</div>","<div>❗ <b>महत्वपूर्ण सूचना"+(o?": "+eo:"")+"</b></div><div>प्रिय सदस्यगण, [यहाँ सूचना लिखें]।</div>"),
general:bi("<div>📢 <b>Notice from "+g+(o?" — "+eo:"")+"</b></div><div>Dear members, [write your message here].</div>","<div>📢 <b>"+g+" की ओर से सूचना"+(o?" — "+eo:"")+"</b></div><div>प्रिय सदस्यगण, [यहाँ संदेश लिखें]।</div>")};
return T[t]||T.general}
/* the message is sent exactly as written; {name} becomes each member's name */
var annMsg=function(a,n){return waText(htm(a.msg)).replace(/\{name\}/g,n||"")};
function shareA(a){OO("https://wa.me/?text="+encodeURIComponent(annMsg(a,"")),"_blank")}
function autoFill(){var ty=$("#aTy").value,L=OL[ty],m=$("#aM");if(!m)return;$("#aOL").textContent=L[0];$("#aO").placeholder=L[1];if(m.dataset.auto!=="1")return;var o=$("#aO").value;m.innerHTML=annTpl(ty,{start:$("#aS").value,end:$("#aE").value,date:$("#aD").value||td(),occ:o});var t=$("#aT");if(t.dataset.auto==="1")t.value=atitle(ty,o)}
function annRender(){var b=$("#pAnnB");$("#pAnnT").textContent=cur?(cur.id?"Edit announcement":"New announcement"):"Gym Announcements";
if(!cur){var l=anns().sort(function(a,b){return b.date.localeCompare(a.date)||b.id.localeCompare(a.id)});
b.innerHTML='<button class="btn btn--primary" data-a="new">+ New announcement</button><div class="field__hint" style="margin:8px 2px 14px;">Stored on this device only — it does not sync to other devices. "Send to members" lets you pick recipients and send chat by chat; nothing is sent automatically.</div>'+(l.length?l.map(function(a){return card(a,true)}).join(""):'<div class="empty"><div class="empty__title">No announcements yet</div></div>');return}
var a=cur,fresh=!a.id&&!plain(htm(a.msg));
b.innerHTML='<div class="field"><label class="field__label">Type</label><select class="field__input" id="aTy">'+TYPES.map(function(t){return'<option value="'+t[0]+'"'+(t[0]===a.type?" selected":"")+">"+E(t[1])+"</option>"}).join("")+'</select></div><div class="field"><label class="field__label" id="aOL">'+E(OL[a.type][0])+'</label><input class="field__input" id="aO" maxlength="60" value="'+E(a.occ||"")+'" placeholder="'+E(OL[a.type][1])+'"><div class="field__hint">Used inside the ready-made message and title. You can type it in English, Hindi or both.</div></div><div class="field"><label class="field__label">Title (for your records and the notice board)</label><input class="field__input" id="aT" maxlength="100" value="'+E(a.title||(fresh?atitle(a.type,a.occ):""))+'"></div><div class="field"><label class="field__label">Announcement date</label><input class="field__input" type="date" id="aD" value="'+a.date+'"></div><div class="field"><label class="field__label">Start date (optional)</label><input class="field__input" type="date" id="aS" value="'+a.start+'"></div><div class="field"><label class="field__label">End date (optional)</label><input class="field__input" type="date" id="aE" value="'+a.end+'"></div><div class="field"><label class="field__label">Message</label>'+ed("aM",fresh?annTpl(a.type,a):htm(a.msg),230,["{name}"])+'<div class="field__hint">Ready-made message for the chosen type — edit it freely. It is sent exactly as written; {name} becomes each member\'s name. Fill in any [bracketed] text.</div><button type="button" class="btn btn--secondary" data-a="tpl" style="margin-top:8px;height:42px;">Load ready-made message for this type</button></div><label class="chk"><input type="checkbox" id="aA"'+(a.active!==false?" checked":"")+'> Active</label><div class="btn-row" style="margin-top:8px;"><button class="btn btn--secondary" data-a="cancel">Cancel</button><button class="btn btn--primary" data-a="save">Save</button></div>';
$("#aM").dataset.auto=fresh?"1":"0";$("#aT").dataset.auto=(!a.id&&!a.title)?"1":"0"}
function openAnn(){cur=null;annRender();$("#pAnn").classList.add("active")}
$("#pAnnBack").onclick=function(){if(cur){cur=null;annRender()}else{$("#pAnn").classList.remove("active");board()}};
$("#pAnnB").addEventListener("change",function(e){if(["aTy","aD","aS","aE"].indexOf(e.target.id)>=0)autoFill()});
$("#pAnnB").addEventListener("input",function(e){if(e.target.id==="aM"||e.target.id==="aT")e.target.dataset.auto="0";if(e.target.id==="aO")autoFill()});
$("#pAnnB").addEventListener("click",function(e){var el=e.target.closest("[data-a]");if(!el)return;var k=el.dataset.a,all=anns(),a=all.filter(function(x){return x.id===el.dataset.id})[0];
if(k==="new"){cur={id:"",title:"",occ:"",msg:"",type:"holiday",date:td(),start:"",end:"",active:true};annRender()}
else if(k==="cancel"){cur=null;annRender()}
else if(k==="tpl"){var m=$("#aM");if(plain(m.innerHTML)&&m.dataset.auto!=="1"&&!confirm("Replace your message with the ready-made one?"))return;m.dataset.auto="1";autoFill()}
else if(k==="share"&&a)shareA(a);
else if(k==="send"&&a)openSend(a);
else if(k==="edit"&&a){cur=Object.assign({},a);annRender()}
else if(k==="tog"&&a){a.active=a.active===false;wr(K,all);annRender();board()}
else if(k==="del"&&a){if(confirm('Delete "'+a.title+'"? This cannot be undone.')){wr(K,all.filter(function(x){return x.id!==a.id}));annRender();board()}}
else if(k==="save"){var mh=san($("#aM").innerHTML),v={id:cur.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:$("#aT").value.trim(),type:$("#aTy").value,occ:$("#aO").value.trim().slice(0,60),msg:mh,date:$("#aD").value,start:$("#aS").value,end:$("#aE").value,active:$("#aA").checked},er="";
if(v.title.length<2)er="Enter a title.";else if(plain(mh).length<2)er="Enter a message.";else if(!isD(v.date))er="Pick a valid announcement date.";
else if(v.start&&!isD(v.start))er="Invalid start date.";else if(v.end&&!isD(v.end))er="Invalid end date.";
else if(v.start&&v.end&&v.end<v.start)er="End date can't be before start date.";
else if(all.some(function(x){return x.id!==v.id&&x.title.trim().toLowerCase()===v.title.toLowerCase()&&x.date===v.date&&x.type===v.type}))er="This announcement already exists.";
if(er){alert(er);return}
if(/\[[^\]]+\]/.test(plain(mh))&&!confirm("The message still has [bracketed text] to fill in. Save anyway?"))return;
var i=all.findIndex(function(x){return x.id===v.id});if(i>=0)all[i]=v;else all.push(v);
if(wr(K,all)){cur=null;annRender();board()}}});
/* recipients: choose members, then send one chat at a time (user taps Send inside WhatsApp each time) */
var SS=null;
function mems(){var l=rd(MK,[]);return(Array.isArray(l)?l:[]).filter(function(m){return m&&m.name&&/^\d{10}$/.test(m.whatsapp)&&m.status!=="inactive"}).sort(function(x,y){return x.name.localeCompare(y.name)})}
function filt(){var f=SS.f.toLowerCase();return mems().filter(function(m){return!f||m.name.toLowerCase().indexOf(f)>=0||m.whatsapp.indexOf(f)>=0})}
function sList(){var l=filt();$("#sList").innerHTML=l.length?l.map(function(m){return'<label class="row" style="cursor:pointer"><input type="checkbox" data-p="'+m.whatsapp+'"'+(SS.sel[m.whatsapp]?" checked":"")+' style="width:20px;height:20px;flex-shrink:0"><div class="row__main"><div class="row__name">'+E(m.name)+'</div><div class="row__meta">+91 '+m.whatsapp+"</div></div></label>"}).join(""):'<div class="empty"><div class="empty__title">No members found</div></div>';
var n=Object.keys(SS.sel).filter(function(k){return SS.sel[k]}).length;$("#sGo").textContent="Start sending ("+n+")";$("#sGo").disabled=!n}
function sendRender(){var b=$("#pSendB");
if(!SS.q){b.innerHTML='<div class="card"><div style="font-weight:800;margin-bottom:4px;">'+E(SS.a.title)+'</div><div class="ann__m">'+htm(SS.a.msg)+'</div></div><div class="section"><div class="section__title">Choose who gets this message</div><div class="search-bar"><input id="sF" placeholder="Search by name or number" value="'+E(SS.f)+'"></div><div class="btn-row" style="margin:10px 0;"><button class="btn btn--secondary" id="sAll" style="height:42px;">Select all</button><button class="btn btn--secondary" id="sNone" style="height:42px;">Clear</button></div><div id="sList"></div></div><button class="btn btn--whatsapp" id="sGo"></button>';sList();return}
var q=SS.q,done=SS.i>=q.length;
b.innerHTML='<div class="card" style="text-align:center;padding:24px 18px;"><div class="progress-bar"><div class="progress-bar__fill" style="width:'+Math.round(SS.i/q.length*100)+'%"></div></div><div style="font-size:32px;font-weight:800;margin:14px 0 4px;">'+SS.i+" / "+q.length+'</div><div style="font-size:13px;color:var(--text-2);margin-bottom:16px;">chats handled</div>'+(done?'<button class="btn btn--primary" id="sDone">Done</button>':'<button class="btn btn--whatsapp" id="sNext">Open chat: '+E(q[SS.i].name)+'</button><button class="btn btn--secondary" id="sSkip" style="margin-top:10px;">Skip '+E(q[SS.i].name)+"</button>")+'</div><div class="section"><div class="section__title">Queue</div>'+q.map(function(m,i){return'<div class="row" style="'+(i<SS.i?"opacity:.55":"")+'"><div class="row__avatar">'+E((m.name[0]||"?").toUpperCase())+'</div><div class="row__main"><div class="row__name">'+E(m.name)+'</div><div class="row__meta">+91 '+m.whatsapp+'</div></div><span class="pill '+(m.s==="sent"?"pill--paid":"pill--inactive")+'">'+(m.s==="sent"?"Sent":m.s==="skip"?"Skipped":"Pending")+"</span></div>"}).join("")+"</div>"}
function openSend(a){SS={a:a,sel:{},q:null,i:0,f:""};sendRender();$("#pSend").classList.add("active")}
$("#pSendBack").onclick=function(){if(SS&&SS.q&&SS.i<SS.q.length&&!confirm("Stop sending? Remaining members won't get this message."))return;SS=null;$("#pSend").classList.remove("active")};
$("#pSendB").addEventListener("input",function(e){if(e.target.id==="sF"){SS.f=e.target.value.trim();sList()}});
$("#pSendB").addEventListener("change",function(e){var p=e.target.dataset&&e.target.dataset.p;if(p){SS.sel[p]=e.target.checked;sList()}});
$("#pSendB").addEventListener("click",function(e){var id=e.target.closest("button")&&e.target.closest("button").id;if(!SS||!id)return;
if(id==="sAll"){filt().forEach(function(m){SS.sel[m.whatsapp]=true});sList()}
else if(id==="sNone"){SS.sel={};sList()}
else if(id==="sGo"){var q=mems().filter(function(m){return SS.sel[m.whatsapp]});if(!q.length)return;SS.q=q.map(function(m){return{name:m.name,whatsapp:m.whatsapp,s:""}});SS.i=0;sendRender()}
else if(id==="sNext"&&SS.i<SS.q.length){var m=SS.q[SS.i];OO("https://wa.me/91"+m.whatsapp+"?text="+encodeURIComponent(annMsg(SS.a,m.name)),"_blank");m.s="sent";SS.i++;sendRender()}
else if(id==="sSkip"&&SS.i<SS.q.length){SS.q[SS.i].s="skip";SS.i++;sendRender()}
else if(id==="sDone"){SS=null;$("#pSend").classList.remove("active")}});
/* edit-before-send screen */
$("#pCmpBack").onclick=function(){$("#pCmp").classList.remove("active")};
$("#pCmpB").addEventListener("click",function(e){var id=e.target.id;if(id==="mCancel")$("#pCmp").classList.remove("active");
else if(id==="mSend"){var t=waText(san($("#mE").innerHTML));if(!t){alert("Message can't be empty.");return}OO(cmpUrl+encodeURIComponent(t),"_blank");$("#pCmp").classList.remove("active")}});
/* policy page */
function polRender(){var p=pol();
$("#pPolB").innerHTML='<div class="card"><div class="section__title">Weekly holidays</div><div class="field__hint" style="margin:0 0 8px;">Sunday is always a non-working day. Tick other days the gym is closed every week.</div>'+[1,2,3,4,5,6].map(function(d){return'<label class="chk"><input type="checkbox" data-h="'+d+'"'+(p.holidays.indexOf(d)>=0?" checked":"")+"> "+DAYS[d]+"</label>"}).join("")+'</div><div class="section"><div class="section__title">Policy shown on receipts</div><div class="field"><label class="field__label">हिन्दी</label>'+ed("pHi",p.hi,160)+'</div><div class="field"><label class="field__label">English</label>'+ed("pEn",p.en,160)+'</div><div class="btn-row"><button class="btn btn--secondary" id="pReset">Reset defaults</button><button class="btn btn--primary" id="pSave">Save</button></div></div><div class="section"><div class="section__title">Rejoining checker</div><div class="card"><div class="field"><label class="field__label">Membership expiry date</label><input class="field__input" type="date" id="cE"></div><div class="field"><label class="field__label">Rejoining date</label><input class="field__input" type="date" id="cR" value="'+td()+'"></div><div id="cOut" style="font-size:13px;line-height:1.6;"></div></div></div>'}
$("#pPolB").addEventListener("input",function(e){if(e.target.id==="cE"||e.target.id==="cR"){var a=$("#cE").value,r=$("#cR").value,o=$("#cOut");if(!isD(a)||!isD(r)){o.textContent="";return}var x=rejoin(a,r);o.innerHTML="<b>Expiry:</b> "+show(a)+"<br><b>Working days elapsed:</b> "+x.n+" / 7"+(x.end?"<br><b>Original dates valid until:</b> "+show(x.end):"")+"<br><b>Status:</b> "+E(x.text)}});
$("#pPolB").addEventListener("click",function(e){var id=e.target.id;
if(id==="pSave"){var hi=san($("#pHi").innerHTML),en=san($("#pEn").innerHTML);if(!plain(hi)||!plain(en)){alert("Both Hindi and English policy need some text.");return}
var h=[].slice.call(document.querySelectorAll("[data-h]")).filter(function(c){return c.checked}).map(function(c){return+c.dataset.h});if(savePol(hi,en,h))note("Policy saved")}
else if(id==="pReset"&&confirm("Reset policy text to defaults? Holidays are kept.")){savePol(ol(HI),ol(EN),pol().holidays);polRender()}});
$("#pPolBack").onclick=function(){$("#pPol").classList.remove("active")};
/* template editor page (reminder + payment receipt messages) */
var TC="rem";
function tplPrev(){$("#tPrev").textContent=fillL(waText(san($("#tE").innerHTML)),TPLS[TC].sample())}
function tplRender(){var c=TPLS[TC];$("#pTplT").textContent=c.title;$("#pTplB").innerHTML='<div class="field__hint" style="margin:0 2px 10px;">Format the message with the toolbar. Tap a {placeholder} to insert details. Bold, italic and strikethrough are sent to WhatsApp; alignment and highlight are not supported by WhatsApp.'+(TC==="rem"?" Reminders are never sent to members who have already paid or are inactive.":"")+'</div>'+ed("tE",tplOf(TC),260,c.ph)+'<div class="section"><div class="section__title">WhatsApp preview</div><div class="wapre" id="tPrev"></div></div><div class="btn-row" style="margin-top:14px;"><button class="btn btn--secondary" id="tReset">Reset</button><button class="btn btn--primary" id="tSave">Save</button></div>';tplPrev()}
function openTpl(c){TC=c;tplRender();$("#pTpl").classList.add("active")}
$("#pTplB").addEventListener("input",function(e){if(e.target.id==="tE")tplPrev()});
$("#pTplB").addEventListener("click",function(e){var id=e.target.id,c=TPLS[TC];
if(id==="tSave"){var h=san($("#tE").innerHTML);if(!plain(h)){alert("Message can't be empty.");return}if(h.indexOf(c.need)<0){alert("Message should include "+c.need+".");return}if(wr(c.k,h))note("Message saved")}
else if(id==="tReset"&&confirm("Reset to the default message?")){wr(c.k,c.def);tplRender()}});
$("#pTplBack").onclick=function(){$("#pTpl").classList.remove("active")};
/* settings entries */
var sv=$("#viewSettings"),ver=sv&&sv.querySelector(".app-version");
if(sv&&ver){var s=document.createElement("div"),ic='<span class="list-item__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v13H7l-3 3z"/></svg></span>',it=function(i,t,d){return'<button class="list-item" id="'+i+'">'+ic+'<span class="list-item__main"><span class="list-item__title">'+t+'</span><span class="list-item__desc">'+d+"</span></span></button>"};
s.innerHTML='<div class="settings-title">Gym Membership &amp; Fee Policy</div><div class="card" style="padding:0;">'+it("stPol","Policy &amp; weekly holidays","Hindi + English policy, 7-working-day rule")+it("stTpl","Reminder message editor","Format the WhatsApp payment reminder")+it("stRec","Payment receipt message","Edit the receipt sent on WhatsApp (with policy)")+'</div><div class="settings-title">Notice Board</div><div class="card" style="padding:0;">'+it("stAnn","Gym Announcements","Create and share notices on WhatsApp")+"</div>";
ver.parentNode.insertBefore(s,ver);$("#stAnn").onclick=openAnn;$("#stPol").onclick=function(){polRender();$("#pPol").classList.add("active")};$("#stTpl").onclick=function(){openTpl("rem")};$("#stRec").onclick=function(){openTpl("rec")}}
window.GymAddon={wdays:wdays,rejoin:rejoin,winEnd:winEnd,waText:waText,san:san,remMsg:remMsg,recMsg:recMsg,annTpl:annTpl};
})();
